import fs from 'fs';
import { sequelize } from './sequelize';
import { uploadProfile } from './logic/profiletools';
import { User, UserRole } from './models/User';

require('dotenv').config();

(async () => {
	await sequelize.sync();

	let profiles = fs
		.readFileSync(`${process.env.PROFILE_DATA_PATH}/profiles.csv`, 'utf-8')
		.split('\r\n')
		.slice(1)
		.map((line) => ({
			dbid: line.split(',')[0],
			lastUpdate: new Date(line.split(',')[1]),
			userId: Number.parseInt(line.split(',')[2]),
		}));

	let users = fs
		.readFileSync(`${process.env.PROFILE_DATA_PATH}/users.csv`, 'utf-8')
		.split('\r\n')
		.slice(1)
		.map((line) => ({
			id: Number.parseInt(line.split(',')[0]),
			discordUserName: line.split(',')[1],
			discordUserDiscriminator: line.split(',')[2],
            discordUserId: line.split(',')[3],
            new_id: 0
		}));

    // First add the users into the database
	users.forEach(async (csvUser) => {
		let userDB = await User.create({
			discordUserName: csvUser.discordUserName,
			discordUserDiscriminator: csvUser.discordUserDiscriminator,
			discordUserId: csvUser.discordUserId,
			userRole: UserRole.DISCORDONLY,
        });

        csvUser.new_id = userDB.id;
    });

    // Now upload the profiles
    profiles.forEach(async (csvProfile: any) => {
        let profileDB = await uploadProfile(csvProfile.dbid, JSON.parse(fs.readFileSync(`${process.env.PROFILE_DATA_PATH}/${csvProfile.dbid}`, 'utf-8')), csvProfile.lastUpdate);

        if (!Number.isNaN(csvProfile.userId)) {
            // user associations
            let usr = users.find(u => u.id === csvProfile.userId);
            if (!usr) {
                return console.error('User not found!');
            }
            profileDB.userId = usr.new_id;
	        await profileDB.save();
        }
    });
})();
