import { Column, CreatedAt, DataType, Model, Table } from "sequelize-typescript";



export interface IPlayerResourceRecord {
    dbid: number;
    timestamp: Date;
    resources: {[key:string]: number}
}

@Table
export class PlayerResourceRecord extends Model implements IPlayerResourceRecord {

    @Column
    dbid!: number;

    @Column(DataType.JSON)
    resources!: {[key:string]: number};

    @CreatedAt
    timestamp!: Date;
}
