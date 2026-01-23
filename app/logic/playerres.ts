import { Op } from "sequelize";
import { PlayerResourceBase } from "../abstract/playerres";
import { IPlayerResourceRecord, PlayerResourceRecord } from "../models/PlayerResources";
import { makeSql } from "../sequelize";

export class PlayerResources extends PlayerResourceBase {

    protected async postResourcesBatch(dbid: number, records: IPlayerResourceRecord[]): Promise<number> {
        if (!records?.length || !Array.isArray(records)) return 400;
        let sql = await makeSql(dbid, false);
        if (sql) {
            for (let record of records) {
                const repo = sql.getRepository(PlayerResourceRecord);
                let rec = await repo.findOne({ where: {
                    dbid: record.dbid,
                    timestamp: new Date(record.timestamp)
                }});
                if (rec) {
                    rec.resources = record.resources;
                    await rec.save();
                    continue;
                }
                rec = await repo.create();
                rec.timestamp = new Date();
                rec.dbid = record.dbid;
                rec.resources = record.resources;
                let res = await rec.save();
                if (!res) return 500;
            }
            return 200;
        }
        return 500;
    }

    protected async postResources(record: IPlayerResourceRecord): Promise<number> {
        if (!record || Array.isArray(record)) return 400;
        let sql = await makeSql(record.dbid, false);
        if (sql) {
            const repo = sql.getRepository(PlayerResourceRecord);
            let rec = await repo.findOne({ where: {
                dbid: record.dbid,
                timestamp: new Date(record.timestamp)
            }});
            if (rec) {
                rec.resources = record.resources;
                await rec.save();
                return 200;
            }
            rec = await repo.create();
            rec.timestamp = new Date();
            rec.dbid = record.dbid;
            rec.resources = record.resources;
            let res = await rec.save();
            return 200;
        }
        return 500;
    }

    protected async getResources(dbid: number, startDate?: Date, endDate?: Date): Promise<IPlayerResourceRecord[] | number> {
        let sql = await makeSql(dbid, false);

        if (!startDate) {
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 365);
        }
        endDate ??= new Date();
        if (sql) {
            const repo = sql.getRepository(PlayerResourceRecord);
            const current = await repo.findAll({
                where: {
                    dbid,
                    timestamp: {
                        [Op.and]: [
                            { [Op.gte]: startDate },
                            { [Op.lte]: endDate }
                        ]
                    }
                }
            });
            if (current?.length) {
                let response = [] as IPlayerResourceRecord[];
                for (let obj of current) {
                    if (!Array.isArray(obj.resources)) {
                        response.push(obj);
                    }
                    else {
                        response = response.concat(obj.resources as any);
                    }
                }
                return response.filter((r, i) => response.findIndex(r2 => (new Date(r.timestamp)).getTime() === (new Date(r2.timestamp)).getTime()) === i);
            }
            else {
                return 404;
            }
        }
        return 500;
    }

    protected async repairResources(dbid: number): Promise<number> {
        let sql = await makeSql(dbid, false);
        if (sql) {
            const repo = sql.getRepository(PlayerResourceRecord);
            const current = await repo.findAll({
                where: {
                    dbid
                }
            });
            const toDestroy = [] as PlayerResourceRecord[];
            let toAdd = [] as PlayerResourceRecord[];

            if (current?.length) {
                for (let obj of current) {
                    if (Array.isArray(obj.resources)) {
                        toDestroy.push(obj);
                        toAdd = toAdd.concat(obj.resources as any);
                    }
                }
                if (toDestroy.length && repo.sequelize) {
                    await repo.destroy({
                        where: { [Op.or]: toDestroy.map(td => ({ id: td.id })) }
                    });
                    await repo.sequelize.query("VACUUM;");
                }
                if (toAdd.length) {
                    toAdd = toAdd.filter((r, i) => toAdd.findIndex(r2 => (new Date(r.timestamp)).getTime() === (new Date(r2.timestamp)).getTime()) === i);
                    await this.postResourcesBatch(dbid, toAdd);
                }
                return 200;
            }
            else {
                return 404;
            }
        }
        return 500;
    }

    protected async clearResources(dbid: number): Promise<number> {
        let sql = await makeSql(dbid, false);
        if (sql) {
            const repo = sql.getRepository(PlayerResourceRecord);
            await repo.destroy({
                where: {
                    dbid
                }
            });
            return 200;
        }
        return 500;
    }


}

export let PlayerResourcesAPI = new PlayerResources();