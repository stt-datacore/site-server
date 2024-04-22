import { Voyage } from '../models/VoyageRecord';
import fs from 'fs';
import { exit } from 'process';
import { Voyager, getVoyageStats } from './voyage_stats';

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
