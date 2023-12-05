import { Collaboration, CrewTrial, Solve } from "../datacore/boss";
import { BossBattleDocument, IFBB_BossBattle_Document, IFBB_Solve_Document, SolveDocument, TrialDocument } from "../models/BossBattles";
import { makeSql } from "../sequelize";
import seedrandom from 'seedrandom';

export async function postOrPutBossBattle_sqlite(
    battle: IFBB_BossBattle_Document) {
    let result = true;
    
    let sql = await makeSql(battle.fleetId, true);
    
    if (sql) {            
        
        let roomCode = (seedrandom(battle.bossBattleId.toString())() * 1000000).toString();
        battle.roomCode = roomCode;

        const battleDoc = await BossBattleDocument.findOne({ where: { bossBattleId: battle.bossBattleId } });

        if (battleDoc) {
            result = !!BossBattleDocument.update({ ... battle }, { where: { bossBattleId: battle.bossBattleId } });
        }
        else {
            result = !!BossBattleDocument.create({ ... battle });
        }
        
        return result ? 201 : 400;
    }

    return 500;
}

export async function postOrPutSolves_sqlite(
	fleetId: number,
    bossBattleId: number,
	chainIndex: number,
	solves: Solve[]) {

    let sql = await makeSql(fleetId, true);
    
    let result = true;
    if (sql) {
        const newdata = [] as any[];
        for (let solve of solves) {
            newdata.push({
                bossBattleId,
                chainIndex,
                solve,
                timeStamp: new Date(),
            });
        }

        let res = await SolveDocument.bulkCreate(newdata);
        result &&= !!res && res.length === newdata.length;
        return result ? 201 : 400;        
    }

    return 500;
}


export async function postOrPutTrials_sqlite(
    fleetId: number,
	bossBattleId: number,
	chainIndex: number,
	trials: CrewTrial[]) {

    let sql = await makeSql(fleetId, true);
    let result = true;
    if (sql) {
        const newdata = [] as any[];

        for (let trial of trials) {
            newdata.push({
                bossBattleId,
                chainIndex,
                trial,
                timeStamp: new Date(),
            })
        }

        let insres = await TrialDocument.bulkCreate(newdata);
        result &&= !!insres && insres.length === newdata.length;
        return result ? 201 : 400;        
    }

    return 500;
}

export async function getCollaborationById_sqlite(
    fleetId: number,
    bossBattleId?: number,
    roomCode?: string) {

        let sql = await makeSql(fleetId, true);

    if (sql && (!!bossBattleId || !!roomCode)) {
        let bossBattleDoc: BossBattleDocument | null = null;
        
        if (bossBattleId) {
            bossBattleDoc = await BossBattleDocument.findOne({ where: { bossBattleId } });
        }
        else if (roomCode) {
            bossBattleDoc = await BossBattleDocument.findOne({ where: { roomCode } });
        }
        
        if (bossBattleDoc) {
            let solves = await SolveDocument.findAll({ where: { bossBattleId, chainIndex: bossBattleDoc.chainIndex } });
            let trials = await TrialDocument.findAll({ where: { bossBattleId, chainIndex: bossBattleDoc.chainIndex } });
    
            return [{
                bossBattleId,
                fleetId: bossBattleDoc.fleetId,
                bossGroup: bossBattleDoc.bossGroup,
                difficultyId: bossBattleDoc.difficultyId,
                chainIndex: bossBattleDoc.chainIndex,
                chain: bossBattleDoc.chain,
                description: bossBattleDoc.description,
                roomCode: bossBattleDoc.roomCode,
                solves: solves.map(solveDoc => solveDoc.solve) as Solve[],
                trials: trials.map(trialDoc => trialDoc.trial) as CrewTrial[]
            }] as Collaboration[];
        }
    }

    return null;
}