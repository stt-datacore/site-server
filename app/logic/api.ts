import fs from 'fs';
import { URLSearchParams } from 'url';
import fetch from 'node-fetch';
import { sign, verify } from 'jsonwebtoken';

import { Logger, LogData } from './logger';
import { uploadProfile, loadProfileCache, loginUser, getDBIDbyDiscord } from './profiletools';
import { loadCommentsDB, saveCommentDB } from './commenttools';

require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'not_very_secret';
const CLIENT_API = 15;

export class ApiResult {
	Status: number = 200;
	Body: any = undefined;
}

export class ApiClass {
	private _player_data: any;

	async initializeCache() {
		this._player_data = await loadProfileCache();

		Logger.info('Initializing API', { player_data: Object.keys(this._player_data).length });
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
		if (!process.env.STT_BOT_TOKEN) {
			return {
				Status: 404,
				Body: 'Aah, something went wrong!'
			};
		}

		let response = await fetch(
			`https://stt.disruptorbeam.com/gauntlet/status?access_token=${process.env.STT_BOT_TOKEN}&client_api=${CLIENT_API}`
		).then(res => res.json());

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
		if (!process.env.STT_BOT_TOKEN) {
			return {
				Status: 404,
				Body: 'Aah, something went wrong!'
			};
		}

		let fleet = await fetch(
			`https://stt.disruptorbeam.com/fleet/${fleetId}?access_token=${process.env.STT_BOT_TOKEN}&client_api=${CLIENT_API}`
		).then(res => res.json());

		let fleet_members_with_rank = await fetch(
			`https://stt.disruptorbeam.com/fleet/members_with_rank/${fleetId}?s=0&m=10&access_token=${process.env.STT_BOT_TOKEN}&client_api=${CLIENT_API}`
		).then(res => res.json());

		let fleet_squads = await fetch(
			`https://stt.disruptorbeam.com/fleet/getsquads?gid=${fleetId}&s=0&m=10&access_token=${process.env.STT_BOT_TOKEN}&client_api=${CLIENT_API}`
		).then(res => res.json());

		const params = new URLSearchParams();
		params.append('access_token', process.env.STT_BOT_TOKEN);
		params.append('guild_id', fleetId);
		params.append('event_index', '0');

		let complete_member_info = await fetch(`https://stt.disruptorbeam.com/fleet/complete_member_info`, {
			method: 'POST',
			body: params
		}).then(res => res.json());

		let fleet_leader1 = await fetch(`https://stt.disruptorbeam.com/fleet/leaderboard`, {
			method: 'POST',
			body: params
		}).then(res => res.json());

		params.set('event_index', '1');
		let fleet_leader2 = await fetch(`https://stt.disruptorbeam.com/fleet/leaderboard`, {
			method: 'POST',
			body: params
		}).then(res => res.json());

		params.set('event_index', '2');
		let fleet_leader3 = await fetch(`https://stt.disruptorbeam.com/fleet/leaderboard`, {
			method: 'POST',
			body: params
		}).then(res => res.json());

		fleet = fleet.fleet;
		delete fleet.chatchannels;
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
		if (!process.env.STT_BOT_TOKEN) {
			return {
				Status: 404,
				Body: 'Aah, something went wrong!'
			};
		}

		let response = await fetch(
			`https://stt.disruptorbeam.com/commerce/store_layout_v2/crew?access_token=${process.env.STT_BOT_TOKEN}&client_api=${CLIENT_API}`
		).then(res => res.json());
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

}

export let DataCoreAPI = new ApiClass();
