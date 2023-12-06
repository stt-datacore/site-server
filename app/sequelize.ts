import { Sequelize } from 'sequelize-typescript';

import { User } from './models/User';
import { Profile } from './models/Profile';
import { Comment } from './models/Comment';
import { Voyage, VoyageRecord } from './models/VoyageRecord';

require('dotenv').config();

export const sequelize = new Sequelize(process.env.DB_CONNECTION_STRING!, {
	models: [User, Profile, Comment, VoyageRecord, Voyage],
	logging: false
});
