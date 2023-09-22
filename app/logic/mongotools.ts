
import { WithId } from "mongodb";
import { collections } from "../mongo";
import { PlayerProfile } from "../mongoModels/playerProfile";
import { PlayerData } from "../datacore/player";
import { ITrackedAssignment, ITrackedVoyage, IVoyageHistory } from "../datacore/voyage";
import { TrackedAssignment, TrackedVoyage } from "../mongoModels/voyageHistory";

export async function getProfile(dbid: number) {
    let res: PlayerProfile | null = null;

    if (collections.profiles) {
        res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;    
    }

    return res;
}

export async function postOrPutProfile(dbid: number, player_data: PlayerData, timeStamp: Date = new Date()) {    
    if (collections.profiles) {        
        let res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;	
        
        if (!res) {
            res = new PlayerProfile(dbid, player_data, timeStamp);            
            let insres = await collections.profiles?.insertOne(res);            
            return !!(insres?.insertedId) ? 201 : 400;
        } else {            
            res.playerData = player_data;
            res.timeStamp = timeStamp;
            
            let updres = await collections.profiles.updateOne(
                { dbid },
                { $set: res }
            );
            
            return !!(updres?.modifiedCount) ? 200 : 400;
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
                voyageId: voyage.voyage_id,
                voyage,
                timeStamp
            } as TrackedVoyage);
        
        return !!(insres?.insertedId) ? 201 : 400;
    }

    return 500;
}

export async function getAssignmentsByDbid(dbid: number) {
    let res: TrackedAssignment[] | null = null;

    if (collections.trackedAssignments) {
        res = await collections.trackedAssignments.find<WithId<TrackedAssignment>>({ dbid: dbid }).toArray();        
    }

    return res;
}

export async function getAssignmentsByTrackerId(trackerId: number) {
    let res: TrackedAssignment[] | null = null;

    if (collections.trackedAssignments) {
        res = await collections.trackedAssignments.find<WithId<TrackedAssignment>>({ trackerId: trackerId }).toArray();        
    }

    return res;
}

export async function postOrPutAssignment(
    dbid: number, 
    crew: string,
    assignment: ITrackedAssignment,
    timeStamp: Date = new Date()) {
    if (collections.profiles) {        
        let insres = await collections.profiles?.insertOne({ 
                dbid,                
                crew,     
                trackerId: assignment.tracker_id,
                assignment,
                timeStamp
            } as TrackedAssignment);
        
        return !!(insres?.insertedId) ? 201 : 400;
    }

    return 500;
}


