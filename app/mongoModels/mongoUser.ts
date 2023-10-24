import { ObjectId } from "mongodb";
import { PlayerData } from "../datacore/player";
import { UserRole } from "../models/User";
import { PlayerProfile } from "./playerProfile";

export class User {
    constructor(        
        public discordUserName: string,
        public discordUserDiscriminator: string,
        public discordUserId: string,
        public profiles: number[],
        public userRole: UserRole = UserRole.NORMAL,
        public creationDate: Date = new Date(),
        public avatar?: string,
        public id?: ObjectId) {
    }    
}


