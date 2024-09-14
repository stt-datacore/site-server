import { ITrackedAssignment, ITrackedVoyage } from "../datacore/voyage";
import { TrackedCrew, TrackedVoyage } from "../models/Tracked";
import { makeSql } from "../sequelize";
import { TrackerPostResult, VoyageTrackerBase } from "../abstract/voyagetracker";

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


    protected async getVoyagesByDbid(dbid: number) {
        let res: TrackedVoyage[] | null = null;

        const sql = await makeSql(dbid);
        if (sql) {
            const repo = sql.getRepository(TrackedVoyage);
            res = await repo.findAll({ where: { dbid } });
            // sql?.close();
        }

        return res;
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

    protected async getAssignmentsByDbid(dbid: number) {
        let res: TrackedCrew[] | null = null;

        const sql = await makeSql(dbid);

        if (sql) {
            const repo = sql.getRepository(TrackedCrew);
            res = await repo.findAll({ where: { dbid } });
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