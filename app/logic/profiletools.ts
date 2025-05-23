import { createHash } from 'node:crypto';
import { Profile } from '../models/Profile';
import { User } from '../models/User';
import { generate, verify } from 'password-hash';
import { PlayerData } from '../datacore/player';
import { Op } from 'sequelize';
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

export function createProfileObject(dbid: string, player_data: PlayerData, lastUpdate: Date) {
	if (!player_data || !player_data.player || !player_data.player.character || player_data.player.dbid.toString() !== dbid) {
		throw new Error('Invalid player_data!');
	}

	let captainName = player_data.player.character.display_name;
	let dbidHash = createHash('sha3-256').update(dbid.toString()).digest('hex');

	let shortCrewList = {
		crew: player_data.player.character.crew.map((crew: any) => ({ id: crew.archetype_id, rarity: crew.rarity })),
		c_stored_immortals: player_data.player.character.c_stored_immortals,
		stored_immortals: player_data.player.character.stored_immortals
	};

	let metadata = {
		open_collection_ids: null as number[] | null,
		crew_avatar: {
			symbol: player_data.player.character.crew_avatar?.symbol ?? null,
			name: player_data.player.character.crew_avatar?.name ?? null,
			icon: player_data.player?.character?.crew_avatar?.icon ?? null,
			portrait: player_data.player?.character?.crew_avatar?.portrait ?? null,
			full_body: player_data.player?.character?.crew_avatar?.full_body ?? null,
		}
	};

	if (player_data.player.character.cryo_collections) {
		let ocols = [] as number[];
		player_data.player.character.cryo_collections.filter(col => {
			if (col?.milestone?.goal && col.type_id) {
				ocols.push(col.type_id);
			}
		});
		metadata.open_collection_ids = ocols;
	}

	return { dbid, buffConfig: calculateBuffConfig(player_data.player), metadata, shortCrewList, captainName, lastUpdate, hash: dbidHash };
}


export async function getProfiles(dbids: (number | string)[]) {
	if (!dbids.length) return null;
	if (dbids.every((n: any) => typeof n === 'number')) {
		let res = await Profile.findAll({ where: { dbid: { [Op.or]: dbids.map(d => d.toString()) } } });
		if (res.length === 0) return null;
		return res;
	}
	else if (dbids.every((s: any) => typeof s === 'string')) {
		let res = await Profile.findAll({ where: { captainName: { [Op.or]: dbids.map(d => ({ [Op.like]: d })) } } });
		if (res.length === 0) return null;
		return res;
	}
	return null;
}

export async function getProfile(dbid: number) {
	let res = await Profile.findAll({ where: { dbid } });
	if (res.length === 0) return null;
	return res[0];
}

export async function getProfileByHash(dbidHash: string) {
    let res = await Profile.findAll({ where: { hash: dbidHash } });
	if (res.length === 0) return null;
	return res[0];
}

export async function uploadProfile(dbid: string, player_data: any, lastUpdate: Date = new Date()) {
	// Validate player_data

	let profile = createProfileObject(dbid, player_data, lastUpdate);

	let res = await Profile.findAll({ where: { dbid } });
	if (res.length === 0) {
		return await Profile.create({ ... profile });
	} else {
		await res[0].update(
			{ ...profile },
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

export async function loadProfile(dbid: string) {
	let res = await Profile.findOne({ where: { dbid }});
	return res;
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

export async function getDBIDbyDiscord(discordUserName: string, discordUserDiscriminator: string) {
	let user = await User.findOne({ where: { discordUserName, discordUserDiscriminator }, include: [Profile] });
	if (user && user.profiles && user.profiles.length === 1) {
		return user.profiles[0].dbid;
	} else {
		return undefined;
	}
}