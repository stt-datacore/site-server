import { Op } from "sequelize";
import { PlayerResourceBase } from "../abstract/playerres";
import { IPlayerResourceRecord, PlayerResourceRecord } from "../models/PlayerResources";
import { makeSql } from "../sequelize";

export class PlayerResources extends PlayerResourceBase {
    protected async postResources(record: IPlayerResourceRecord): Promise<number> {
        let sql = await makeSql(record.dbid, false);
        if (sql) {
            const repo = sql.getRepository(PlayerResourceRecord);
            const rec = await repo.create();
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
                return current;
            }
            else {
                return 404;
            }
        }
        return 500;
    }

}

export let PlayerResourcesAPI = new PlayerResources();