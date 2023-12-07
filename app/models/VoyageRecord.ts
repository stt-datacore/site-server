import { Model, Column, Table, DataType, CreatedAt, HasMany, HasOne, ForeignKey, AutoIncrement, PrimaryKey, UpdatedAt } from 'sequelize-typescript';

// Old Model Going Away
@Table
export class VoyageRecord extends Model {
	
    @Column(DataType.TEXT)
    crewSymbol!: string;

    @Column
    estimatedDuration?: number;

	@CreatedAt
    voyageDate!: Date;
}

@Table
export class Voyage extends Model {

    @Column
    estimatedDuration?: number;

    @Column(DataType.DATE)    
    voyageDate!: Date;

    @Column(DataType.JSON)
    crew!: string[];

	@CreatedAt
    createdAt!: Date;

    @Column(DataType.JSON)
    am_traits?: string[];

    @Column
    primary_skill?: string;

    @Column
    secondary_skill?: string;

    @Column
    ship_trait?: string;

    @Column(DataType.JSON)
    extra_stats?: any
}

@Table({ tableName: "Voyages", name: { singular: "Voyage", plural: "Voyages" } })
export class Historical extends Model { 

    @Column
    estimatedDuration?: number;

    @Column(DataType.DATE)    
    voyageDate!: Date;

    @Column(DataType.JSON)
    crew!: string[];

	@CreatedAt
    createdAt!: Date;

    @Column(DataType.JSON)
    am_traits?: string[];

    @Column
    primary_skill?: string;

    @Column
    secondary_skill?: string;

    @Column
    ship_trait?: string;

    @Column(DataType.JSON)
    extra_stats?: any
}

