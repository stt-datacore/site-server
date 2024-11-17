import fs from 'fs';
import fetch, { Response } from 'node-fetch';
import { sign, verify } from 'jsonwebtoken';

import { Logger, LogData } from './logger';
import { loadProfileCache, loginUser, getDBIDbyDiscord, uploadProfile, getProfile, getProfileByHash, loadProfile } from './profiletools';
import { loadCommentsDB, saveCommentDB } from './commenttools';
import { DEBUG, recordTelemetryDB, getTelemetryDB, createStats } from './telemetry';
import { getSTTToken } from './stttools';
import { PlayerData } from '../datacore/player';

import { Profile } from '../models/Profile';
import { voyageRawByDays } from './voyage_stats';
import { CelestialAPI } from './celestial';

require('dotenv').config();

export const JWT_SECRET = process.env.JWT_SECRET || 'not_very_secret';
export const CLIENT_API = 24;

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
		let res: Profile | undefined = undefined;

		try {
			res = await uploadProfile(dbid, player_data, new Date());

			this._player_data[dbid] = new Date().toUTCString();
			fs.writeFileSync(`${process.env.PROFILE_DATA_PATH}/${dbid}`, JSON.stringify(player_data));

		} catch (err) {
			if (typeof err === 'string') {
				return {
					Status: 500,
					Body: { error: err }
				};
			}
			else if (err instanceof Error) {
				return {
					Status: 500,
					Body: { error: err.toString() }
				};
			}
		}

		if (res) {
			return {
				Status: 200,
				Body: res
			};
		}
		else {
			return {
				Status: 500,
				Body: { 'error': 'Unknown error' }
			};
		}
	}

	async getProfile(dbid: string, short_crew?: boolean) {
		let profile = await loadProfile(dbid);
		if (profile) {
			if (short_crew) {
				return {
					Status: 200,
					Body: {
						lastUpdate: profile.lastUpdate,
						shortCrewList: profile.shortCrewList
					}
				}
			}
			else if (fs.existsSync(`${process.env.PROFILE_DATA_PATH}/${dbid}`)) {
				return {
					Status: 200,
					Body: JSON.parse(fs.readFileSync(`${process.env.PROFILE_DATA_PATH}/${dbid}`, 'utf-8'))
				}
			}
			else {
				return {
					Status: 404,
					Body: 'Profile file not found'
				}
			}
		}
		else {
			return {
				Status: 404,
				Body: 'Profile record not found'
			}
		}
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

		return {
			Status: 403,
			Body: "No"
		};

		// Logger.info('Load fleet info', { fleetId, logData });

		// if (username && password) {
		// 	try {
		// 		let req = await getSTTToken(username, password);
		// 		if (req) {
		// 			access_token = req;
		// 		}
		// 		else {
		// 			return {
		// 				Status: 500,
		// 				Body: "Sign-in Error"
		// 			};
		// 		}
		// 	}
		// 	catch (e: any) {
		// 		return {
		// 			Status: 500,
		// 			Body: e.toString()
		// 		};
		// 	}
		// }

		// if (!access_token) {
		// 	return {
		// 		Status: 400,
		// 		Body: 'Missing required credentials'
		// 	};
		// }


		// let fleet = await fetch(
		// 	`https://app.startrektimelines.com/fleet/${fleetId}?access_token=${access_token}&client_api=${CLIENT_API}`
		// ).then(this.checkSTTResponse.bind(this)).then(res => res.json())
		// .catch((e) => {
		// 	return {
		// 		"error": e.toString()
		// 	}
		// });

		// let fleet_members_with_rank = await fetch(
		// 	`https://app.startrektimelines.com/fleet/members_with_rank/${fleetId}?s=0&m=10&access_token=${access_token}&client_api=${CLIENT_API}`
		// ).then(this.checkSTTResponse.bind(this)).then(res => res.json())
		// .catch((e) => {
		// 	return {
		// 		"error": e.toString()
		// 	}
		// });

		// let fleet_squads = await fetch(
		// 	`https://app.startrektimelines.com/fleet/getsquads?gid=${fleetId}&s=0&m=10&access_token=${access_token}&client_api=${CLIENT_API}`
		// ).then(this.checkSTTResponse.bind(this)).then(res => res.json())
		// .catch((e) => {
		// 	return {
		// 		"error": e.toString()
		// 	}
		// });

		// const params = new URLSearchParams();
		// params.append('access_token', access_token);
		// params.append('guild_id', fleetId);
		// params.append('event_index', '0');

		// let complete_member_info = await fetch(`https://app.startrektimelines.com/fleet/complete_member_info`, {
		// 	method: 'POST',
		// 	body: params
		// }).then(this.checkSTTResponse.bind(this)).then(res => res.json())
		// .catch((e) => {
		// 	return {
		// 		"error": e.toString()
		// 	}
		// });

		// let fleet_leader1 = await fetch(`https://app.startrektimelines.com/fleet/leaderboard`, {
		// 	method: 'POST',
		// 	body: params
		// }).then(this.checkSTTResponse.bind(this)).then(res => res.json())
		// .catch((e) => {
		// 	return {
		// 		"error": e.toString()
		// 	}
		// });

		// params.set('event_index', '1');
		// let fleet_leader2 = await fetch(`https://app.startrektimelines.com/fleet/leaderboard`, {
		// 	method: 'POST',
		// 	body: params
		// }).then(this.checkSTTResponse.bind(this)).then(res => res.json())
		// .catch((e) => {
		// 	return {
		// 		"error": e.toString()
		// 	}
		// });

		// params.set('event_index', '2');
		// let fleet_leader3 = await fetch(`https://app.startrektimelines.com/fleet/leaderboard`, {
		// 	method: 'POST',
		// 	body: params
		// }).then(this.checkSTTResponse.bind(this)).then(res => res.json())
		// .catch((e) => {
		// 	return {
		// 		"error": e.toString()
		// 	}
		// });

		// fleet = fleet.fleet;
		// delete fleet.chatchannels;
		// delete fleet.motd;
		// fleet.members = fleet_members_with_rank.fleet.members.map((member: any) => ({
		// 	dbid: member.dbid,
		// 	display_name: member.display_name,
		// 	pid: member.pid,
		// 	rank: member.rank,
		// 	last_update: this._player_data[member.dbid.toString()],
		// 	crew_avatar: member.crew_avatar ? member.crew_avatar.portrait.file.substr(1).replace('/', '_') + '.png' : ''
		// }));

		// fleet.squads = fleet_squads.squads.map((squad: any) => ({ id: squad.id, name: squad.name, cursize: squad.cursize }));

		// fleet.leaderboard = [
		// 	{ fleet_rank: fleet_leader1.fleet_rank, index: fleet_leader1.index, event_name: fleet_leader1.event_name },
		// 	{ fleet_rank: fleet_leader2.fleet_rank, index: fleet_leader2.index, event_name: fleet_leader2.event_name },
		// 	{ fleet_rank: fleet_leader3.fleet_rank, index: fleet_leader3.index, event_name: fleet_leader3.event_name }
		// ];

		// for(let squad of fleet.squads) {
		// 	let squadInfo = complete_member_info.squads.find((s: any) => s.id.toString() === squad.id.toString());
		// 	if (squadInfo) {
		// 		squad.event_rank = squadInfo.event_rank;
		// 		squad.leader = Number(squadInfo.nleader_player_dbid);
		// 	}
		// }

		// // add more details for members
		// for(let member of fleet.members) {
		// 	let memberInfo = complete_member_info.members.find((m: any) => m.pid === member.pid);
		// 	if (memberInfo) {
		// 		member.squad = '';
		// 		if (memberInfo.squad_id) {
		// 			member.squad_id = Number(memberInfo.squad_id);
		// 			let squadInfo = fleet.squads.find((s: any) => s.id.toString() === memberInfo.squad_id.toString());
		// 			if (squadInfo) {
		// 				member.squad = squadInfo.name;
		// 			}
		// 		}

		// 		member.level = memberInfo.level;
		// 		member.last_active = memberInfo.last_active;
		// 		member.daily_activity = memberInfo.daily_activity;
		// 		member.event_rank = memberInfo.event_rank;
		// 		member.daily_meta_progress = memberInfo.daily_meta_progress;
		// 		member.starbase_activity = memberInfo.starbase_activity;
		// 	}
		// }

		// return {
		// 	Status: 200,
		// 	Body: {
		// 		access_token,
		// 		fleet
		// 	}
		// };



		// return {
		// 	Status: 200,
		// 	Body: {
		// 		access_token,
		// 		complete_member_info
		// 	}
		// };
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
				Status: 200, // 204
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
				Status: 200, // 204
				Body: JSON.stringify({ error: 'No DBID found for Discord user' }),
			}
		}
	}

	async recordTelemetry(type: string, data: any): Promise<ApiResult> {
		Logger.info('Record telemetry', { type });

		let result = await recordTelemetryDB(type, data);
		if (result) {
			if (DEBUG) console.log("Telemetry success.")
			return {
				Status: 200,
				Body: JSON.stringify({ success: true }),
			}
		} else {
			if (DEBUG) console.log("Telemetry fail.")
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

	async getCelestial() {
		let result = await CelestialAPI.getCelestialMarket(this._stt_token);
		if (!result){
			return {
				Status: 500,
				Body: JSON.stringify({ code: 500, error: "Could not read celestial market."})
			}
		}
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

	/* New SQLite Stuff! */

	async sqlitePostPlayerData(dbid: number, player_data: PlayerData, logData: LogData): Promise<ApiResult> {

		Logger.info('Post player data', { dbid, logData });

		const timeStamp = new Date();
		let res: Profile;

		try {
			res = await uploadProfile(dbid.toString(), player_data, timeStamp);
		} catch (err) {
			if (typeof err === 'string') {
				return {
					Status: 500,
					Body: err
				};
			}
			else if (err instanceof Error) {
				return {
					Status: 500,
					Body: err.toString()
				};
			}
		}

		this._player_data[dbid] = new Date().toUTCString();
		fs.writeFileSync(`${process.env.PROFILE_DATA_PATH}/${dbid}`, JSON.stringify(player_data));

		return {
			Status: 200,
			Body: {
				'dbid': dbid,
				timeStamp: timeStamp.toISOString()
			}
		};

	}

	async sqliteGetPlayerData(dbid?: number, hash?: string): Promise<ApiResult> {
		Logger.info('Get player data', { dbid });
		let player: Profile | null = null;
		let playerData: PlayerData | null = null;

		try {
			if (dbid) {
				player = await getProfile(dbid);
			}
			else if (hash) {
				player = await getProfileByHash(hash);
			}
			if (player) {
				let path = `${process.env.PROFILE_DATA_PATH}/${player.dbid}`;
				playerData = JSON.parse(fs.readFileSync(path, 'utf-8'));
			}
		} catch (err) {
			if (typeof err === 'string') {
				return {
					Status: 500,
					Body: err
				};
			}
			else if (err instanceof Error) {
				return {
					Status: 500,
					Body: err.toString()
				};
			}
		}

		if (player && playerData) {
			return {
				Status: 200,
				Body: {
					timeStamp: player.updatedAt,
					dbid: player.dbid,
					playerData
				}
			};
		}
		else {
			return {
				Status: 404, // 204
				Body: null
			};
		}

	}

}

export let DataCoreAPI = new ApiClass();
