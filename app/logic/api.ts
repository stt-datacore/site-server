import fs from 'fs';
import { URLSearchParams } from 'url';
import fetch, { Response } from 'node-fetch';
import { sign, verify } from 'jsonwebtoken';

import { Logger, LogData } from './logger';
import { loadProfileCache, loginUser, getDBIDbyDiscord, uploadProfile } from './profiletools';
import { loadCommentsDB, saveCommentDB } from './commenttools';
import { recordTelemetryDB, getTelemetryDB } from './telemetry';
import { getSTTToken } from './stttools';
import { getAssignmentsByDbid, getAssignmentsByTrackerId, getProfile, getProfiles, getVoyagesByDbid, getVoyagesByTrackerId, postOrPutAssignment, postOrPutProfile, postOrPutVoyage } from './mongotools';
import { PlayerProfile } from '../mongoModels/playerProfile';
import { PlayerData } from '../datacore/player';
import { ITrackedAssignment, ITrackedVoyage } from '../datacore/voyage';
import { TrackedAssignment, TrackedVoyage } from '../mongoModels/voyageHistory';
import { connectToMongo } from '../mongo';

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'not_very_secret';
const CLIENT_API = 15;

export class ApiResult {
	Status: number = 200;
	Body: any = undefined;
}

export class ApiClass {
	private _player_data: any;
	private _stt_token: any;

	public mongoAvailable: boolean = false;

