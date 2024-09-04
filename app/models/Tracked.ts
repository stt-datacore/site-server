import { Column, CreatedAt, DataType, Model, Table, UpdatedAt } from "sequelize-typescript";
import { ITrackedVoyage, ITrackedAssignment } from "../datacore/voyage";

export interface ITelemetryVoyage {
    crewSymbol: string;
    estimatedDuration: number;
    voyageDate: Date;
}

export interface ITrackedVoyageRecord {
    dbid: number;
    trackerId: number;
    voyage: ITrackedVoyage;
    timeStamp: Date;
}

export interface ITrackedCrewRecord {
    dbid: number;
    crew: string;
    trackerId: number;
    assignment: ITrackedAssignment;
    timeStamp: Date;
}

export interface ITrackedDataRecord {
    voyages: ITrackedVoyageRecord[];
    crew: ITrackedCrewRecord[];
}



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

    @Column
    voyageId?: number;

    @UpdatedAt
    updatedAt?: Date;
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
