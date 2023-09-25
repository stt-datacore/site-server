
import { WithId } from "mongodb";
import { collections } from "../mongo";
import { PlayerProfile } from "../mongoModels/playerProfile";
import { PlayerData } from "../datacore/player";
import { ITrackedAssignment, ITrackedVoyage, IVoyageHistory } from "../datacore/voyage";
import { TrackedCrew, TrackedVoyage } from "../mongoModels/voyageHistory";

export async function getProfile(dbid: number) {
    let res: PlayerProfile | null = null;

    if (collections.profiles) {
        res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;    
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

        if (!res) {
            res = new PlayerProfile(dbid, player_data, timeStamp, fleet, squadron);
            let insres = await collections.profiles?.insertOne(res);            
            return !!(insres?.insertedId) ? 201 : 400;
        } else {            
            res.playerData = player_data;
            res.timeStamp = timeStamp;
            res.fleet = fleet;
            res.squadron = squadron;            
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
    if (collections.profiles) {        
        let insres = await collections.profiles?.insertOne({ 
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
    if (collections.profiles) {    
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
        let insres = await collections.profiles?.insertMany(newdata);
        result &&= !!insres && Object.keys(insres.insertedIds).length === newdata.length;
        return result ? 201 : 400;
    }

    return 500;
}

