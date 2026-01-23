import { apiResult } from "../logic";
import { IPlayerResourceRecord } from "../models/PlayerResources";


export abstract class PlayerResourceBase {

    public async postPlayerResourcesBatch(dbid: number, resources: IPlayerResourceRecord[]) {
        try {
            let res = await this.postResourcesBatch(dbid, resources);
            if (res === 200) {
                return apiResult({ result: "ok" });
            }
            else {
                return apiResult({ result: "fail" }, res);
            }
        }
        catch (err) {
            return apiResult({ error: err?.toString() }, 500);
        }
    }

    public async postPlayerResources(dbid: number, resources: {[key:string]: number}) {
        try {
            let res = await this.postResources({
                dbid,
                timestamp: new Date(),
                resources
            });
            if (res === 200) {
                return apiResult({ result: "ok" });
            }
            else {
                return apiResult({ result: "fail" }, res);
            }
        }
        catch (err) {
            return apiResult({ error: err?.toString() }, 500);
        }
    }

    public async getPlayerResources(dbid: number, startDate?: Date, endDate?: Date) {
        try {
            if (startDate) {
                startDate = new Date(startDate);
            }
            if (endDate) {
                endDate = new Date(endDate);
            }
            let res = await this.getResources(dbid, startDate, endDate);
            if (typeof res === 'number') {
                return apiResult({ result: 'fail' }, res);
            }
            else {
                return apiResult(res);
            }
        }
        catch (err) {
            return apiResult({ error: err?.toString() }, 500);
        }
    }

    public async repairPlayerResources(dbid: number) {
        try {
            let res = await this.repairResources(dbid);
            if (res !== 200) {
                return apiResult({ result: 'fail' }, res);
            }
            else {
                return apiResult({ result: 'ok' }, res);
            }
        }
        catch (err) {
            return apiResult({ error: err?.toString() }, 500);
        }
    }

    public async clearPlayerResources(dbid: number) {
        try {
            let res = await this.clearResources(dbid);
            if (res !== 200) {
                return apiResult({ result: 'fail' }, res);
            }
            else {
                return apiResult({ result: 'ok' }, res);
            }
        }
        catch (err) {
            return apiResult({ error: err?.toString() }, 500);
        }
    }

    protected abstract postResourcesBatch(dbid: number, records: IPlayerResourceRecord[]): Promise<number>;

    protected abstract postResources(record: IPlayerResourceRecord): Promise<number>;

    protected abstract getResources(dbid: number, startDate?: Date, endDate?: Date): Promise<IPlayerResourceRecord[] | number>;

    protected abstract repairResources(dbid: number): Promise<number>;

    protected abstract clearResources(dbid: number): Promise<number>;
}