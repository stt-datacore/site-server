import { ObjectId } from "mongodb";
import { PlayerData } from "../datacore/player";

export class PlayerProfile {
    constructor(public dbid: number, public playerData: PlayerData, public timeStamp: Date, public fleet: number = 0, public squadron: number = 0, public id?: ObjectId) {
    }    
}


