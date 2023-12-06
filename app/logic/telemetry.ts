import { Op } from 'sequelize';
import { Voyage } from '../models/VoyageRecord';
import fs from 'fs';

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
	let path = `${process.env.PROFILE_DATA_PATH}/stats`;
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path);
	}
	
	let dailyfile = `${path}/daily_stats.json`;

	if (fs.existsSync(dailyfile)) {
		let rt = fs.statSync(dailyfile);
		if (force || rt.mtime.getDay() !== (mynow.getDay())) {
			fs.rmSync(dailyfile);
		}
		else {
			setTimeout(() => createStats(), 1000 * 60 * 60);
			return;
		}
	}

	let result = await getVoyageStats();
	fs.writeFileSync(dailyfile, JSON.stringify(result));
	setTimeout(() => createStats(), 1000 * 60 * 60);
}

async function getVoyageStats() {	
	const one80DaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
	
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

	const records = await Voyage.findAll({ where: { voyageDate: { [Op.gte]: one80DaysAgo }}});
	const output = {} as { [key: string]: Voyager[] };

	const dsets = [{
		date: new Date(Date.now() - (180 * 24 * 60 * 60 * 1000)),
		file: "lastSixMonths"
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
		let results = records.filter(r => r.voyageDate.getTime() >= dset.date.getTime());

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

	return output;
}

