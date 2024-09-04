import { ITrackedAssignment, ITrackedVoyage } from "../datacore/voyage";
import { TrackedCrew, TrackedVoyage } from "../models/Tracked";

import { Logger, LogData } from "../logic/logger";

import { ApiResult } from "../logic/api";

export interface TrackerPostResult {
    status: number;
    inputId?: any;
    trackerId?: any;
}

export abstract class VoyageTrackerBase {

    async postTrackedVoyage(
        dbid: number,
        voyage: ITrackedVoyage,
        logData: LogData
    ): Promise<ApiResult> {
        Logger.info("Tracked Voyage data", { dbid, voyage, logData });

        const timeStamp = new Date();
        let res: TrackerPostResult | null = null;

        try {
            res = await this.postOrPutVoyage(dbid, voyage, timeStamp);
            if (!res || res.status >= 300) {
                return {
                    Status: res?.status ?? 500,
                    Body: {
                        dbid: dbid,
                        error: "Unable to insert record.",
                        timeStamp: timeStamp.toISOString(),
                    },
                };
            }
        } catch (err) {
            if (typeof err === "string") {
                return {
                    Status: 500,
                    Body: err,
                };
            } else if (err instanceof Error) {
                return {
                    Status: 500,
                    Body: err.toString(),
                };
            }
        }

        return {
            Status: 201,
            Body: {
                dbid: dbid,
                trackerId: res!.trackerId,
                inputId: res!.inputId,
                timeStamp: timeStamp.toISOString(),
            },
        };

    }

    async getTrackedVoyages(
        dbid?: number,
        trackerId?: number
    ): Promise<ApiResult> {
        Logger.info("Get voyage data", { dbid, trackerId });
        let voyages: TrackedVoyage[] | null = null;

        if (!dbid && !trackerId)
            return {
                Status: 400,
                Body: { result: "bad input" },
            };

        if (!dbid)
            return {
                Status: 400,
                Body: { result: "bad input" },
            };

        try {
            if (trackerId) {
                voyages = trackerId
                    ? await this.getVoyagesByTrackerId(dbid, trackerId)
                    : null;
            } else {
                voyages = await this.getVoyagesByDbid(dbid);
            }
        } catch (err) {
            if (typeof err === "string") {
                return {
                    Status: 500,
                    Body: err,
                };
            } else if (err instanceof Error) {
                return {
                    Status: 500,
                    Body: err.toString(),
                };
            }
        }

        if (voyages) {
            return {
                Status: 200,
                Body: voyages,
            };
        } else {
            return {
                Status: 200, // 204
                Body: [],
            };
        }
    }

    async postTrackedAssignment(
        dbid: number,
        crew: string,
        assignment: ITrackedAssignment,
        logData: LogData
    ): Promise<ApiResult> {
        Logger.info("Tracked Voyage data", { dbid, voyage: assignment, logData });

        const timeStamp = new Date();

        try {
            let res = await this.postOrPutAssignment(
                dbid,
                crew,
                assignment,
                timeStamp
            );
            if (res >= 300) {
                return {
                    Status: res,
                    Body: {
                        dbid: dbid,
                        error: "Unable to insert record.",
                        timeStamp: timeStamp.toISOString(),
                    },
                };
            }
        } catch (err) {
            if (typeof err === "string") {
                return {
                    Status: 500,
                    Body: err,
                };
            } else if (err instanceof Error) {
                return {
                    Status: 500,
                    Body: err.toString(),
                };
            }
        }

        return {
            Status: 201,
            Body: {
                dbid: dbid,
                trackerId: assignment.tracker_id,
                timeStamp: timeStamp.toISOString(),
            },
        };
    }

