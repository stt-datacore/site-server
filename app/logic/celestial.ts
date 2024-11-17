import fs from 'fs';

require('dotenv').config();

const CLIENT_API_VERSION = 24;

export interface CelestialMarketData {
    action: 'ephemeral';
    root: {
        aggregation: MarketAggregation;
    }
}

export type MarketAggregation = {
    [key: string]: MarketListing;
};

export interface MarketListing {
    sold_last_day: number;
    buy_count: number;
    sell_count: number;
    high: number;
    low: number;
    wishlisted?: boolean;
    last_price: number;
    count_at_low: number;
}

class CelestialMarket {
    readonly STATS_PATH: string;
    readonly MARKET_FILE: string;

    lastRefresh = undefined as Date | undefined;
    currentData: MarketAggregation | null = null;

    public get isCurrent(): boolean {
        if (!this.lastRefresh) return false;
        let now = new Date();
        return (now.getHours() - this.lastRefresh.getHours() <= 1);
    }

    constructor() {
        this.STATS_PATH = `${process.env.PROFILE_DATA_PATH}/stats/`;
        this.MARKET_FILE = `${this.STATS_PATH}keystone_market_data.json`

        if (!fs.existsSync(this.STATS_PATH)) {
            fs.mkdirSync(this.STATS_PATH);
        }

        if (fs.existsSync(this.MARKET_FILE)) {
            this.lastRefresh = fs.statSync(this.MARKET_FILE).mtime;
            this.currentData = JSON.parse(fs.readFileSync(this.MARKET_FILE, 'utf-8'));
        }
    }

    private async remoteFetchCelestialMarket(access_token: string) {
        try {
            console.log("Loading Celestial Market ...");

            let response = await fetch(`https://app.startrektimelines.com/marketplace/aggregate_order_details?access_token=${access_token}&client_api=${CLIENT_API_VERSION}`);

            if (!response.ok) return null;
            let market: CelestialMarketData = await response.json();

            if (market.root?.aggregation) {
                let ids = Object.keys(market.root.aggregation);
                console.log(`Market loaded ${ids.length} items listed ...`);
                for (let id of ids) {
                    delete market.root.aggregation[id].wishlisted;
                }
                return market;
            } else {
                return undefined;
            }
        } catch (err) {
            //console.error(err);
        }
        return undefined;
    }

    public async getCelestialMarket(access_token: string): Promise<MarketAggregation | null> {
        if (!this.currentData || !this.lastRefresh || !this.isCurrent) {
            return await this.refreshCelestialMarket(access_token);
        }
        else {
            return this.currentData;
        }
    }

    public async refreshCelestialMarket(access_token: string) {
        if (!fs.existsSync(this.STATS_PATH)) {
            fs.mkdirSync(this.STATS_PATH);
        }

        let market = await this.remoteFetchCelestialMarket(access_token);

        try {
            if (market) {
                let keystonemarket = market.root.aggregation;
                let market_file = this.MARKET_FILE;
                fs.writeFileSync(market_file, JSON.stringify(keystonemarket));
                this.lastRefresh = new Date();
                this.currentData = keystonemarket;
                return keystonemarket;
            }
            else if (fs.existsSync(this.MARKET_FILE)) {
                this.currentData = JSON.parse(fs.readFileSync(this.MARKET_FILE, 'utf-8'));
                this.lastRefresh = fs.statSync(this.MARKET_FILE).mtime;
            }
            else {
                this.lastRefresh = undefined;
            }

            this.currentData = null;
            return null;
        }
        catch {
            try {
                if (market) {
                    this.lastRefresh = new Date();
                }
                return market?.root.aggregation ?? null;
            }
            catch {
                return null;
            }
        }
    }
}


export let CelestialAPI = new CelestialMarket();