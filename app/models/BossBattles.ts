
import { Column, CreatedAt, DataType, Model, Table } from "sequelize-typescript";
import { Chain, Solve, CrewTrial } from "../datacore/boss";

export interface IFBB_BossBattle_Document {
	bossBattleId: number;	// can also index ON fleetId AND bossId AND difficultyId
	fleetId: number;
	bossGroup: string;
	difficultyId: number;
	chainIndex: number;
	chain: Chain;
	description: string;
	roomCode: string;
	timeStamp: Date;
};

export interface IFBB_Solve_Document {
	bossBattleId: number;
	chainIndex: number;
	solve: Solve;
	timeStamp: Date;
};

export interface IFBB_Trial_Document {
	bossBattleId: number;
	chainIndex: number;
	trial: CrewTrial;
	timeStamp: Date;
};

@Table
export class BossBattleDocument extends Model implements IFBB_BossBattle_Document {

    @Column
    bossBattleId!: number;

    @Column
    fleetId!: number;

    @Column
    bossGroup!: string;

    @Column
    difficultyId!: number;

    @Column
    chainIndex!: number;

    @Column(DataType.JSON)
    chain!: Chain;

    @Column
    description!: string;

    @Column
    roomCode!: string;

    @CreatedAt
    timeStamp!: Date

}

@Table
export class SolveDocument extends Model implements IFBB_Solve_Document {
    @Column
    bossBattleId!: number;

    @Column
    chainIndex!: number;

    @Column(DataType.JSON)
    solve!: Solve;

    @CreatedAt
    timeStamp!: Date;


};

@Table
export class TrialDocument extends Model implements IFBB_Trial_Document {

    @Column
    bossBattleId!: number;

    @Column
    chainIndex!: number;

    @Column(DataType.JSON)
    trial!: CrewTrial;

    @CreatedAt
    timeStamp!: Date;

}
