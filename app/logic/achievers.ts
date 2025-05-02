import fs from 'fs';
import { Achiever, CapAchievers } from '../datacore/crew';

require('dotenv').config();

const CLIENT_API_VERSION = 26;

class CapAchieversClass {
    readonly STATS_PATH: string;
    readonly ACHIEVER_FILE: string;

    lastRefresh = undefined as Date | undefined;
    currentData: Achiever[] | null = null;

    public get isCurrent(): boolean {
        if (!this.lastRefresh) return false;
        let now = new Date();
        return now.getDate() === this.lastRefresh.getDate() && (Math.abs(now.getMinutes() - this.lastRefresh.getMinutes()) < 15);
    }

    constructor() {
        this.STATS_PATH = `${process.env.PROFILE_DATA_PATH}/stats/`;
        this.ACHIEVER_FILE = `${this.STATS_PATH}cap_achievers.json`

        if (!fs.existsSync(this.STATS_PATH)) {
            fs.mkdirSync(this.STATS_PATH);
        }

        if (fs.existsSync(this.ACHIEVER_FILE)) {
            this.lastRefresh = fs.statSync(this.ACHIEVER_FILE).mtime;
            try {
                this.currentData = JSON.parse(fs.readFileSync(this.ACHIEVER_FILE, 'utf-8'));
            }
            catch {
                this.currentData = null;
            }
        }
    }

    private async remoteFetchCapAchievers(access_token: string) {
        try {
            console.log("Loading Cap Achievers ...");

            let response = await fetch(`https://app.startrektimelines.com/crew/cap_achievers?access_token=${access_token}&client_api=${CLIENT_API_VERSION}`);

            if (!response.ok) return null;
            let capdata: CapAchievers = await response.json();

            if (capdata.achievers?.length) {

                console.log(`Cap Achievers loaded, ${capdata.achievers.length} items discovered ...`);

                return capdata.achievers;
            } else {
                return undefined;
            }
        } catch (err) {
            //console.error(err);
        }
        return undefined;
    }

    public async getCapAchievers(access_token: string): Promise<Achiever[] | null> {
        if (!this.currentData || !this.lastRefresh || !this.isCurrent) {
            return await this.refreshCapAchievers(access_token);
        }
        else {
            return this.currentData;
        }
    }

    public async refreshCapAchievers(access_token: string) {
        if (!fs.existsSync(this.STATS_PATH)) {
            fs.mkdirSync(this.STATS_PATH);
        }

        let achievers = await this.remoteFetchCapAchievers(access_token);

        try {
            if (achievers) {
                let achiver_file = this.ACHIEVER_FILE;
                fs.writeFileSync(achiver_file, JSON.stringify(achievers));
                this.lastRefresh = new Date();
                this.currentData = achievers;
                return achievers;
            }
            else if (fs.existsSync(this.ACHIEVER_FILE)) {
                this.currentData = JSON.parse(fs.readFileSync(this.ACHIEVER_FILE, 'utf-8'));
                this.lastRefresh = fs.statSync(this.ACHIEVER_FILE).mtime;
            }
            else {
                this.lastRefresh = undefined;
            }

            this.currentData = null;
            return null;
        }
        catch {
            try {
                if (achievers) {
                    this.lastRefresh = new Date();
                }
                return achievers ?? null;
            }
            catch {
                return null;
            }
        }
    }
}


export let AchieverAPI = new CapAchieversClass();