    async postTrackedAssignmentsMany(
        dbid: number,
        crew: string[],
        assignments: ITrackedAssignment[],
        logData: LogData
    ): Promise<ApiResult> {
        Logger.info("Tracked Voyage data", { dbid, voyage: assignments, logData });

        const timeStamp = new Date();

        try {
            let res = await this.postOrPutAssignmentsMany(
                dbid,
                crew,
                assignments,
                timeStamp
            );
            if (res >= 300) {
                return {
                    Status: res,
                    Body: {
                        dbid: dbid,
                        error: "Unable to insert record.",
                        timeStamp: timeStamp.toISOString(),
                    },
                };
            }
        } catch (err) {
            if (typeof err === "string") {
                return {
                    Status: 500,
                    Body: err,
                };
            } else if (err instanceof Error) {
                return {
                    Status: 500,
                    Body: err.toString(),
                };
            }
        }

        return {
            Status: 201,
            Body: {
                dbid: dbid,
                trackerIds: assignments.map((a) => a.tracker_id),
                timeStamp: timeStamp.toISOString(),
            },
        };
    }

    async getTrackedAssignments(
        dbid?: number,
        trackerId?: number
    ): Promise<ApiResult> {
        Logger.info("Get voyage data", { dbid, trackerId });
        let assignments: TrackedCrew[] | null = null;

        if (!dbid && !trackerId)
            return {
                Status: 400,
                Body: { result: "bad input" },
            };

        if (!dbid)
            return {
                Status: 400,
                Body: { result: "bad input" },
            };

        try {
            if (trackerId) {
                assignments = trackerId
                    ? await this.getAssignmentsByTrackerId(dbid, trackerId)
                    : null;
            } else {
                assignments = await this.getAssignmentsByDbid(dbid);
            }
        } catch (err) {
            if (typeof err === "string") {
                return {
                    Status: 500,
                    Body: err,
                };
            } else if (err instanceof Error) {
                return {
                    Status: 500,
                    Body: err.toString(),
                };
            }
        }

        if (assignments) {
            return {
                Status: 200,
                Body: assignments,
            };
        } else {
            return {
                Status: 200, // 204
                Body: [],
            };
        }
    }

    async getTrackedData(
        dbid?: number,
        trackerId?: number
    ): Promise<ApiResult> {
        Logger.info("Get tracked data", { dbid, trackerId });
        let voyages: TrackedVoyage[] | null = null;
        let assignments: TrackedCrew[] | null = null;

        if (!dbid && !trackerId)
            return {
                Status: 400,
                Body: { result: "bad input" },
            };

        if (!dbid)
            return {
                Status: 400,
                Body: { result: "bad input" },
            };

        try {
            if (trackerId) {
                voyages = trackerId
                    ? await this.getVoyagesByTrackerId(dbid, trackerId)
                    : null;
                assignments = trackerId
                    ? await this.getAssignmentsByTrackerId(dbid, trackerId)
                    : null;
            } else {
                voyages = await this.getVoyagesByDbid(dbid);
                assignments = await this.getAssignmentsByDbid(dbid);
            }
        } catch (err) {
            if (typeof err === "string") {
                return {
                    Status: 500,
                    Body: err,
                };
            } else if (err instanceof Error) {
                return {
                    Status: 500,
                    Body: err.toString(),
                };
            }
        }

        if (voyages || assignments) {
            return {
                Status: 200,
                Body: {
                    voyages,
                    assignments,
                },
            };
        } else {
            return {
                Status: 200, // 204
                Body: { voyages: [], assignments: [] },
            };
        }
    }

    protected abstract getVoyagesByDbid(dbid: number): Promise<TrackedVoyage[] | null>;

    protected abstract getVoyagesByTrackerId(dbid: number, trackerId: number): Promise<TrackedVoyage[] | null>;

    protected abstract postOrPutVoyage(
        dbid: number,
        voyage: ITrackedVoyage,
        timeStamp?: Date
    ): Promise<TrackerPostResult>;

    protected abstract getAssignmentsByDbid(dbid: number): Promise<TrackedCrew[] | null>;

    protected abstract getAssignmentsByTrackerId(dbid: number, trackerId: number): Promise<TrackedCrew[] | null>;

    protected abstract postOrPutAssignment(
        dbid: number,
        crew: string,
        assignment: ITrackedAssignment,
        timeStamp?: Date
    ): Promise<number>;

    protected abstract postOrPutAssignmentsMany(
        dbid: number,
        crew: string[],
        assignments: ITrackedAssignment[],
        timeStamp?: Date
    ): Promise<number>;

}

