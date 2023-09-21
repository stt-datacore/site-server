

import { ObjectId } from "mongodb";

export default class PlayerProfile {
    constructor(public dbid: string, public playerJson: string, public timeStamp: Date, public id?: ObjectId) {

    }
    
}