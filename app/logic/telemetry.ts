import { VoyageRecord } from '../models/VoyageRecord';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

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
	// const findAll = await VoyageRecord.findAll();
	// return findAll;
	const baseFilter = {
		group: ['crewSymbol'],
		attributes: ['crewSymbol', [Sequelize.fn('COUNT', Sequelize.col('crewSymbol')), 'crewCount'], [Sequelize.fn('AVG', Sequelize.col('estimatedDuration')), 'averageDuration']],
	} as any;
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	//const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
	//const allTime = await VoyageRecord.findAll({ ...baseFilter });
	//const allSinceNewTelemetry = await VoyageRecord.findAll({ ...baseFilter, where: { estimatedDuration: { [Op.ne]: null } } });
	//const lastYear = await VoyageRecord.findAll({ ...baseFilter, where: { voyageDate: { [Op.gt]: yearAgo } } });
	const lastSevenDays = await VoyageRecord.findAll({ ...baseFilter, where: { voyageDate: { [Op.gt]: sevenDaysAgo } } });
	const lastThirtyDays = await VoyageRecord.findAll({ ...baseFilter, where: { voyageDate: { [Op.gt]: thirtyDaysAgo } } });
	return {
		//allTime,
		//lastYear,
		//allSinceNewTelemetry,
		lastSevenDays,
		lastThirtyDays
	}
}
