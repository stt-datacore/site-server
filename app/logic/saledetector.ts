import { PlayerData } from '../datacore/player';
import { BeamableStoreRoot } from '../models/beamable';
import { getBeamableStore } from './stttools';

require('dotenv').config();

const CLIENT_API_VERSION = 33;


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
        if (!player) return null;
        let beamable = await this.loadStoreCrewOffers(access_token, player.player.dbid);
        if (beamable === null) return null;
        let offers = beamable.stores.map(store => store.listings).reduce((p, n) => p.concat(n), [].slice());
        try {
            if (offers) {
                this._honorSale = offers.some(offer => offer.symbol?.startsWith("honor_tp_large_pack_listing"));
                if (this._honorSale) console.log("Honor sale detected!");
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

    private async loadStoreCrewOffers(access_token: string, dbid: number): Promise<BeamableStoreRoot | null> {
        console.log("Loading Offers From Beamable ...");
        let store = await getBeamableStore(dbid, access_token);
        if (store) console.log("Beamable store loaded!");
        return store;
    }

}


export let SaleDetectorAPI = new SaleDetector();