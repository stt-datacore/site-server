import fs from 'fs';
import { URLSearchParams } from 'url';
import fetch, { Response } from 'node-fetch';
import { sign, verify } from 'jsonwebtoken';

import { Logger, LogData } from './logger';
import { uploadProfile, loadProfileCache, loginUser, getDBIDbyDiscord } from './profiletools';
import { loadCommentsDB, saveCommentDB } from './commenttools';
import { recordTelemetryDB, getTelemetryDB, voyageRawByDays, createStats } from './telemetry';
import { getSTTToken } from './stttools';

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'not_very_secret';
const CLIENT_API = 22;

export class ApiResult {
	Status: number = 200;
	Body: any = undefined;
}

export class ApiClass {
	private _player_data: any;
	private _stt_token: any;

	private _cancelToken: NodeJS.Timeout | undefined = undefined;

	beginStatsCycle() {
		setTimeout(async () => {
			await createStats(true);
			// this._cancelToken = setInterval(async () => await createStats(), 1000 * 60 * 30);
		}, 0);
	}

	endStatsCycle() {
		if (this._cancelToken) {
			clearInterval(this._cancelToken);
			this._cancelToken = undefined;
		}
	}
	
	async initializeCache() {
		this._player_data = await loadProfileCache();

		Logger.info('Initializing API', { player_data: Object.keys(this._player_data).length });

		getSTTToken().then((token) => {
			this._stt_token = token;
		})
		.catch((e) => {
			Logger.info("Using fallback token.");
			this._stt_token = 'd6458837-34ba-4883-8588-4530f1a9cc53';
		});
	}

	async checkSTTResponse(res: Response) {
		if (res.ok) {
			return res;
		} else if (res.status === 401) {
			Logger.info('Received Unauthorized from STT API, refreshing token');
			let newToken = await getSTTToken();
			if (newToken) {
				this._stt_token = newToken;
			}
		}
		else if (res.status === 400) {
			Logger.info("PLAYER NOT MEMBER OF FLEET!", res);
			throw new Error(`PLAYER NOT MEMBER OF FLEET`);
		}
		else {
			Logger.info('Unexpected $response from STT API', res);
			throw new Error(`Unexpected $response from STT API: ${res}`);
		}
		return res;
	}

	async login(user: string, password: string, logData: LogData): Promise<ApiResult> {
		Logger.info('login_attempt', { user, logData });

		let userDB = await loginUser(user, password);
		if (userDB) {
			let token = sign({ user: userDB.loginUserName, id: userDB.id }, JWT_SECRET);
			return {
				Status: 200,
				Body: JSON.stringify({ token })
			};
		} else {
			return {
				Status: 401,
				Body: JSON.stringify({ error: 'Invalid username or password' })
			};
		}
	}

	async whoami(token: string, logData: LogData): Promise<ApiResult> {
		Logger.info('whoami', { logData });
		let payload = verify(token, JWT_SECRET);
		if (payload) {
			return {
				Status: 200,
				Body: JSON.stringify(payload)
			};
		} else {
			return {
				Status: 401,
				Body: JSON.stringify({ error: 'Invalid user' })
			};
		}
	}

	async postPlayerData(dbid: string, player_data: any, logData: LogData): Promise<ApiResult> {
		Logger.info('Post player data', { dbid, logData });

		try {
			await uploadProfile(dbid, player_data, new Date());
		} catch (err: any) {
			return {
				Status: 500,
				Body: err.toString()
			};
		}

		this._player_data[dbid] = new Date().toUTCString();
		fs.writeFileSync(`${process.env.PROFILE_DATA_PATH}/${dbid}`, JSON.stringify(player_data));

		return {
			Status: 200,
			Body: 'OK'
		};
	}

	async loadGauntletStatus(logData: LogData): Promise<ApiResult> {
		Logger.info('Load gauntlet status', { logData });

		let response = await fetch(
			`https://app.startrektimelines.com/gauntlet/status?access_token=${this._stt_token}&client_api=${CLIENT_API}`
		).then(this.checkSTTResponse.bind(this)).then(res => res.json());

		let reply = undefined;
		if (response.character && response.character.gauntlets && response.character.gauntlets.length > 0) {
			reply = response.character.gauntlets[0];
		}

		return {
			Status: 200,
			Body: reply
		};
	}

