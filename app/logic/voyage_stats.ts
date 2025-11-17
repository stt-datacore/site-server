import { exec } from "child_process";
import { DatabaseError, Op } from "sequelize";
import { Repository, Sequelize } from "sequelize-typescript";
import { Voyage, Historical } from "../models/VoyageRecord";

require('dotenv').config();

export interface Voyager {
	crewSymbol: string,
	seats: { seat_skill: string, seat_index: number, crewCount: number, averageDuration: number }[],
	averageDuration: number,
	maxDuration: number,
	startDate: Date,
	endDate: Date,
	crewCount: number;
	quipmentCounts: { [key: string]: number };
	voyageTypes: { [key: string]: number };
}

export async function voyageRawByDays(days: number, crewMatch?: string[], opAnd?: boolean) {
	let endDate = new Date();
	let startDate = new Date();
	startDate.setDate(startDate.getDate() - days);

	return voyageRawByRange(startDate, endDate, crewMatch, opAnd);
}

export async function voyageRawByRange(startDate?: Date, endDate?: Date, crewMatch?: string[], opAnd?: boolean) {
	endDate ??= new Date();
	if (!startDate) {
		startDate = new Date(endDate.getTime());
		startDate.setDate(startDate.getDate() - 7);
	}
	let results: Voyage[] | undefined = undefined;
	if (crewMatch) {
		results = await Voyage.findAll({
			where: {
				[Op.and]: [
					{
						voyageDate: {
							[Op.and]: [
								{ [Op.gte]: startDate },
								{ [Op.lte]: endDate }
							]
						}
					},
					{
						crew: {
							[opAnd ? Op.and : Op.or]: [
								... crewMatch.map(c => {
									return {
										[Op.substring]: `"${c}"`
									}
								})
							]
						}
					}
				]
			},
			lock: true
		});
	}
	else {
		results = await Voyage.findAll({
			where: {
				voyageDate: {
					[Op.and]: [
						{ [Op.gte]: startDate },
						{ [Op.lte]: endDate }
					]
				}
			},
			lock: true
		});
	}

	return results;
}

