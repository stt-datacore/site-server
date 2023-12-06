import { Sequelize } from 'sequelize-typescript';

import { User } from './models/User';
import { Profile } from './models/Profile';
import { Comment } from './models/Comment';
import { Historical, Voyage, VoyageRecord } from './models/VoyageRecord';
import fs from 'fs';
import { TrackedVoyage, TrackedCrew } from './models/Tracked';
import { BossBattleDocument, SolveDocument, TrialDocument } from './models/BossBattles';

require('dotenv').config();

export const sequelize = new Sequelize(process.env.DB_CONNECTION_STRING!, {
	models: [User, Profile, Comment, VoyageRecord, Voyage],
	logging: false
});

export async function makeSql(idnumber: number, makeFleet?: boolean) {
	var dpath = process.env.PROFILE_DATA_PATH;
	if (!dpath) return null;
	if (!fs.existsSync(dpath)) {
		fs.mkdirSync(dpath);
	}

	if (fs.existsSync(dpath)) {
		if (dpath[dpath.length - 1] === '/') {
			dpath += "database";
		}
		else {
			dpath += "/database";
		}
		if (!fs.existsSync(dpath)) {
			fs.mkdirSync(dpath);
		}
		
		if (makeFleet) {
			dpath += "/fleet";
			if (!fs.existsSync(dpath)) {
				fs.mkdirSync(dpath);
			}
		}
		
		dpath += "/" + idnumber.toString() + ".sqlite";
	}

	dpath = "sqlite:" + dpath;

	if (makeFleet) {
		const newdb = new Sequelize(dpath, {
			models: [SolveDocument, TrialDocument, BossBattleDocument],
			logging: false
		});
	
		if (newdb) {
			await newdb.sync();
		}
		return newdb;
	}
	else {
		const newdb = new Sequelize(dpath, {
			models: [TrackedVoyage, TrackedCrew],
			logging: false
		});
	
		if (newdb) {
			await newdb.sync();
		}
		return newdb;
	}
}

export async function getHistoricalDb() {
	var dpath = process.env.PROFILE_DATA_PATH;
	if (!dpath) return null;
	if (!fs.existsSync(dpath)) {
		fs.mkdirSync(dpath);
	}

	if (fs.existsSync(dpath)) {
		if (dpath[dpath.length - 1] === '/') {
			dpath += "database";
		}
		else {
			dpath += "/database";
		}
		if (!fs.existsSync(dpath)) {
			fs.mkdirSync(dpath);
		}
		
		dpath += "/historical.sqlite";
	}

	dpath = "sqlite:" + dpath;

	const newdb = new Sequelize(dpath, {
		models: [Historical],
		logging: false
	});

	if (newdb) {
		await newdb.sync();
	}
	return newdb;

}

