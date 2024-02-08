import { Op } from 'sequelize';
import { Historical, Voyage } from '../models/VoyageRecord';
import fs from 'fs';
import { exec } from 'child_process';
import { Model, Sequelize } from 'sequelize-typescript';
import { exit } from 'process';

export interface Voyager {
	crewSymbol: string,
	seats: { seat_skill: string, seat_index: number, crewCount: number, averageDuration: number }[],
	averageDuration: number,
	startDate: Date,
	endDate: Date,
	crewCount: number;
}

export async function recordTelemetryDB(type: string, data: any) {
	switch (type) {
		// Backwards-compatibility, remove once new version of site fully deployed/propagated
		case 'voyage':
			return recordVoyage(data);
		case 'voyageCalc':
			return recordVoyageCalc(data);
		default:
			throw new Error(`Unknown telemetry type: ${type}`);
	}
}

export async function getTelemetryDB(type: string) {
	switch (type) {
		case 'voyage':
			return loadStats();
		default:
			throw new Error(`Unknown telemetry type: ${type}`);
	}
}

// Backwards-compatibility, remove once new version of site fully deployed/propagated
async function recordVoyage(voyagers: string[]) {
	// for (let i in voyagers) {
	// 	const crewSymbol = voyagers[i];
	// 	await VoyageRecord.create({ crewSymbol });
	// }
	return true;
}

async function recordVoyageCalc({ voyagers, estimatedDuration, primary_skill, secondary_skill, am_traits, ship_trait, extra_stats }: { voyagers: string[]; estimatedDuration: number; primary_skill?: string; secondary_skill?: string, am_traits?: string[], ship_trait?: string, extra_stats?: any }) {
	// for (let i in voyagers) {
	// 	const crewSymbol = voyagers[i];
	// 	await VoyageRecord.create({ crewSymbol, estimatedDuration });
	// }
	
	// New Telemetry Database
	await Voyage.create({
		estimatedDuration,
		voyageDate: new Date(),
		crew: voyagers,
		primary_skill,
		secondary_skill,
		am_traits,
		ship_trait,
		extra_stats
	});

	return true;
}


export async function loadStats() {
	let path = `${process.env.PROFILE_DATA_PATH}/stats`;

	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}
	
	let dailyfile = `${path}/daily_stats.json`;

	if (fs.existsSync(dailyfile)) {
		return JSON.parse(fs.readFileSync(dailyfile, 'utf-8')) as { [key: string]: Voyager[] };
	}

	return {};
}

export async function createStats(force?: boolean) {
	let mynow = new Date();
	mynow.setMinutes(0);
	mynow.setSeconds(0);
	mynow.setMilliseconds(0);

	let path = `${process.env.PROFILE_DATA_PATH}/stats`;
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}
	
	let dailyfile = `${path}/daily_stats.json`;

	if (fs.existsSync(dailyfile)) {
		let rt = fs.statSync(dailyfile);
		if (!force && rt.mtime.getDay() === (mynow.getDay())) {
			return;
		}
	}

	let result = await getVoyageStats();
	fs.writeFileSync(dailyfile, JSON.stringify(result));
	if (process.argv.includes("stats")) exit(0);
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

async function getVoyageStats(sqlconn?: string, filename?: string) {
	return new Promise<{ [key: string]: Voyager[] }>((resolve, reject) => {
		filename ??= "snapshot.sqlite"
		sqlconn ??= process.env.DB_CONNECTION_STRING as string;
			
		let n = sqlconn.indexOf("/");
		sqlconn = sqlconn.slice(n);
		let sqlfile = sqlconn;
		
		n = sqlconn.lastIndexOf("/");
		sqlconn = sqlconn.slice(0, n);		
		let histfile = sqlconn + "/" + filename;
		
		sqlfile = sqlfile.replace(/\/\//g, '/');
		histfile = histfile.replace(/\/\//g, '/');
		
		let proc = exec(`flock ${sqlfile} cp ${sqlfile} ${histfile}`);		

		proc.on('exit', async (code, signal) => {
	
			let sql = new Sequelize(`sqlite:${histfile}`, {
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

async function internalgetVoyageStats(Table: typeof Model & (typeof Voyage | typeof Historical)) {	
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
			if (!res.estimatedDuration) continue;
			for (let c of res.crew) {
				cp[c] ??= {
					crewSymbol: c,
					seats: [],
					averageDuration: 0,
					startDate: res.voyageDate,
					endDate: res.voyageDate,
					crewCount: 0
				};
				cp[c].crewCount++;
				cp[c].endDate = res.voyageDate;
				cp[c].averageDuration = ((cp[c].averageDuration * cp[c].seats.length) + res.estimatedDuration) / (cp[c].seats.length + 1);
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
	return output;
}