	async initializeCache() {
		this._player_data = await loadProfileCache();
		this._stt_token = 'd6458837-34ba-4883-8588-4530f1a9cc53';

		Logger.info('Initializing API', { player_data: Object.keys(this._player_data).length });
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
		} else {
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

	async loadFleetInfo(fleetId: string, logData: LogData): Promise<ApiResult> {
		Logger.info('Load fleet info', { fleetId, logData });

		let fleet = await fetch(
			`https://app.startrektimelines.com/fleet/${fleetId}?access_token=${this._stt_token}&client_api=${CLIENT_API}`
		).then(this.checkSTTResponse.bind(this)).then(res => res.json());

		let fleet_members_with_rank = await fetch(
			`https://app.startrektimelines.com/fleet/members_with_rank/${fleetId}?s=0&m=10&access_token=${this._stt_token}&client_api=${CLIENT_API}`
		).then(this.checkSTTResponse.bind(this)).then(res => res.json());

		let fleet_squads = await fetch(
			`https://app.startrektimelines.com/fleet/getsquads?gid=${fleetId}&s=0&m=10&access_token=${this._stt_token}&client_api=${CLIENT_API}`
		).then(this.checkSTTResponse.bind(this)).then(res => res.json());

		const params = new URLSearchParams();
		params.append('access_token', this._stt_token);
		params.append('guild_id', fleetId);
		params.append('event_index', '0');

		let complete_member_info = await fetch(`https://app.startrektimelines.com/fleet/complete_member_info`, {
			method: 'POST',
			body: params
		}).then(this.checkSTTResponse.bind(this)).then(res => res.json());

		let fleet_leader1 = await fetch(`https://app.startrektimelines.com/fleet/leaderboard`, {
			method: 'POST',
			body: params
		}).then(this.checkSTTResponse.bind(this)).then(res => res.json());

		params.set('event_index', '1');
		let fleet_leader2 = await fetch(`https://app.startrektimelines.com/fleet/leaderboard`, {
			method: 'POST',
			body: params
		}).then(this.checkSTTResponse.bind(this)).then(res => res.json());

		params.set('event_index', '2');
		let fleet_leader3 = await fetch(`https://app.startrektimelines.com/fleet/leaderboard`, {
			method: 'POST',
			body: params
		}).then(this.checkSTTResponse.bind(this)).then(res => res.json());

		fleet = fleet.fleet;
		delete fleet.chatchannels;
		delete fleet.motd;
		fleet.members = fleet_members_with_rank.fleet.members.map((member: any) => ({
			dbid: member.dbid,
			display_name: member.display_name,
			pid: member.pid,
			rank: member.rank,
			last_update: this._player_data[member.dbid.toString()],
			crew_avatar: member.crew_avatar ? member.crew_avatar.portrait.file.substr(1).replace('/', '_') + '.png' : ''
		}));

		fleet.squads = fleet_squads.squads.map((squad: any) => ({ id: squad.id, name: squad.name, cursize: squad.cursize }));

		fleet.leaderboard = [
			{ fleet_rank: fleet_leader1.fleet_rank, index: fleet_leader1.index, event_name: fleet_leader1.event_name },
			{ fleet_rank: fleet_leader2.fleet_rank, index: fleet_leader2.index, event_name: fleet_leader2.event_name },
			{ fleet_rank: fleet_leader3.fleet_rank, index: fleet_leader3.index, event_name: fleet_leader3.event_name }
		];

		// add more details for members
		for(let member of fleet.members) {
			let memberInfo = complete_member_info.members.find((m: any) => m.pid === member.pid);
			if (memberInfo) {
				member.squad = '';
				if (memberInfo.squad_id) {
					let squadInfo = complete_member_info.squads.find((s: any) => s.id === memberInfo.squadInfo);
					if (squadInfo) {
						member.squad = squadInfo.name;
					}
				}

				member.level = memberInfo.level;
				member.last_active = memberInfo.last_active;
				member.daily_activity = memberInfo.daily_activity;
				member.event_rank = memberInfo.event_rank;
			}
		}

		return {
			Status: 200,
			Body: fleet
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

	/** MongoDB Methods */

	async tryInitMongo() {
		try {
			return await connectToMongo();
		}
		catch {
			return false;
		}
	}

	async mongoPostPlayerData(dbid: number, player_data: PlayerData, logData: LogData): Promise<ApiResult> {
		if (!this.mongoAvailable) return { Status: 500, Body: 'Database is down' };
		Logger.info('Post player data', { dbid, logData });
		
		const timeStamp = new Date();
		let res = 0;

		try {
			res = await postOrPutProfile(dbid, player_data, timeStamp);			
			if (res >= 300) {
				return {
					Status: res,
					Body: {
						'dbid': dbid,
						'error': 'Unable to insert profile record.',
						'timeStamp': timeStamp.toISOString()					
					}
				};
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

		return {
			Status: res,
			Body: {
				'dbid': dbid,
				timeStamp: timeStamp.toISOString()
			}
		};
	}

	async mongoGetPlayerData(dbid: number): Promise<ApiResult> {
		if (!this.mongoAvailable) return { Status: 500, Body: 'Database is down' };

		Logger.info('Get player data', { dbid });
		let player: PlayerProfile | null = null;

		try {
			player = await getProfile(dbid);
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

		if (player?.playerData) {
			return {
				Status: 200,
				Body: player
			};	
		}
		else {
			return {
				Status: 404,
				Body: ''
			};	
		}

	}

	async mongoGetManyPlayers(fleet?: number, squadron?: number): Promise<ApiResult> {
		if (!this.mongoAvailable) return { Status: 500, Body: 'Database is down' };

		Logger.info('Get many players', { fleet, squadron });
		let players: PlayerProfile[] | null = null;

		try {
			players = await getProfiles(fleet, squadron);
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

		if (players?.length) {
			return {
				Status: 200,
				Body: players
			};	
		}
		else {
			return {
				Status: 404,
				Body: ''
			};	
		}

	}

	async mongoPostTrackedVoyage(dbid: number, voyage: ITrackedVoyage, logData: LogData): Promise<ApiResult> {
		if (!this.mongoAvailable) return { Status: 500, Body: 'Database is down' };

		Logger.info('Tracked Voyage data', { dbid, voyage, logData });
		
		const timeStamp = new Date();

		try {
			let res = await postOrPutVoyage(dbid, voyage, timeStamp);
			if (res >= 300) {
				return {
					Status: res,
					Body: {
						'dbid': dbid,
						'error': 'Unable to insert record.',
						'timeStamp': timeStamp.toISOString()					
					}
				};
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

		return {
			Status: 201,
			Body: {
				'dbid': dbid,
				'trackerId': voyage.tracker_id,
				timeStamp: timeStamp.toISOString()
			}
		};
	}

	async mongoGetTrackedVoyages(dbid?: number, trackerId?: number): Promise<ApiResult> {
		if (!this.mongoAvailable) return { Status: 500, Body: 'Database is down' };

		Logger.info('Get voyage data', { dbid, trackerId });
		let voyages: TrackedVoyage[] | null = null;
		
		if (!dbid && !trackerId) return {
				Status: 400,
				Body: 'No Input'
			} 

		try {
			voyages = dbid ? await getVoyagesByDbid(dbid) : (trackerId ? await getVoyagesByTrackerId(trackerId) : null);
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

		if (voyages) {
			return {
				Status: 200,
				Body: voyages
			};	
		}
		else {
			return {
				Status: 404,
				Body: ''
			};	
		}

	}

	

	async mongoPostTrackedAssignment(dbid: number, crew: string, assignment: ITrackedAssignment, logData: LogData): Promise<ApiResult> {
		if (!this.mongoAvailable) return { Status: 500, Body: 'Database is down' };

		Logger.info('Tracked Voyage data', { dbid, voyage: assignment, logData });
		
		const timeStamp = new Date();

		try {
			let res = await postOrPutAssignment(dbid, crew, assignment, timeStamp);
			if (res >= 300) {
				return {
					Status: res,
					Body: {
						'dbid': dbid,
						'error': 'Unable to insert record.',
						'timeStamp': timeStamp.toISOString()					
					}
				};
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

		return {
			Status: 201,
			Body: {
				'dbid': dbid,
				'trackerId': assignment.tracker_id,
				timeStamp: timeStamp.toISOString()
			}
		};
	}

	async mongoGetTrackedAssignments(dbid?: number, trackerId?: number): Promise<ApiResult> {
		if (!this.mongoAvailable) return { Status: 500, Body: 'Database is down' };

		Logger.info('Get voyage data', { dbid, trackerId });
		let assignments: TrackedAssignment[] | null = null;
		
		if (!dbid && !trackerId) return {
				Status: 400,
				Body: 'No Input'
			} 

		try {
			assignments = dbid ? await getAssignmentsByDbid(dbid) : (trackerId ? await getAssignmentsByTrackerId(trackerId) : null);
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

		if (assignments) {
			return {
				Status: 200,
				Body: assignments
			};	
		}
		else {
			return {
				Status: 404,
				Body: ''
			};	
		}

	}


	async mongoGetTrackedData(dbid?: number, trackerId?: number): Promise<ApiResult> {
		if (!this.mongoAvailable) return { Status: 500, Body: 'Database is down' };

		Logger.info('Get tracked data', { dbid, trackerId });
		let voyages: TrackedVoyage[] | null = null;
		let assignments: TrackedAssignment[] | null = null;
		
		if (!dbid && !trackerId) return {
				Status: 400,
				Body: 'No Input'
			} 

		try {
			voyages = dbid ? await getVoyagesByDbid(dbid) : (trackerId ? await getVoyagesByTrackerId(trackerId) : null);
			assignments = dbid ? await getAssignmentsByDbid(dbid) : (trackerId ? await getAssignmentsByTrackerId(trackerId) : null);
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

		if (voyages || assignments) {
			return {
				Status: 200,
				Body: {
					voyages,
					assignments
				}
			};	
		}
		else {
			return {
				Status: 404,
				Body: ''
			};	
		}

	}

	

}

export let DataCoreAPI = new ApiClass();
