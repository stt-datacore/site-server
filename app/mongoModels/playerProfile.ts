import { ObjectId } from "mongodb";

export class PlayerProfile {
    constructor(public dbid: number, public playerJson: string, public timeStamp: Date, public id?: ObjectId) {
    }    
}


