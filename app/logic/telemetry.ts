import { VoyageRecord } from '../models/VoyageRecord';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

export async function recordTelemetryDB(type: string, data: any) {
	switch (type) {
		case 'voyage':
			return recordVoyage(data);
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

async function recordVoyage(voyagers: string[]) {
	for (let i in voyagers) {
		const crewSymbol = voyagers[i];
		await VoyageRecord.create({ crewSymbol });
	}
	return true;
}

async function getVoyageStats() {
	const baseFilter = {
		group: ['crewSymbol'],
		attributes: ['crewSymbol', [Sequelize.fn('COUNT', 'crewSymbol'), 'crewCount']],
	} as any;
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const allTime = await VoyageRecord.findAll({ ...baseFilter });
	const lastSevenDays = await VoyageRecord.findAll({ ...baseFilter, where: { voyageDate: { [Op.gt]: sevenDaysAgo } } });
	const lastThirtyDays = await VoyageRecord.findAll({ ...baseFilter, where: { voyageDate: { [Op.gt]: thirtyDaysAgo } } });
	return {
		allTime,
		lastSevenDays,
		lastThirtyDays
	}
}