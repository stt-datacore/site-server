import { Collaboration, CrewTrial, Solve } from "../datacore/boss";
import { IFBB_BossBattle_Document } from "../models/BossBattles";
import { Logger } from '../logic/logger';
import { apiResult } from "../logic";

export abstract class CollaboratorBase {


	async postBossBattle(battle: IFBB_BossBattle_Document) {

		Logger.info('Post boss battle', { battle });

		try {
			let res = await this.postOrPutBossBattle(battle);
			return apiResult({ result: 'ok' }, res);
		}
		catch (err: any) {
			return apiResult({ result: 'fail', error: err?.toString() }, 500);
		}
	}

	async getCollaboration(fleetId: number, bossBattleId?: number, roomCode?: string) {

		Logger.info('Get boss battle', { bossBattleId });

		try {
			let battle = await this.getCollaborationById(fleetId, bossBattleId, roomCode);
			if (!battle) {
				return apiResult([])
			}
			return apiResult(battle)
		}
		catch (err: any) {
			return apiResult({ result: 'fail', error: err?.toString() }, 500);
		}
	}

	async postSolves(fleetId: number, bossBattleId: number, chainIndex: number, solves: Solve[]) {

		Logger.info('Post trials', { solves });

		try {
			let res = await this.postOrPutSolves(fleetId, bossBattleId, chainIndex, solves);
			return apiResult({ result: "ok" }, res);
		}
		catch (err: any) {
			return apiResult({ result: 'fail', error: err?.toString() }, 500);
		}
	}

	async postTrials(fleetId: number, bossBattleId: number, chainIndex: number, trials: CrewTrial[]) {

		Logger.info('Post trials', { trials });

		try {
			let res = await this.postOrPutTrials(fleetId, bossBattleId, chainIndex, trials);
			return apiResult({ result: "ok" }, res);
		}
		catch (err: any) {
			return apiResult({ result: 'fail', error: err?.toString() }, 500);
		}
	}

	async deleteTrials(fleetId: number, bossBattleId: number, chainIndex: number) {

		Logger.info('Remove trials', { bossBattleId });

		try {
			let res = await this.removeTrials(fleetId, bossBattleId, chainIndex);
			if (res === 404) {
				return apiResult({ result: "not_found", message: "trial not found" });
			}
			else {
				return apiResult({ result: "ok", message: "trial deleted" }, res);
			}
		}
		catch (err: any) {
			return apiResult({ result: 'fail', error: err?.toString() }, 500);
		}
	}

	async resetFleet(fleetId: number) {

		Logger.info('Reset fleet', { fleetId });

		try {
			let res = await this.clearFleetData(fleetId);
			return apiResult({ result: 'ok' }, res);
		}
		catch (err: any) {
			return apiResult({ result: 'fail', error: err?.toString() }, 500);
		}
	}

    protected abstract postOrPutBossBattle(
        battle: IFBB_BossBattle_Document): Promise<number>;

    protected abstract postOrPutSolves(
        fleetId: number,
        bossBattleId: number,
        chainIndex: number,
        solves: Solve[]): Promise<number>;

    protected abstract postOrPutTrials(
        fleetId: number,
        bossBattleId: number,
        chainIndex: number,
        trials: CrewTrial[]): Promise<number>;

	protected abstract removeTrials(
		fleetId: number,
		bossBattleId: number,
		chainIndex: number): Promise<number>;

    protected abstract getCollaborationById(
        fleetId: number,
        bossBattleId?: number,
        roomCode?: string): Promise<Collaboration[] | null>;


	protected abstract clearFleetData(
		fleetId: number): Promise<number>;

}
