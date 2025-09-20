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
    lastRefresh = undefined as Date | undefined;
    saleData: SaleData | null = null;

    private _slotCost = 250000;
    private _slotPerCost = 5;
    private _honorSale = false;

    public get isCurrent(): boolean {
        if (!this.lastRefresh) return false;
        let now = new Date();
        return now.getDate() === this.lastRefresh.getDate() && (Math.abs(now.getMinutes() - this.lastRefresh.getMinutes()) < 30);
    }

    constructor() {
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

    public async getOrRefreshSaleData(access_token: string): Promise<SaleData | null> {
        if (!this.saleData || !this.lastRefresh || !this.isCurrent) {
            return await this.refreshData(access_token);
        }
        else {
            return this.saleData;
        }
    }

    public async getSaleData(access_token: string): Promise<SaleData | null> {
        await this.getOrRefreshSaleData(access_token);
        return this.saleData;
    }

    public async refreshData(access_token: string) {
        console.log("Refresh Sale Data ...");
        let player = await this.remoteFetchPlayerData(access_token);
        let offers = await this.loadStoreCrewOffers(access_token);
        try {
            if (offers) {
                this._honorSale = offers.some(offer => offer.primary_content?.some(pc => pc.symbol?.startsWith("honor_tp_large_pack_listing")));
            }
            if (player) {
                this._slotCost = player?.player?.character?.next_crew_limit_increase_cost?.amount || 250000;
                this._slotPerCost = player?.player?.character?.crew_limit_increase_per_purchase || 5;
                this.saleData = {
                    honor_sale: this._honorSale,
                    slot_sale: this._slotCost < 250000
                };
                this.lastRefresh = new Date();
                return this.saleData;
            }
            else {
                this.lastRefresh = undefined;
            }
            return null;
        }
        catch {
            try {
                if (player) {
                    this.lastRefresh = new Date();
                }
                return this.saleData ?? null;
            }
            catch {
                return null;
            }
        }
    }

    private async loadStoreCrewOffers(access_token: string): Promise<Offer[] | undefined> {
        console.log("Loading Offers ...");
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