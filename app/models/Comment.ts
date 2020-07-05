import { Model, Column, Table, DataType, ForeignKey, BelongsTo, CreatedAt } from 'sequelize-typescript';

import { User } from './User';

@Table
export class Comment extends Model<Comment> {
	@Column
    symbol!: string;

	@Column(DataType.TEXT)
	markdown!: string;

	@Column
	booknote!: boolean;

	@Column
	lastUpdate!: Date;

	@CreatedAt
    creationDate!: Date;

	@ForeignKey(() => User)
	@Column
	userId!: number;

	@BelongsTo(() => User)
	user!: User;
}
