import { Collaboration, CrewTrial, Solve } from "../datacore/boss";
import { BossBattleDocument, IFBB_BossBattle_Document, SolveDocument, TrialDocument } from "../models/BossBattles";

import { makeSql } from "../sequelize";
import seedrandom from 'seedrandom';
import { CollaboratorBase } from "../abstract/collab";

export class Collaborator extends CollaboratorBase {
    
    protected async postOrPutBossBattle(
        battle: IFBB_BossBattle_Document) {
        let result = true;
        
        let sql = await makeSql(battle.fleetId, true);
        
        if (sql) {            
            
            const repo = sql.getRepository(BossBattleDocument);
            let roomCode = (seedrandom(battle.bossBattleId.toString())() * 1000000).toString();
            battle.roomCode = roomCode;
    
            const battleDoc = await repo.findOne({ where: { bossBattleId: battle.bossBattleId } });
    
            if (battleDoc) {
                result = !!repo.update({ ... battle }, { where: { bossBattleId: battle.bossBattleId } });
            }
            else {
                result = !!repo.create({ ... battle });
            }
            
            return result ? 201 : 400;
        }
    
        return 500;
    }
    
    protected async postOrPutSolves(
        fleetId: number,
        bossBattleId: number,
        chainIndex: number,
        solves: Solve[]) {
    
        let sql = await makeSql(fleetId, true);
        
        let result = true;
        if (sql) {
            const repo = sql.getRepository(SolveDocument);
    
            const newdata = [] as any[];
            for (let solve of solves) {
                newdata.push({
                    bossBattleId,
                    chainIndex,
                    solve,
                    timeStamp: new Date(),
                });
            }
    
            let res = await repo.bulkCreate(newdata);
            result &&= !!res && res.length === newdata.length;
            return result ? 201 : 400;        
        }
    
        return 500;
    }
    
    
    protected async postOrPutTrials(
        fleetId: number,
        bossBattleId: number,
        chainIndex: number,
        trials: CrewTrial[]) {
    
        let sql = await makeSql(fleetId, true);
        let result = true;
        if (sql) {
            const repo = sql.getRepository(TrialDocument);
            const newdata = [] as any[];
    
            for (let trial of trials) {
                newdata.push({
                    bossBattleId,
                    chainIndex,
                    trial,
                    timeStamp: new Date(),
                })
            }
    
            let insres = await repo.bulkCreate(newdata);
            result &&= !!insres && insres.length === newdata.length;
            return result ? 201 : 400;        
        }
    
        return 500;
    }
    
    protected async getCollaborationById(
        fleetId: number,
        bossBattleId?: number,
        roomCode?: string) {
    
            let sql = await makeSql(fleetId, true);
    
        if (sql && (!!bossBattleId || !!roomCode)) {
    
            const bbrepo = sql.getRepository(BossBattleDocument);
            const sorepo = sql.getRepository(SolveDocument);
            const trrepo = sql.getRepository(TrialDocument);
    
            let bossBattleDoc: BossBattleDocument | null = null;
            
            if (bossBattleId) {
                bossBattleDoc = await bbrepo.findOne({ where: { bossBattleId } });
            }
            else if (roomCode) {
                bossBattleDoc = await bbrepo.findOne({ where: { roomCode } });
            }
            
            if (bossBattleDoc) {
                let solves = await sorepo.findAll({ where: { bossBattleId, chainIndex: bossBattleDoc.chainIndex } });
                let trials = await trrepo.findAll({ where: { bossBattleId, chainIndex: bossBattleDoc.chainIndex } });
        
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
    
}

export let CollaborationAPI = new Collaborator();