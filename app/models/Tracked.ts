import { ObjectId } from "mongodb";
import { Column, CreatedAt, DataType, Model, Table } from "sequelize-typescript";
import { ITrackedVoyage, ITrackedAssignment } from "../datacore/voyage";
import {
    ITelemetryVoyage,
    ITrackedVoyageRecord,
    ITrackedCrewRecord,
} from "../mongoModels/voyageHistory";


@Table
export class TrackedVoyage extends Model implements ITrackedVoyageRecord {
    @Column
    dbid!: number;

    @Column
    trackerId!: number;

    @Column(DataType.JSON)
    voyage!: ITrackedVoyage;

    @CreatedAt
    timeStamp!: Date;
}

@Table
export class TrackedCrew extends Model implements ITrackedCrewRecord {
    @Column
    dbid!: number;

    @Column
    crew!: string;

    @Column
    trackerId!: number;

    @Column(DataType.JSON)
    assignment!: ITrackedAssignment;

    @CreatedAt
    timeStamp!: Date;
}
