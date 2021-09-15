import { Model, Column, Table, DataType, CreatedAt } from 'sequelize-typescript';

@Table
export class VoyageRecord extends Model {
	@Column(DataType.TEXT)
    crewSymbol!: string;

    @Column
    estimatedDuration?: number;

	@CreatedAt
    voyageDate!: Date;
}
