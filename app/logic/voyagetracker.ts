
import { ITrackedAssignment, ITrackedVoyage } from "../datacore/voyage";
import { TrackedCrew, TrackedVoyage } from "../models/Tracked";
import { makeSql } from "../sequelize";

export async function getVoyagesByDbid_sqlite(dbid: number) {
    let res: TrackedVoyage[] | null = null;

    const sql = await makeSql(dbid);        
    if (sql) {
        const repo = sql.getRepository(TrackedVoyage);
        res = await repo.findAll({ where: { dbid }});
        // sql?.close();
    }

    return res;
}

export async function getVoyagesByTrackerId_sqlite(dbid: number, trackerId: number) {
    let res: TrackedVoyage[] | null = null;

    const sql = await makeSql(dbid);        
    if (sql) {        
        const repo = sql.getRepository(TrackedVoyage);
        res = await repo.findAll({ where: { trackerId }});
        // sql?.close();
    }

    return res;
}

export async function postOrPutVoyage_sqlite(
    dbid: number, 
    voyage: ITrackedVoyage,
    timeStamp: Date = new Date()) {

    const sql = await makeSql(dbid);

    if (sql) {
        const repo = sql.getRepository(TrackedVoyage);
        let result = await repo.create({ 
            dbid,
            trackerId: voyage.tracker_id,
            voyage,
            timeStamp
        })
        // sql?.close();
    
        return !!(result?.id) ? 201 : 400;
    }

    return 500;
}

export async function getAssignmentsByDbid_sqlite(dbid: number) {
    let res: TrackedCrew[] | null = null;

    const sql = await makeSql(dbid);
    
    if (sql) {
        const repo = sql.getRepository(TrackedCrew);
        res = await repo.findAll({ where: { dbid }});        
    }

    return res;
}

export async function getAssignmentsByTrackerId_sqlite(dbid: number, trackerId: number) {
    let res: TrackedCrew[] | null = null;

    const sql = await makeSql(dbid);
    if (sql) {
        const repo = sql.getRepository(TrackedCrew);
        res = await repo.findAll({ where: { trackerId }});
        // sql?.close();
    }

    return res;
}

export async function postOrPutAssignment_sqlite(
    dbid: number, 
    crew: string,
    assignment: ITrackedAssignment,
    timeStamp: Date = new Date()) {

    const sql = await makeSql(dbid);
    if (sql) {
        const repo = sql.getRepository(TrackedCrew);
        let result = await repo.create({ 
            dbid,                
            crew,     
            trackerId: assignment.tracker_id,
            assignment,
            timeStamp
        })
        // sql?.close();
        
        return !!(result?.id) ? 201 : 400;
    }

    return 500;
}

export async function postOrPutAssignmentsMany_sqlite(
    dbid: number, 
    crew: string[],
    assignments: ITrackedAssignment[],
    timeStamp: Date = new Date()) {
    
    let result = true;
    const newdata = [] as any[];
    let x = 0;

    const sql = await makeSql(dbid);
    if (sql) {
        const repo = sql.getRepository(TrackedCrew);
        for (let crewMember of crew) {
            let assignment  = assignments[x++];
            newdata.push({ 
                dbid,
                crew: crewMember,     
                trackerId: assignment.tracker_id,
                assignment,
                timeStamp
            });
            
        }
        
        try {
            result = !!await repo.bulkCreate(newdata);
        }
        catch (err: any) {
            console.log(err);
        }

        // sql?.close();    
        result &&= !!newdata;
        return result ? 201 : 400;
    }

    return 500;
}
