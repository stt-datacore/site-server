
import { WithId } from "mongodb";
import { collections } from "../mongo";
import { PlayerProfile } from "../mongoModels/playerProfile";
import { PlayerData } from "../datacore/player";
import { ITrackedAssignment, ITrackedVoyage, IVoyageHistory } from "../datacore/voyage";
import { ITelemetryVoyage, TelemetryVoyage, TrackedCrew, TrackedVoyage } from "../mongoModels/voyageHistory";
import { BossBattleDocument, IFBB_BossBattle_Document, SolveDocument, TrialDocument } from "../mongoModels/playerCollab";
import * as seedrandom from 'seedrandom';
import { Collaboration, CrewTrial, Solve } from "../datacore/boss";
import { createProfileObject } from "./profiletools";
import { createHash } from 'node:crypto'

export async function getProfile(dbid: number) {
    let res: PlayerProfile | null = null;

    if (collections.profiles) {
        res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;    
    }

    return res;
}

export async function getProfileByHash(dbidHash: string) {
    let res: PlayerProfile | null = null;

    if (collections.profiles) {
        res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbidHash })) as PlayerProfile;    
    }

    return res;
}


export async function getProfiles(fleet?: number, squadron?: number) {
    let res: PlayerProfile[] | null = null;

    if (collections.profiles) {
        if (fleet) {
            res = (await collections.profiles.find<WithId<PlayerProfile>>({ fleet }).toArray()) as PlayerProfile[];    
        }
        else if (squadron) {
            res = (await collections.profiles.find<WithId<PlayerProfile>>({ squadron }).toArray()) as PlayerProfile[];    
        }
    }

    return res;
}

export async function postOrPutProfile(dbid: number, player_data: PlayerData, timeStamp: Date = new Date()) {    
    if (collections.profiles) {        
        let res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;	
        
        let fleet = player_data.player.fleet?.id ?? 0;
        let squadron = player_data.player.squad?.id ?? 0;
        let profile = createProfileObject(dbid.toString(), player_data, timeStamp);
        let dbidHash = createHash('sha3-256').update(dbid.toString()).digest('hex');
        
        if (!res) {
            res = new PlayerProfile(dbid, dbidHash, player_data, timeStamp, profile.captainName, profile.buffConfig, profile.shortCrewList, fleet, squadron);
            let insres = await collections.profiles?.insertOne(res);            
            return !!(insres?.insertedId) ? dbidHash : 400;
        } else {            
            res.playerData = player_data;
            res.dbidHash = dbidHash;
            res.timeStamp = timeStamp;
            res.captainName = profile.captainName;
            res.buffConfig = profile.buffConfig;
            res.shortCrewList = profile.shortCrewList;
            res.fleet = fleet;
            res.squadron = squadron;          
            res.timeStamp = new Date();  
            let updres = await collections.profiles.updateOne(
                { dbid },
                { $set: res }
            );
            
            return !!(updres?.modifiedCount) ? dbidHash : 400;
        }    
    }

    return 500;
}

export async function getVoyagesByDbid(dbid: number) {
    let res: TrackedVoyage[] | null = null;

    if (collections.trackedVoyages) {
        res = await collections.trackedVoyages.find<WithId<TrackedVoyage>>({ dbid: dbid }).toArray();        
    }

    return res;
}

export async function getVoyagesByTrackerId(trackerId: number) {
    let res: TrackedVoyage[] | null = null;

    if (collections.trackedVoyages) {
        res = await collections.trackedVoyages.find<WithId<TrackedVoyage>>({ trackerId: trackerId }).toArray();        
    }

    return res;
}

export async function postOrPutVoyage(
    dbid: number, 
    voyage: ITrackedVoyage,
    timeStamp: Date = new Date()) {
    if (collections.trackedVoyages) {        
        let insres = await collections.trackedVoyages?.insertOne({ 
                dbid,
                trackerId: voyage.tracker_id,
                voyage,
                timeStamp
            } as TrackedVoyage);
        
        return !!(insres?.insertedId) ? 201 : 400;
    }

    return 500;
}

export async function getAssignmentsByDbid(dbid: number) {
    let res: TrackedCrew[] | null = null;

    if (collections.trackedAssignments) {
        res = await collections.trackedAssignments.find<WithId<TrackedCrew>>({ dbid: dbid }).toArray();        
    }

    return res;
}

export async function getAssignmentsByTrackerId(trackerId: number) {
    let res: TrackedCrew[] | null = null;

    if (collections.trackedAssignments) {
        res = await collections.trackedAssignments.find<WithId<TrackedCrew>>({ trackerId: trackerId }).toArray();        
    }

    return res;
}

export async function postOrPutAssignment(
    dbid: number, 
    crew: string,
    assignment: ITrackedAssignment,
    timeStamp: Date = new Date()) {
    if (collections.trackedAssignments) {        
        let insres = await collections.trackedAssignments.insertOne({ 
                dbid,                
                crew,     
                trackerId: assignment.tracker_id,
                assignment,
                timeStamp
            } as TrackedCrew);
        
        return !!(insres?.insertedId) ? 201 : 400;
    }

    return 500;
}

