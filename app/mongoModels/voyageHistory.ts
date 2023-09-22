import { ObjectId } from "mongodb";
import { ITrackedAssignment, ITrackedVoyage, IVoyageHistory } from "../datacore/voyage";

export class TrackedVoyage {
    constructor(public dbid: number, public trackerId: number, public voyageId: number,public voyage: ITrackedVoyage, public timeStamp: Date = new Date(), public id?: ObjectId) {        
    }
}

export class TrackedAssignment {
    constructor(public dbid: number, public crew: string, public trackerId: number, public assignment: ITrackedAssignment, public timeStamp: Date = new Date(), public id?: ObjectId) {        
    }
}


