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

	let opath = dpath;
	dpath = "sqlite:" + dpath;

	let i = 0;
	if (makeFleet) {
		while (i < 2) {
			const newdb = new Sequelize(dpath, {
				models: [SolveDocument, TrialDocument, BossBattleDocument],
				logging: false,
				repositoryMode: true
			});

			if (newdb) {
				try {
					fixDB(newdb, i == 1);
					let [result, meta] = await newdb.query('PRAGMA integrity_check;');
					console.log(result);
					if ((result[0] as any)?.integrity_check !== 'ok') {
						throw new Error("Integrity check failed.");
					}
				}
				catch (e) {
					if (newdb){
						await newdb.close();
					}
					console.log(e);
					console.log("Errors Detected. Force Reinitialize database...");
					if (i === 1) {
						console.log("Force re-init did not work. Deleting database file.");
						fs.unlinkSync(opath);
					}
					i++;
					continue;
				}
				return newdb;
			}
		}
	}
	else {
		while (i < 2) {
			const newdb = new Sequelize(dpath, {
				models: [TrackedVoyage, TrackedCrew],
				logging: false,
				repositoryMode: true
			});

			if (newdb) {
				try {
					fixDB(newdb, i == 1);
					let [result, meta] = await newdb.query('PRAGMA integrity_check;');
					console.log(result);
					if ((result[0] as any)?.integrity_check !== 'ok') {
						throw new Error("Integrity check failed.");
					}
				}
				catch (e) {
					if (newdb) {
						await newdb.close();
					}
					console.log(e);
					console.log("Errors Detected. Force Reinitialize database...");
					if (i === 1) {
						console.log("Force re-init did not work. Deleting database file.");
						fs.unlinkSync(opath);
					}
					i++;
					continue;
				}
				return newdb;
			}
			return newdb;
		}
	}
	return null;
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

export async function fixDB(db: Sequelize, hardSync: boolean) {
	await db.sync({ alter: true, force: hardSync });
	const models = Object.values(db.models);
	for (let model of models) {
		try {
			const repo = db.getRepository(model as any);

			let [data,]: [any[], any] = await db.query(`SELECT * FROM ${model.tableName};`);
			let dupes = {} as {[key:string]: number};
			for (let d of data) {
				dupes[d["id"]] ??= 0;
				dupes[d["id"]]++;
			}
			for (let [key, value] of Object.entries(dupes)) {
				if (value > 1) {
					await db.query(`DELETE FROM ${model.tableName} WHERE id='${key}';`);
				}
			}
		}
		catch {

		}
	}
}