export async function postOrPutAssignmentsMany(
    dbid: number, 
    crew: string[],
    assignments: ITrackedAssignment[],
    timeStamp: Date = new Date()) {
    let result = true;
    if (collections.trackedAssignments) {    
        const newdata = [] as TrackedCrew[];
        let x = 0;
        for (let crewMember of crew) {
            let assignment  = assignments[x++];
            
            newdata.push({ 
                dbid,                
                crew: crewMember,     
                trackerId: assignment.tracker_id,
                assignment,
                timeStamp
            } as TrackedCrew);
            
        }
        let insres = await collections.trackedAssignments.insertMany(newdata);
        result &&= !!insres && Object.keys(insres.insertedIds).length === newdata.length;
        return result ? 201 : 400;
    }

    return 500;
}

export async function getTelemetry(a: Date | string, b?: Date) {
    let res: TelemetryVoyage[] | null = null;
    b ??= new Date();
    if (collections.telemetry) {
        if (typeof a !== 'string') {
            let result = collections.telemetry.find<WithId<TelemetryVoyage>>({ 
                voyageDate: {
                    $gt: a,
                    $lt: b
                }
            });
            
            res = await result?.toArray();
        }
        else {
            let result = collections.telemetry.find<WithId<TelemetryVoyage>>({ 
                crewSymbol: a
            });
            
            res = await result?.toArray();
        }
    }

    return res;
}

export async function postTelemetry(
    voyage: ITelemetryVoyage,
    timeStamp: Date = new Date()) {
    if (collections.telemetry) {        
        let insres = await collections.telemetry?.insertOne({                 
                ... voyage,
                voyageDate: timeStamp
            } as TelemetryVoyage);
        
        return !!(insres?.insertedId) ? 201 : 400;
    }

    return 500;
}

export async function postOrPutBossBattle(
    battle: IFBB_BossBattle_Document) {
    let result = true;
    
    if (collections.bossBattles) {            
        let roomCode = (seedrandom.default(battle.bossBattleId.toString())() * 1000000).toString();
        let insres = await collections.bossBattles?.updateOne(
            { bossBattleId: battle.bossBattleId }, 
            { 
                $set: { 
                    ... battle,
                    roomCode 
                } as BossBattleDocument
            }, 
            { 
                upsert: true 
            }
        );

        result &&= !!insres && (!!insres.upsertedId || !!insres.matchedCount || !!insres.modifiedCount);
        return result ? 201 : 400;
    }

    return 500;
}

export async function postOrPutSolves(
	bossBattleId: number,
	chainIndex: number,
	solves: Solve[]) {

    let result = true;
    if (collections.solves) {
        const newdata = [] as SolveDocument[];

        for (let solve of solves) {
            newdata.push({
                bossBattleId,
                chainIndex,
                solve,
                timeStamp: new Date(),
            })
        }

        let insres = await collections.solves.insertMany(newdata);
        result &&= !!insres && Object.keys(insres.insertedIds).length === newdata.length;
        return result ? 201 : 400;        
    }

    return 500;
}


export async function postOrPutTrials(
	bossBattleId: number,
	chainIndex: number,
	trials: CrewTrial[]) {

    let result = true;
    if (collections.trials) {
        const newdata = [] as TrialDocument[];

        for (let trial of trials) {
            newdata.push({
                bossBattleId,
                chainIndex,
                trial,
                timeStamp: new Date(),
            })
        }

        let insres = await collections.trials.insertMany(newdata);
        result &&= !!insres && Object.keys(insres.insertedIds).length === newdata.length;
        return result ? 201 : 400;        
    }

    return 500;
}

export async function getCollaborationById(
    bossBattleId?: number,
    roomCode?: string) {

    if (collections.bossBattles && collections.solves && collections.trials && (!!bossBattleId || !!roomCode)) {
        let bossBattleDoc: BossBattleDocument | null = null;
        
        if (bossBattleId) {
            bossBattleDoc = await collections.bossBattles.findOne<BossBattleDocument>({ bossBattleId: bossBattleId }) as BossBattleDocument;
        }
        else if (roomCode) {
            bossBattleDoc = await collections.bossBattles.findOne<WithId<BossBattleDocument>>({ roomCode }) as BossBattleDocument;
        }
        
        if (bossBattleDoc) {
            let solveFind = collections.solves.find<WithId<SolveDocument>>({ bossBattleId, chainIndex: bossBattleDoc.chainIndex });
            let trialFind = collections.trials.find<WithId<TrialDocument>>({ bossBattleId, chainIndex: bossBattleDoc.chainIndex });
    
            let solves = await solveFind?.toArray() ?? [];
            let trials = await trialFind?.toArray() ?? [];
    
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