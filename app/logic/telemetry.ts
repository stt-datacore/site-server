import { Op } from 'sequelize';
import { Voyage } from '../models/VoyageRecord';

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
			return getVoyageStats();
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

async function recordVoyageCalc({ voyagers, estimatedDuration }: { voyagers: string[]; estimatedDuration: number;}) {
	// for (let i in voyagers) {
	// 	const crewSymbol = voyagers[i];
	// 	await VoyageRecord.create({ crewSymbol, estimatedDuration });
	// }
	
	// New Telemetry Database
	await Voyage.create({
		estimatedDuration,
		voyageDate: new Date(),
		crew: voyagers		
	});

	return true;
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

	const records = await Voyage.findAll({ where: { voyageTime: { [Op.gte]: one80DaysAgo }}});
	const output = {} as any;

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

		type CrewPeople = {
			crewSymbol: string,
			seats: { seat: string, count: number, avgTime: number }[],
			averageDuration: number,
			firstVoyage: Date,
			mostRecentVoyage: Date,
			crewCount: number;
		}
	
		const cp = {} as { [key: string]: CrewPeople };
	
		for (let res of results) {
			let seat = 0;
			if (!res.estimatedDuration) continue;
			for (let c of res.crew) {
				cp[c] ??= {
					crewSymbol: c,
					seats: [],
					averageDuration: 0,
					firstVoyage: res.voyageDate,
					mostRecentVoyage: res.voyageDate,
					crewCount: 0
				};
				cp[c].crewCount++;
				cp[c].mostRecentVoyage = res.voyageDate;
				cp[c].averageDuration = ((cp[c].averageDuration * cp[c].seats.length) + res.estimatedDuration) / (cp[c].seats.length + 1);
				let currseat = cp[c].seats.find(s => s.seat === seats[seat]);
				if (currseat) {
					currseat.avgTime = ((currseat.avgTime * currseat.count) + res.estimatedDuration) / (currseat.count + 1);
					currseat.count++;
				}
				else {
					cp[c].seats.push({
						seat: seats[seat],
						count: 1,
						avgTime: res.estimatedDuration
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
