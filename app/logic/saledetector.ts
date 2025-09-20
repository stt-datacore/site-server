import fs from 'fs';
import { PlayerData } from '../datacore/player';
import { OffersRoot, Offer } from '../datacore/offers';
import { ApiResult, CLIENT_API } from './api';
import { LogData, Logger } from './logger';

require('dotenv').config();

const CLIENT_API_VERSION = 27;


export interface SaleData {
    honor_sale: boolean;
    slot_sale: boolean;
}

class SaleDetector {
    readonly STATS_PATH: string;
    readonly DATA_FILE: string;

    lastRefresh = undefined as Date | undefined;

    offers: Offer[] | null = null;
    playerData: PlayerData | null = null;
    saleData: SaleData | null = null;

    public get slotCost(): number {
        return this.playerData?.player?.character?.next_crew_limit_increase_cost?.amount || 250000;
    }

    public get slotsPerCost(): number {
        return this.playerData?.player?.character?.crew_limit_increase_per_purchase || 5;
    }

    public get isCurrent(): boolean {
        if (!this.lastRefresh) return false;
        let now = new Date();
        return now.getDate() === this.lastRefresh.getDate() && (Math.abs(now.getMinutes() - this.lastRefresh.getMinutes()) < 30);
    }

    constructor() {
        this.STATS_PATH = `${process.env.PROFILE_DATA_PATH}/stats/`;
        this.DATA_FILE = `${this.STATS_PATH}reference_player.json`

        if (!fs.existsSync(this.STATS_PATH)) {
            fs.mkdirSync(this.STATS_PATH);
        }

        if (fs.existsSync(this.DATA_FILE)) {
            this.lastRefresh = fs.statSync(this.DATA_FILE).mtime;
            try {
                this.playerData = JSON.parse(fs.readFileSync(this.DATA_FILE, 'utf-8'));
            }
            catch {
                this.playerData = null;
            }
        }
    }

    private async remoteFetchPlayerData(access_token: string) {
        try {
            console.log("Loading Reference Player Data ...");

            let response = await fetch(`https://app.startrektimelines.com/player?access_token=${access_token}&client_api=${CLIENT_API_VERSION}`);

            if (!response.ok) return null;
            let player: PlayerData = await response.json();

            if (player) {
                return player;
            } else {
                return undefined;
            }
        } catch (err) {
            //console.error(err);
        }
        return undefined;
    }

    public async getPlayerData(access_token: string): Promise<PlayerData | null> {
        if (!this.playerData || !this.lastRefresh || !this.isCurrent) {
            return await this.refreshData(access_token);
        }
        else {
            return this.playerData;
        }
    }

    public async getSaleData(access_token: string): Promise<SaleData | null> {
        await this.getPlayerData(access_token);
        if (!this.playerData || !this.offers) return null;
        const output: SaleData = {
            slot_sale: this.slotCost < 250000,
            honor_sale: this.offers.some(offer => offer.primary_content?.some(pc => pc.symbol?.startsWith("honor_tp_large_pack_listing")))
        }
        return output;
    }

    public async refreshData(access_token: string) {
        if (!fs.existsSync(this.STATS_PATH)) {
            fs.mkdirSync(this.STATS_PATH);
        }
        let player = await this.remoteFetchPlayerData(access_token);
        let offers = await this.loadStoreCrewOffers(access_token);
        try {
            if (offers) {
                this.offers = offers;
            }
            if (player) {
                let playerData = player;
                let player_file = this.DATA_FILE;
                fs.writeFileSync(player_file, JSON.stringify(playerData));
                this.lastRefresh = new Date();
                this.playerData = playerData;
                return playerData;
            }
            else if (fs.existsSync(this.DATA_FILE)) {
                this.playerData = JSON.parse(fs.readFileSync(this.DATA_FILE, 'utf-8'));
                this.lastRefresh = fs.statSync(this.DATA_FILE).mtime;
            }
            else {
                this.lastRefresh = undefined;
            }

            this.playerData = null;
            return null;
        }
        catch {
            try {
                if (player) {
                    this.lastRefresh = new Date();
                }
                return player ?? null;
            }
            catch {
                return null;
            }
        }
    }

    private async loadStoreCrewOffers(access_token: string): Promise<Offer[] | undefined> {
        let response: OffersRoot[] = await fetch(
            `https://app.startrektimelines.com/commerce/store_layout_v2/crew?access_token=${access_token}&client_api=${CLIENT_API}`
        ).then(res => res.json());
        let reply: Offer[] | undefined = undefined;
        if (response) {
            let content = response.find((r: any) => r.symbol === 'crew')!;
            let limitedTimeOffers = content.grids!.filter((offer) => {
                return offer?.primary_content[0].offer?.seconds_remain > 0
            });
            reply = limitedTimeOffers
        }
        return reply;
    }

}


export let SaleDetectorAPI = new SaleDetector();