	async loadFleetInfo(fleetId: string, logData: LogData, username?: string, password?: string, access_token?: string): Promise<ApiResult> {
		Logger.info('Load fleet info', { fleetId, logData });

		if (username && password) {
			try {
				let req = await getSTTToken(username, password);
				if (req) {
					access_token = req;
				}
				else {
					return {
						Status: 500,
						Body: "Sign-in Error"
					};
				}
			}
			catch (e: any) {
				return {
					Status: 500,
					Body: e.toString()
				};
			}
		}
		
		if (!access_token) {
			return {
				Status: 400,
				Body: 'Missing required credentials'
			};
		}
		
		const params = new URLSearchParams();
		params.append('access_token', access_token);
		params.append('guild_id', fleetId);
		params.append('event_index', '0');

		let complete_member_info = await fetch(`https://app.startrektimelines.com/fleet/complete_member_info`, {
			method: 'POST',
			body: params
		}).then(this.checkSTTResponse.bind(this)).then(res => res.json())
		.catch((e) => {
			return {
				"error": e.toString()
			}
		});

		return {
			Status: 200,
			Body: {
				access_token,
				complete_member_info
			}
		};
	}

	async loadStoreCrewOffers(logData: LogData): Promise<ApiResult> {
		Logger.info('Load store crew offers', { logData });

		let response = await fetch(
			`https://app.startrektimelines.com/commerce/store_layout_v2/crew?access_token=${this._stt_token}&client_api=${CLIENT_API}`
		).then(this.checkSTTResponse.bind(this)).then(res => res.json());
		let reply = undefined;
		if (response) {
			let content = response.find((r: any) => r.symbol === 'crew');
			let limitedTimeOffers = content.grids.filter((offer: any) => {
				return offer?.primary_content[0].offer?.seconds_remain > 0
			});
			reply = limitedTimeOffers
		}

		return {
			Status: 200,
			Body: reply
		};
	}

	async loadComments(symbol: string, logData: LogData): Promise<ApiResult> {
		Logger.info('Load comments', { symbol, logData });

		let comments = await loadCommentsDB(symbol);

		return {
			Status: 200,
			Body: comments
		};
	}

	async saveComment(token: string, symbol: string, markdown: string, logData: LogData): Promise<ApiResult> {
		Logger.info('Save comment', { symbol, logData });

		let payload = verify(token, JWT_SECRET);
		if (!payload) {
			return {
				Status: 404,
				Body: 'Aah, something went wrong!'
			};
		}

		let user_id = (payload as any).id;

		let comments = await saveCommentDB(symbol, markdown, user_id);

		return {
			Status: 200,
			Body: comments
		};
	}

	async getDBIDbyDiscord(discordUserName: string, discordUserDiscriminator: string): Promise<ApiResult> {
		Logger.info('Get dbid for Discord user', { discordUserName, discordUserDiscriminator });

		let dbid = await getDBIDbyDiscord(discordUserName, discordUserDiscriminator);

		if (dbid) {
			return {
				Status: 200,
				Body: JSON.stringify({ dbid }),
			}
		} else {
			return {
				Status: 404,
				Body: JSON.stringify({ error: 'No DBID found for Discord user' }),
			}
		}
	}

	async recordTelemetry(type: string, data: any): Promise<ApiResult> {
		Logger.info('Record telemetry', { type });

		let result = await recordTelemetryDB(type, data);
		if (result) {
			return {
				Status: 200,
				Body: JSON.stringify({ success: true }),
			}
		} else {
			return {
				Status: 500,
				Body: JSON.stringify({ success: false }),
			}
		}
	}

	async getTelemetry(type: string): Promise<ApiResult> {
		Logger.info('Get telemetry', { type });

		let result = await getTelemetryDB(type);
		return {
			Status: 200,
			Body: result
		}
	}

	async getVoyages(crew?: string[], days?: number, opAnd?: boolean) {
		days ??= 7;
		if (days <= 0) days = 1;
		if (days > 60) days = 60;
		if (!crew?.length && days > 3) days = 3;

		Logger.info('Get voyages', { crew, days });
		let result = await voyageRawByDays(days, crew, opAnd)
		
		return {
			Status: 200,
			Body: result
		}
	}
}

export let DataCoreAPI = new ApiClass();