export async function getVoyageStats(sqlconn?: string, filename?: string) {
	return new Promise<{ [key: string]: Voyager[] }>((resolve, reject) => {
		filename ??= "snapshot.sqlite"
		sqlconn ??= process.env.DB_CONNECTION_STRING as string;

		let n = sqlconn.indexOf("/");
		sqlconn = sqlconn.slice(n);
		let sqlfile = sqlconn;

		n = sqlconn.lastIndexOf("/");
		sqlconn = sqlconn.slice(0, n);
		let snapfile = sqlconn + "/" + filename;

		sqlfile = sqlfile.replace(/\/\//g, '/');
		snapfile = snapfile.replace(/\/\//g, '/');

		let proc = exec(`flock ${sqlfile} cp ${sqlfile} ${snapfile}`);

		proc.on('exit', async (code, signal) => {

			let sql = new Sequelize(`sqlite:${snapfile}`, {
				models: [Historical],
				logging: false,
				repositoryMode: true
			});

			if (sql) {
				await sql.sync();
				const repo = sql.getRepository(Historical);
				let results = await internalgetVoyageStats(repo);
				resolve(results);
			}
			else {
				reject(new Error("Could not connect to database"));
			}
		});
	});
}

export async function historicalize(sqlconn?: string, filename?: string) {
	return new Promise<void>((resolve, reject) => {

		let historical = 'historical.sqlite';
		filename ??= "snapshot.sqlite";
		sqlconn ??= process.env.DB_CONNECTION_STRING as string;

		let n = sqlconn.indexOf("/");
		sqlconn = sqlconn.slice(n);
		let sqlfile = sqlconn;

		n = sqlconn.lastIndexOf("/");
		sqlconn = sqlconn.slice(0, n);
		let snapfile = sqlconn + "/" + filename;
		let histfile = sqlconn + "/" + historical;

		sqlfile = sqlfile.replace(/\/\//g, '/');
		snapfile = snapfile.replace(/\/\//g, '/');
		histfile = histfile.replace(/\/\//g, '/');

		console.log("Copying production database to work database...")
		let proc = exec(`flock ${sqlfile} cp ${sqlfile} ${snapfile}`);

		proc.on('exit', async (code, signal) => {
			console.log("Copying production database to secondary backup...")
			exec(`flock ${sqlfile} cp ${sqlfile} ${snapfile}_backup`);

			console.log("Open connection to current database...");
			let sqlCurr = new Sequelize(`sqlite:${snapfile}`, {
				models: [Historical],
				logging: false,
				repositoryMode: true
			});
			console.log("Open connection to historical database...");
			let sqlHist = new Sequelize(`sqlite:${histfile}`, {
				models: [Historical],
				logging: false,
				repositoryMode: true
			});

			if (sqlCurr && sqlHist) {
				let target = new Date();
				target.setFullYear(target.getFullYear() - 1);
				target.setHours(0);
				target.setMinutes(0);
				target.setSeconds(0);
				target.setMilliseconds(0);
				console.log(`Transfer history from before ${target.toDateString()}...`);

				console.log(`Sync current database...`);
				await sqlCurr.sync({ alter: true });

				console.log(`Sync historical database...`);
				await sqlHist.sync({ alter: true });

				const hist = sqlHist.getRepository(Historical);
				const repo = sqlCurr.getRepository(Historical);
				let n = 0;

				let transfers: Historical[] = [];
				let trans = false;
				do {
					trans = false;
					console.log(`Query database...`);
					transfers = await repo.findAll({
						where: {
							voyageDate: {
								[Op.lt]: target
							}
						},
						limit: 1000
					});
					if (transfers?.length) {
						trans = true;
						let data = transfers.map(obj => {
							let newobj = obj.toJSON();
							if (newobj.id) delete newobj.id;
							return newobj;
						});
						await hist.bulkCreate(data);
						await Promise.all(transfers.map(t => t.destroy()));
						n += transfers.length;

						transfers.length = 0;
						data.length = 0;

						console.log(`${n} records transferred, vacuuming...`);
					}
					await sqlCurr.query(`VACUUM;`);
				} while (trans);

				console.log(`Closing databases...`);
				await sqlCurr.close();
				await sqlHist.close();

				console.log(`Copy work database back to production...`);
				let proc = exec(`flock ${sqlfile} cp ${snapfile} ${sqlfile}`);
				proc.on('exit', resolve);
			}
			else {
				reject(new Error("Could not connect to database"));
			}
		});
	});
}

function parseQuipment(data: (number[] | 0)[]) {

	const quipment = [] as number[][];

	for (let q of data) {
		if (q === 0) {
			quipment.push([0, 0, 0, 0]);
			continue;
		}
		else {
			quipment.push([ ... q]);
		}
	}

	return quipment;
}

function addQuipment(quipment: number[], current?: { [key: string]: number }) {
	const init = !current;
	current ??= {};
	for (let q of quipment) {
		if (q === 0) continue;
		current[q] ??= 0;
		if (init) continue;
		current[q]++;
	}

	return current;
}

async function internalgetVoyageStats(Table: Repository<Historical>) {
	const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
	const seats = [
		'command_skill',
		'command_skill',
		'diplomacy_skill',
		'diplomacy_skill',
		'security_skill',
		'security_skill',
		'engineering_skill',
		'engineering_skill',
		'science_skill',
		'science_skill',
		'medicine_skill',
		'medicine_skill'
	];
	const shortNames = {
		'command_skill': 'CMD',
		'diplomacy_skill': 'DIP',
		'security_skill': 'SEC',
		'engineering_skill': 'ENG',
		'science_skill': 'SCI',
		'medicine_skill': 'MED',
	} as { [key: string]: string };

	const records = await Table.findAll({
		where: {
			voyageDate: {
				[Op.gte]: oneYearAgo
			}
		},
		lock: true
	});
	const output = {} as { [key: string]: Voyager[] };

	const dsets = [{
		date: new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)),
		file: "oneYear"
	},
	{
		date: new Date(Date.now() - (180 * 24 * 60 * 60 * 1000)),
		file: "lastSixMonths"
	},
	{
		date: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)),
		file: "lastNinetyDays"
	},
	{
		date: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)),
		file: "lastThirtyDays"
	},
	{
		date: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)),
		file: "lastSevenDays"
	}];

	for (let dset of dsets) {
		let { date: d, file: fn } = dset;
		console.log(`From ${d} as '${fn}'...`);

		let rangeraw = records.filter(r => r.voyageDate.getTime() >= dset.date.getTime());
		let dmap = {} as { [key: string]: Historical };
		for (let item of rangeraw) {
			dmap[item.voyageDate.getTime().toString()] = item;
		}

		let results = Object.values(dmap);
		const cp = {} as { [key: string]: Voyager };

		for (let res of results) {
			let seat = 0;

			let pri = res.primary_skill;
			let sec = res.secondary_skill;
			let prisec = '/';

			if (pri?.length && sec?.length) {
				prisec = `${shortNames[pri]}/${shortNames[sec]}`;
			}

			if (!res.estimatedDuration) continue;

			let quipment = [] as number[][]

			if (res.extra_stats &&
				res.extra_stats.quipment) {
				quipment = parseQuipment(res.extra_stats.quipment);
			}
			else {
				for (let i = 0; i < 12; i++) {
					quipment.push([0, 0, 0, 0]);
				}
			}

			for (let c of res.crew) {
				let currQuip = quipment[seat];

				cp[c] ??= {
					crewSymbol: c,
					seats: [],
					averageDuration: 0,
					maxDuration: 0,
					startDate: res.voyageDate,
					endDate: res.voyageDate,
					crewCount: 0,
					quipmentCounts: addQuipment(currQuip),
					voyageTypes: {}
				};
				if (prisec !== '/') {
					cp[c].voyageTypes[prisec] ??= 0;
					cp[c].voyageTypes[prisec]++;
				}
				cp[c].quipmentCounts = addQuipment(currQuip, cp[c].quipmentCounts);
				cp[c].crewCount++;
				cp[c].endDate = res.voyageDate;
				let cseatcount = cp[c].seats.reduce((p, n) => p ? p + n.crewCount : n.crewCount, 0);
				cp[c].averageDuration = ((cp[c].averageDuration * cseatcount) + res.estimatedDuration) / (cseatcount + 1);

				if (cp[c].maxDuration < res.estimatedDuration) {
					cp[c].maxDuration = res.estimatedDuration;
				}

				let currseat = cp[c].seats.find(s => s.seat_skill === seats[seat]);

				if (currseat) {
					currseat.averageDuration = ((currseat.averageDuration * currseat.crewCount) + res.estimatedDuration) / (currseat.crewCount + 1);
					currseat.crewCount++;
				}
				else {
					cp[c].seats.push({
						seat_skill: seats[seat],
						seat_index: seat,
						crewCount: 1,
						averageDuration: res.estimatedDuration
					})
				}
				seat++;
			}
		}

		let finalOut = Object.values(cp);

		finalOut.sort((a, b) => b.crewCount - a.crewCount);
		output[dset.file] = finalOut;
	}
	// Backward compatibility
	if ("oneYear" in output) {
		output["allTime"] = output["oneYear"];
	}
	(output as any)["timestamp"] = new Date();
	return output;
}

(async () => {
	if (process.argv.includes("--archive")) {
		await historicalize();
	}
})();