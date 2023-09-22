import { ObjectId } from "mongodb";
import { PlayerData } from "../datacore/player";

export class PlayerProfile {
    constructor(public dbid: number, public playerData: PlayerData, public timeStamp: Date, public id?: ObjectId) {
    }    
}


