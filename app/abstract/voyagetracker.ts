import { IFullPayloadAssignment, ITrackedAssignment, ITrackedVoyage } from "../datacore/voyage";
import { TrackedCrew, TrackedVoyage } from "../models/Tracked";

import { Logger, LogData } from "../logic/logger";

import { ApiResult } from "../logic/api";

export type ErrorType = { error: number, message: string };

export const MAX_VOYAGES = 10000;

export type RepairType = {
    duplicate_voyages_removed: number;
    voyage_tracker_ids_corrected: number;
    assigment_tracker_ids_corrected: number;
    assigment_voyage_ids_corrected: number;
    voyages_trimmed: number;
    max_voyages: number;
}

export interface TrackerPostResult {
    status: number;
    inputId?: number;
    trackerId?: number;
    voyageId?: number;
}

export type MultiTrackerPostResult = TrackerPostResult[];

export abstract class VoyageTrackerBase {

    async getLastTrackedId(dbid?: number) {
        Logger.info("Last Tracked Id", { dbid });
        let trackerId = 0;
        if (!dbid)
            return {
                Status: 400,
                Body: { result: "bad input" },
            };

            try {
                trackerId = await this.getLastInsertId(dbid);
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
                Status: 200,
                Body: {
                    dbid: dbid,
                    lastId: trackerId
                },
            };
    }

    async deleteTrackedVoyage(
        dbid?: number,
        trackerId?: number
    ): Promise<ApiResult> {
        Logger.info("Tracked Voyage Delete", { dbid, trackerId });

        if (!dbid || !trackerId)
            return {
                Status: 400,
                Body: { result: "bad input" },
            };

        const timeStamp = new Date();
        let res: boolean;

        try {
            res = await this.deleteVoyageByTrackerId(dbid, trackerId);
            if (!res) {
                return {
                    Status: 400,
                    Body: {
                        dbid: dbid,
                        error: "Unable to delete record."
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
            Status: 200,
            Body: {
                dbid: dbid,
                trackerId: trackerId
            },
        };

    }

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

    async postTrackedData(
        dbid: number,
        voyage: ITrackedVoyage,
        assignments: IFullPayloadAssignment[],
        logData: LogData
    ): Promise<ApiResult> {
        Logger.info("Tracked Voyage data", { dbid, voyage, logData });

        const timeStamp = new Date();
        let res: TrackerPostResult | null = null;

        try {
            res = await this.postOrPutTrackedData(dbid, voyage, assignments, timeStamp);
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

    async postTrackedDataBatch(
        dbid: number,
        voyages: ITrackedVoyage[],
        assignments: IFullPayloadAssignment[][],
        logData: LogData
    ): Promise<ApiResult> {
        Logger.info("Tracked Voyage data", { dbid, voyage: voyages, logData });

        const timeStamp = new Date();
        let res: TrackerPostResult[] | null = null;

        try {
            res = await this.postOrPutTrackedDataBatch(dbid, voyages, assignments, timeStamp);
            const af = res.every(s => s.status >= 300);
            const f = res.find(s => s.status >= 300);
            if (!res || f) {
                return {
                    Status: af ? f?.status ?? 500 : 200,
                    Body: {
                        data: res?.map(receipt => ({
                            status: receipt!.status,
                            trackerId: receipt!.trackerId,
                            inputId: receipt!.inputId,
                        })),
                        dbid: dbid,
                        error: "Unable to insert one or more records.",
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
                data: res?.map(receipt => ({
                    status: receipt!.status,
                    trackerId: receipt!.trackerId,
                    inputId: receipt!.inputId,
                })),
                dbid,
                timeStamp: timeStamp.toISOString(),
            },
        };
    }

    async getTrackedVoyages(
        dbid?: number,
        trackerId?: number,
        limit?: number
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

        if (!dbid || !trackerId)
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
        trackerId?: number,
        limit?: number
    ): Promise<ApiResult> {
        Logger.info("Get tracked data", { dbid, trackerId });
        let voyages: TrackedVoyage[] | null = null;
        let assignments: TrackedCrew[] | null = null;

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
                voyages = await this.getVoyagesByDbid(dbid, limit);
                assignments = await this.getAssignmentsByDbid(dbid, limit);
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

    public async repairVoyages(dbid: number) {
        let result = await this.repairAccount(dbid);

        if ("error" in result) {
            return {
                Status: result.error,
                Body: { status: 'FAIL', message: result.message, code: result.error }
            }
        }
        return {
            Status: 200, // 204
            Body: { status: 'OK', message: 'Database repaired.', report: result },
        };
    }

    protected abstract deleteVoyageByTrackerId(dbid: number, trackerId: number): Promise<boolean>;

    protected abstract deleteVoyageByVoyageId(dbid: number, voyageId: number): Promise<boolean>;

    protected abstract getVoyagesByDbid(dbid: number, limit?: number): Promise<TrackedVoyage[] | null>;

    protected abstract getVoyagesByTrackerId(dbid: number, trackerId: number): Promise<TrackedVoyage[] | null>;

    protected abstract repairAccount(dbid: number): Promise<RepairType | ErrorType>;

    protected abstract postOrPutTrackedData(
        dbid: number,
        voyage: ITrackedVoyage,
        assigments: ITrackedAssignment[],
        timeStamp?: Date
    ): Promise<TrackerPostResult>;

    protected abstract postOrPutTrackedDataBatch(
        dbid: number,
        voyages: ITrackedVoyage[],
        assignments: IFullPayloadAssignment[][],
        timeStamp?: Date
    ): Promise<MultiTrackerPostResult>;

    protected abstract postOrPutVoyage(
        dbid: number,
        voyage: ITrackedVoyage,
        timeStamp?: Date
    ): Promise<TrackerPostResult>;

    protected abstract getAssignmentsByDbid(dbid: number, limit?: number): Promise<TrackedCrew[] | null>;

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

    protected abstract getLastInsertId(dbid: number): Promise<number>;

}

