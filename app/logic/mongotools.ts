
import { WithId } from "mongodb";
import { collections } from "../mongo";
import PlayerProfile from "../mongoModels/playerProfile";

export async function getProfile(dbid: number) {
    let res: PlayerProfile | null = null;

    if (collections.profiles) {
        res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;
    }

    return res;
}

export async function uploadProfile(dbid: number, player_data: string, lastUpdate: Date = new Date()) {
    if (collections.profiles) {        
        let res = (await collections.profiles.findOne<WithId<PlayerProfile>>({ dbid: dbid })) as PlayerProfile;	
        
        if (!res) {
            return await collections.profiles?.insertOne({ 
                    dbid: dbid,
                    playerJson: player_data,
                    timeStamp: lastUpdate
                });
        } else {            
            res.playerJson = player_data;
            res.timeStamp = lastUpdate;
            
            await collections.profiles.updateOne(
                { dbid },
                { $set: res }
            );
            
            return res;
        }    
    }
}
