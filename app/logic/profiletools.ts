import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { generate, verify } from 'password-hash';

interface IBuffStat {
	multiplier: number;
	percent_increase: number;
}

function calculateBuffConfig(playerData: any): { [index: string]: IBuffStat } {
	const skills = ['command_skill', 'science_skill', 'security_skill', 'engineering_skill', 'diplomacy_skill', 'medicine_skill'];
	const buffs = ['core', 'range_min', 'range_max'];

	const buffConfig: { [index: string]: IBuffStat } = {};

	for (let skill of skills) {
		for (let buff of buffs) {
			buffConfig[`${skill}_${buff}`] = {
				multiplier: 1,
				percent_increase: 0
			};
		}
	}

	for (let buff of playerData.character.crew_collection_buffs.concat(playerData.character.starbase_buffs)) {
		if (buffConfig[buff.stat]) {
			if (buff.operator === 'percent_increase') {
				buffConfig[buff.stat].percent_increase += buff.value;
			} else if (buff.operator === 'multiplier') {
				buffConfig[buff.stat].multiplier = buff.value;
			} else {
				console.warn(`Unknown buff operator '${buff.operator}' for '${buff.stat}'.`);
			}
		}
	}

	return buffConfig;
}

export async function uploadProfile(dbid: string, player_data: any, lastUpdate: Date = new Date()) {
	// Validate player_data
	if (!player_data || !player_data.player || !player_data.player.character || player_data.player.dbid.toString() !== dbid) {
		throw new Error('Invalid player_data!');
	}

	let captainName = player_data.player.character.display_name;

	let shortCrewList = {
		crew: player_data.player.character.crew.map((crew: any) => ({ id: crew.archetype_id, rarity: crew.rarity })),
		c_stored_immortals: player_data.player.character.c_stored_immortals,
		stored_immortals: player_data.player.character.stored_immortals
	};

	let res = await Profile.findAll({ where: { dbid } });
	if (res.length === 0) {
		return await Profile.create({ dbid, buffConfig: calculateBuffConfig(player_data.player), shortCrewList, captainName, lastUpdate });
	} else {
		await res[0].update(
			{ dbid, buffConfig: calculateBuffConfig(player_data.player), shortCrewList, captainName, lastUpdate },
			{ where: { dbid } }
		);

		return res[0];
	}
}

export async function loadProfileCache() {
	let res = await Profile.findAll({
		attributes: ['dbid', 'lastUpdate']
	});

	let player_data: { [index: string]: Date } = {};
	res.forEach(ent => {
		player_data[ent.dbid] = ent.lastUpdate;
	});

	return player_data;
}

export async function loginUser(loginUserName: string, password: string) {
	let res = await User.findOne({ where: { loginUserName } });

	if (verify(password, res?.loginPassword!)) {
		return res;
	} else {
		return undefined;
	}
}

export async function addBookUser(loginUserName: string, password: string) {
	let loginPassword = generate(password);

	let res = await User.create({
		loginUserName,
		loginPassword,
		userRole: 'bookeditor'
	});

	return res;
}
