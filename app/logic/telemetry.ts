import { VoyageRecord } from '../models/VoyageRecord';

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
	for (let i in voyagers) {
		const crewSymbol = voyagers[i];
		await VoyageRecord.create({ crewSymbol });
	}
	return true;
}

async function recordVoyageCalc({ voyagers, estimatedDuration }: { voyagers: string[]; estimatedDuration: number;}) {
	for (let i in voyagers) {
		const crewSymbol = voyagers[i];
		await VoyageRecord.create({ crewSymbol, estimatedDuration });
	}
	return true;
}

async function getVoyageStats() {
	// This freezes the system.	
	return {};
	// const baseFilter = {
	// 	group: ['crewSymbol'],
	// 	attributes: ['crewSymbol', [Sequelize.fn('COUNT', Sequelize.col('crewSymbol')), 'crewCount'], [Sequelize.fn('AVG', Sequelize.col('estimatedDuration')), 'averageDuration']],
	// } as any;
	// const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	// const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	// const one80DaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
	// // const allTime = await VoyageRecord.findAll({ ...baseFilter });
	// // const allSinceNewTelemetry = await VoyageRecord.findAll({ ...baseFilter, where: { estimatedDuration: { [Op.ne]: null } } });
	// const lastSevenDays = await VoyageRecord.findAll({ ...baseFilter, where: { voyageDate: { [Op.gt]: sevenDaysAgo } } });
	// const lastThirtyDays = await VoyageRecord.findAll({ ...baseFilter, where: { voyageDate: { [Op.gt]: thirtyDaysAgo } } });
	// const lastSixMonths = await VoyageRecord.findAll({ ...baseFilter, where: { voyageDate: { [Op.gt]: one80DaysAgo } } });
	
	// return {
	// 	// allTime,
	// 	// allSinceNewTelemetry,
	// 	lastSixMonths,
	// 	lastSevenDays,		
	// 	lastThirtyDays
	// }
}
