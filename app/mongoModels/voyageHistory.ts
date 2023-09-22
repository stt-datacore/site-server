import { ObjectId } from "mongodb";

export class VoyageHistory {
    constructor(public dbid: number, public tracker_id: number, public voyage_id: number, public historyJson: string, public timeStamp: Date, public id?: ObjectId) {        
    }
}

