import { IFullPayloadAssignment, ITrackedAssignment, ITrackedVoyage } from "../datacore/voyage";
import { TrackedCrew, TrackedVoyage } from "../models/Tracked";
import { makeSql } from "../sequelize";
import { ErrorType, MAX_VOYAGES, MultiTrackerPostResult, RepairType, TrackerPostResult, VoyageTrackerBase } from "../abstract/voyagetracker";

export class VoyageTracker extends VoyageTrackerBase {

    protected async getLastInsertId(dbid: number): Promise<number> {
        let res: TrackedVoyage[] | null = null;

        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            let result = await repo.max('id');
            return result as number || 0;
            // sql?.close();
        }

        return 0;
    }

    protected async repairAccount(dbid: number, force?: boolean): Promise<RepairType | ErrorType> {
        const result: RepairType = {
            duplicate_voyages_removed: 0,
            voyage_tracker_ids_corrected: 0,
            assigment_voyage_ids_corrected: 0,
            assigment_tracker_ids_corrected: 0,
            voyages_trimmed: 0,
            max_voyages: MAX_VOYAGES
        };

        interface CompareOpts {
            omitTrackerId?: boolean,
            omitVoyageId?: boolean,
            omitCreatedAt?: boolean,
        }

        function compareVoyages(voyage1: ITrackedVoyage, voyage2: ITrackedVoyage, opts?: CompareOpts) {
            opts ??= {};
            const { omitCreatedAt, omitTrackerId, omitVoyageId } = opts;

            if (!omitTrackerId && voyage1.tracker_id !== voyage2.tracker_id) return false;
            if (!omitVoyageId && voyage1.voyage_id !== voyage2.voyage_id) return false;
            if (!omitCreatedAt && voyage1.created_at !== voyage2.created_at) return false;
            if (voyage1.skills.primary_skill !== voyage2.skills.primary_skill) return false;
            if (voyage1.skills.secondary_skill !== voyage2.skills.secondary_skill) return false;
            if (voyage1.ship_trait !== voyage2.ship_trait) return false;
            if (voyage1.estimate.dilemma.chance !== voyage2.estimate.dilemma.chance) return false;
            if (voyage1.estimate.dilemma.hour !== voyage2.estimate.dilemma.hour) return false;
            if (voyage1.estimate.median !== voyage2.estimate.median) return false;
            if (voyage1.estimate.minimum !== voyage2.estimate.minimum) return false;
            if (voyage1.estimate.moonshot !== voyage2.estimate.moonshot) return false;
            if (voyage1.ship !== voyage2.ship) return false;
            if (voyage1.max_hp !== voyage2.max_hp) return false;
            for (let agg of ['command_skill', 'science_skill', 'diplomacy_skill', 'security_skill', 'medicine_skill', 'engineering_skill']) {
                if (!voyage1.skill_aggregates[agg] && !voyage2.skill_aggregates[agg]) continue;
                else if (!voyage1.skill_aggregates[agg] || !voyage2.skill_aggregates[agg]) return false;

                if (voyage1.skill_aggregates[agg].core !== voyage2.skill_aggregates[agg].core) return false;
                if (voyage1.skill_aggregates[agg].range_min !== voyage2.skill_aggregates[agg].range_min) return false;
                if (voyage1.skill_aggregates[agg].range_max !== voyage2.skill_aggregates[agg].range_max) return false;
            }
            return true;
        }

        try {
            const sql = await makeSql(dbid, false, true);
            if (sql) {
                const voyrepo = sql.getRepository(TrackedVoyage);

                try {
                    await voyrepo.sync({ alter: true });
                }
                catch (e: any) {
                    if (force) {
                        try {
                            await voyrepo.sync({ alter: true, force: true });
                        }
                        catch (e: any) {
                            return { error: 500, message: "Force sync did not succeed. Contact administrator." };
                        }
                    }
                    else {
                        return { error: 500, message: "Sync did not succeed. Contact administrator." };
                    }
                }

                let res: any[] = [];

                try {
                    [res,] = await sql.query(`SELECT count(*) count from ${voyrepo.tableName};`);
                }
                catch (e: any) {
                    return { error: 500, message: `Attempt to count voyages: ${e}`, };
                }

                let cnt = (res[0] as any)['count'] as number;
                let voyages = await this.getVoyagesByDbid(dbid, cnt);
                if (voyages) {
                    voyages.sort((a, b) => (a.voyageId ?? 0) - (b.voyageId ?? 0));
                    let dupevoys = voyages.filter((fv, i) => !!fv.voyageId && voyages!.findIndex(fi => !!fi.voyageId && !!fv.voyageId && fi.voyageId === fv.voyageId) !== i)?.map(dv => dv.id as number | undefined).filter(f => f !== undefined);

                    voyages.sort((a, b) => b.voyage.voyage_id - a.voyage.voyage_id || b.voyage.tracker_id - a.voyage.tracker_id || b.voyage.created_at - a.voyage.created_at);
                    dupevoys = dupevoys.concat(
                        voyages.filter((fv, i) => voyages!.findIndex(fi => compareVoyages(fi.voyage, fv.voyage, { omitTrackerId: true, omitVoyageId: true, omitCreatedAt: true })) !== i)?.map(dv => dv.id as number | undefined).filter(f => f !== undefined)
                    );
                    if (dupevoys?.length) {
                        dupevoys = [...new Set(dupevoys)];
                        voyages = voyages.filter((fv) => !dupevoys.some(dv => dv == fv.id));

                        result.duplicate_voyages_removed = dupevoys.length;
                        while (dupevoys.length) {
                            let bvs = dupevoys.splice(0, 10);

                            try {
                                await sql.query(`DELETE FROM ${voyrepo.tableName} WHERE ${bvs.map(bv => `id='${bv}'`).join(" OR ")};`);
                            }
                            catch (e: any) {
                                return { error: 500, message: `Attempt to delete duplicate voyages ${bvs.join()}: ${e}`, };
                            }

                        }
                    }

                    voyages.sort((a, b) => b.id - a.id);
                    if (voyages.length > MAX_VOYAGES) {
                        result.voyages_trimmed = voyages.length - MAX_VOYAGES;
                    }

                    voyages.splice(MAX_VOYAGES);
                    let min_id = voyages[voyages.length - 1].id;

                    try {
                        await sql.query(`DELETE FROM ${voyrepo.tableName} WHERE id < '${min_id}';`);
                    }
                    catch (e: any) {
                        return { error: 500, message: `Attempt to delete voyage records with IDs less than ${min_id}: ${e}`, };
                    }

                    for (let voy of voyages) {
                        if (voy.trackerId !== voy.id || voy.voyage.tracker_id !== voy.id) {
                            voy.trackerId = voy.id;
                            voy.voyage.tracker_id = voy.trackerId;
                            result.voyage_tracker_ids_corrected++;
                            await voy.save();
                        }
                    }

                    const assrepo = sql.getRepository(TrackedCrew);

                    try {
                        await assrepo.sync({ alter: true });
                    }
                    catch {
                        await assrepo.sync({ alter: true, force: true });
                    }


                    try {
                        [res,] = await sql.query(`SELECT count(*) count from ${assrepo.tableName};`);
                    }
                    catch (e: any) {
                        return { error: 500, message: `Attempt to count assignments: ${e}`, };
                    }

                    cnt = (res[0] as any)['count'] as number;
                    let assignments = await this.getAssignmentsByDbid(dbid, cnt);
                    if (assignments) {
                        let badvoys = assignments.filter(f => !voyages!.some(v => v.trackerId === f.trackerId)).map(a => a.id! as number);
                        while (badvoys.length) {
                            let bvs = badvoys.splice(0, 10);
                            assignments = assignments?.filter(f => !bvs.includes(f.id));

                            try {
                                await sql.query(`DELETE FROM ${assrepo.tableName} WHERE ${bvs.map(bv => `id='${bv}'`).join(" OR ")};`);
                            }
                            catch (e: any) {
                                return { error: 500, message: `Attempt to delete defunct assignments ${bvs.join()}: ${e}`, };
                            }

                        }
                        for (let ass of assignments) {
                            if (ass.voyageId) {
                                let voy = voyages.find(f => f.voyageId === ass.voyageId);
                                if (voy && voy.trackerId && ass.trackerId !== voy.trackerId) {
                                    ass.trackerId = voy.trackerId;
                                    result.assigment_voyage_ids_corrected++;
                                    await ass.save();
                                }
                                voy = voyages.find(f => f.trackerId === ass.trackerId);
                                if (voy && voy.voyageId && ass.voyageId !== voy.voyageId) {
                                    ass.voyageId = voy.voyageId;
                                    result.assigment_voyage_ids_corrected++;
                                    await ass.save();
                                }
                            }
                        }
                    }
                }
            }
            else {
                return { error: 500, message: "Acquiring voyage database did not succeed. Try again in a few minutes or contact the administrator." };
            }
        }
        catch (e: any) {
            return { error: 500, message: `Database Error, Contact The Administrator: ${e}`, };
        }

        return result;
    }

    protected async getVoyagesByDbid(dbid: number, limit = 10000) {
        let res: TrackedVoyage[] | null = null;

        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            res = await repo.findAll({ where: { dbid }, order: [['updatedAt', 'DESC']], limit });
            for (let r of res) {
                let n = false;
                if (r.voyage.tracker_id !== r.id) {
                    r.voyage.tracker_id = r.id;
                    n = true;
                }
                if (r.trackerId !== r.id) {
                    r.trackerId = r.id;
                    n = true;
                }
                if (n) await r.save();
            }
            // sql?.close();
        }

        return res;
    }

    protected async deleteVoyageByVoyageId(dbid: number, voyageId: number): Promise<boolean> {
        let res: TrackedVoyage[] | null = null;
        let result = false;

        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            res = await repo.findAll({ where: { voyageId } });
            if (res) {
                for (let rec of res) {
                    rec.destroy();
                }
                result = true;
            }

            const crewrepo = sql.getRepository(TrackedCrew);
            let crewres = await crewrepo.findAll({ where: { voyageId } });
            if (crewres) {
                for (let rec of crewres) {
                    rec.destroy();
                }
                result = true;
            }
        }

        return result;
    }

    protected async deleteVoyageByTrackerId(dbid: number, trackerId: number): Promise<boolean> {
        let res: TrackedVoyage[] | null = null;
        let result = false;

        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            res = await repo.findAll({ where: { trackerId } });
            if (res) {
                for (let rec of res) {
                    rec.destroy();
                }
                result = true;
            }

            const crewrepo = sql.getRepository(TrackedCrew);
            let crewres = await crewrepo.findAll({ where: { trackerId } });
            if (crewres) {
                for (let rec of crewres) {
                    rec.destroy();
                }
                result = true;
            }
        }

        return result;
    }

    protected async getVoyagesByTrackerId(dbid: number, trackerId: number) {
        let res: TrackedVoyage[] | null = null;

        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            res = await repo.findAll({ where: { trackerId } });
            // sql?.close();
        }

        return res;
    }

    protected async postOrPutVoyage(
        dbid: number,
        voyage: ITrackedVoyage,
        timeStamp: Date = new Date()
    ): Promise<TrackerPostResult> {
        const sql = await makeSql(dbid);

        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            let result: TrackedVoyage;

            let current = await repo.findOne({ where: { trackerId: voyage.tracker_id } });
            if (current) {
                if (current.voyageId !== voyage.voyage_id) {
                    if (current.voyageId) {
                        return { status: 400 };
                    }
                    else if (!current.voyageId && voyage.voyage_id) {
                        current.voyageId = voyage.voyage_id;
                    }
                }
                current.voyage = voyage;
                current.updatedAt = timeStamp;
                result = await current.save();
            }
            else {
                result = await repo.create({
                    dbid,
                    trackerId: voyage.tracker_id,
                    voyageId: voyage.voyage_id,
                    voyage,
                    timeStamp,
                    updatedAt: timeStamp
                });

                if (result && result.id !== result.trackerId) {
                    result.trackerId = result.id;
                    await result.save();
                }
            }

            // sql?.close();
            return !!result?.id ? { status: 201, inputId: voyage.tracker_id, trackerId: result.id } : { status: 400 };
        }

        return { status: 500 };
    }


    protected async postOrPutTrackedData(
        dbid: number,
        voyage: ITrackedVoyage,
        assignments: IFullPayloadAssignment[],
        timeStamp: Date = new Date()
    ): Promise<TrackerPostResult> {
        const sql = await makeSql(dbid);

        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            let result: TrackedVoyage;
            let inputId = voyage.tracker_id;

            let current: TrackedVoyage | null = null;

            if (inputId) {
                current = await repo.findOne({ where: { trackerId: inputId } });
            }
            if (!current && voyage.voyage_id) {
                current = await repo.findOne({ where: { voyageId: voyage.voyage_id } });
            }

            if (current) {
                if (current.voyageId !== voyage.voyage_id && current.voyageId && voyage.voyage_id) {
                    let correct = await repo.findOne({ where: { voyageId: voyage.voyage_id } });
                    if (correct) {
                        current = correct;
                    }
                }
                current.voyageId = voyage.voyage_id;
                current.trackerId = voyage.tracker_id;
                current.voyage = voyage;
                current.updatedAt = timeStamp;
                result = await current.save();
            }
            else {
                result = await repo.create({
                    dbid,
                    trackerId: voyage.tracker_id,
                    voyageId: voyage.voyage_id,
                    voyage,
                    timeStamp,
                    updatedAt: timeStamp
                });
            }

            if (result && (result.id !== result.trackerId || result.id !== result.voyage.tracker_id)) {
                result.trackerId = result.id;
                result.voyage.tracker_id = result.id;
                await result.save();
            }

            // sql?.close();
            const retval: TrackerPostResult = !!result?.id ? { status: 201, inputId, trackerId: result.id, voyageId: result.voyageId } : { status: 400 };
            if (retval.status === 201 && retval.trackerId) {
                const crewrepo = sql.getRepository(TrackedCrew);
                if (crewrepo) {
                    let current = await crewrepo.findAll({ where: { voyageId: retval.voyageId! as number } });
                    if (current?.length) {
                        for (let rec of current) {
                            rec.destroy();
                        }
                    }

                    for (let assignment of assignments) {
                        assignment.tracker_id = retval.trackerId;
                        let result = await crewrepo.create({
                            dbid,
                            crew: assignment.crew,
                            trackerId: assignment.tracker_id,
                            voyageId: retval.voyageId,
                            assignment,
                            timeStamp,
                        });
                        if (!result?.id) {
                            retval.status = 500;
                            break;
                        }
                    }
                }
            }

            return retval;
        }

        return { status: 500 };
    }

    protected async postOrPutTrackedDataBatch(
        dbid: number,
        voyages: ITrackedVoyage[],
        assignments: IFullPayloadAssignment[][],
        timeStamp: Date = new Date()
    ): Promise<MultiTrackerPostResult> {
        const sql = await makeSql(dbid);

        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            const crewrepo = sql.getRepository(TrackedCrew);
            let idx = 0;
            let results = [] as TrackerPostResult[];
            for (let voyage of voyages) {
                let inputId = voyage.tracker_id;
                let result: TrackedVoyage;
                let current: TrackedVoyage | null = null;

                if (inputId) {
                    current = await repo.findOne({ where: { trackerId: inputId } });
                }
                if (!current && voyage.voyage_id) {
                    current = await repo.findOne({ where: { voyageId: voyage.voyage_id } });
                }

                if (current) {
                    if (current.voyageId !== voyage.voyage_id && current.voyageId && voyage.voyage_id) {
                        let correct = await repo.findOne({ where: { voyageId: voyage.voyage_id } });
                        if (correct) {
                            current = correct;
                        }
                    }
                    current.voyageId = voyage.voyage_id;
                    current.trackerId = voyage.tracker_id;
                    current.voyage = voyage;
                    current.updatedAt = timeStamp;
                    result = await current.save();
                }
                else {
                    result = await repo.create({
                        dbid,
                        trackerId: voyage.tracker_id,
                        voyageId: voyage.voyage_id,
                        voyage,
                        timeStamp,
                        updatedAt: timeStamp
                    });
                }

                if (result && (result.id !== result.trackerId || result.id !== result.voyage.tracker_id)) {
                    result.trackerId = result.id;
                    result.voyage.tracker_id = result.id;
                    await result.save();
                }

                // sql?.close();
                const retval = !!result?.id ? { status: 201, inputId, trackerId: result.id, voyageId: result.voyageId } : { status: 400 };
                if (retval.status === 201 && retval.trackerId) {
                    if (crewrepo) {
                        let current = await crewrepo.findAll({ where: { voyageId: retval.voyageId! as number } });
                        if (current?.length) {
                            for (let rec of current) {
                                rec.destroy();
                            }
                        }

                        for (let assignment of assignments[idx]) {
                            assignment.tracker_id = retval.trackerId;
                            let result = await crewrepo.create({
                                dbid,
                                crew: assignment.crew,
                                trackerId: assignment.tracker_id,
                                voyageId: retval.voyageId,
                                assignment,
                                timeStamp,
                            });
                            if (!result?.id) {
                                retval.status = 500;
                                break;
                            }
                        }
                    }
                }
                idx++;
                results.push(retval);
            };

            return results;
        }

        return [{ status: 500 }];
    }

    protected async getAssignmentsByDbid(dbid: number, limit = 120000) {
        let res: TrackedCrew[] | null = null;

        const sql = await makeSql(dbid);

        if (sql) {
            const repo = sql.getRepository(TrackedCrew);
            res = await repo.findAll({ where: { dbid }, order: [['timeStamp', 'DESC']], limit });
        }

        return res;
    }

    protected async getAssignmentsByTrackerId(dbid: number, trackerId: number) {
        let res: TrackedCrew[] | null = null;

        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedCrew);
            res = await repo.findAll({ where: { trackerId } });
            // sql?.close();
        }

        return res;
    }

    protected async postOrPutAssignment(
        dbid: number,
        crew: string,
        assignment: ITrackedAssignment,
        timeStamp: Date = new Date()
    ) {
        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedCrew);
            let result = await repo.create({
                dbid,
                crew,
                trackerId: assignment.tracker_id,
                assignment,
                timeStamp,
            });
            // sql?.close();

            return !!result?.id ? 201 : 400;
        }

        return 500;
    }

    protected async postOrPutAssignmentsMany(
        dbid: number,
        crew: string[],
        assignments: ITrackedAssignment[],
        timeStamp: Date = new Date()
    ) {
        let result = true;
        const newdata = [] as any[];
        let x = 0;

        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedCrew);
            for (let crewMember of crew) {
                let assignment = assignments[x++];
                newdata.push({
                    dbid,
                    crew: crewMember,
                    trackerId: assignment.tracker_id,
                    assignment,
                    timeStamp,
                });
            }

            try {
                result = !!(await repo.bulkCreate(newdata));
            } catch (err: any) {
                console.log(err);
            }

            // sql?.close();
            result &&= !!newdata;
            return result ? 201 : 400;
        }

        return 500;
    }
}

export let VoyageTrackerAPI = new VoyageTracker();