
import { WithId } from "mongodb";
import { collections } from "../mongo";
import { PlayerProfile } from "../mongoModels/playerProfile";
import { VoyageHistory } from "../mongoModels/voyageHistory";

export async function getProfile(dbid: number) {
    let res: PlayerProfile | null = null;

    if (collections.profiles) {
        res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;
    }

    return res;
}

export async function postOrPutProfile(dbid: number, player_data: string, lastUpdate: Date = new Date()) {
    if (collections.profiles) {        
        let res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;	
        
        if (!res) {
            let insres = await collections.profiles?.insertOne({ 
                    dbid: dbid,
                    playerJson: player_data,
                    timeStamp: lastUpdate
                });
            
            return !!(insres?.insertedId);

        } else {            
            res.playerJson = player_data;
            res.timeStamp = lastUpdate;
            
            let updres = await collections.profiles.updateOne(
                { dbid },
                { $set: res }
            );
            
            return !!(updres?.upsertedId);
        }    
    }

    return false;
}


export async function getVoyageHistory(dbid: number) {
    let res: VoyageHistory | null = null;

    if (collections.profiles) {
        res = (await collections.profiles.findOne<WithId<VoyageHistory>>({ dbid: dbid })) as VoyageHistory;
    }

    return res;
}

export async function postOrPutVoyageHistory(dbid: number, tracker_id: number, voyage_id: number, history_data: string, lastUpdate: Date = new Date()) {
    if (collections.profiles) {        
        let res = (await collections.profiles.findOne<WithId<VoyageHistory>>({ dbid: dbid })) as VoyageHistory;	
        
        if (!res) {
            let insres = await collections.profiles?.insertOne({ 
                    dbid,
                    tracker_id,
                    voyage_id,
                    historyJson: history_data,
                    timeStamp: lastUpdate
                });
            
            return !!(insres?.insertedId);

        } else {            
            res.historyJson = history_data;
            res.timeStamp = lastUpdate;
            res.tracker_id = tracker_id;
            res.voyage_id = voyage_id;
            
            let updres = await collections.profiles.updateOne(
                { dbid },
                { $set: res }
            );
            
            return !!(updres?.upsertedId);
        }    
    }

    return false;
}
