import fs from 'fs';
import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';

import expressWinston from 'express-winston';

import { ApiController } from './controllers';
import { Logger, DataCoreAPI } from './logic';
import { sequelize } from './sequelize';
import { exit } from 'process';
import { User } from './models/User';
import { PlayerData } from './datacore/player';
import { Profile } from './models/Profile';

require('dotenv').config();

export async function upgradeAvatars() {
    console.log("Directive: Upgrade Avatars\nSynchronizing Database.");
    await sequelize.sync();

    const path = process.env.PROFILE_DATA_PATH;
    const users = await User.findAll();
    if (!users?.length) return;
    for (let user of users) {
        console.log(`Check user ${user.discordUserName}`);
        let profiles = await Profile.findAll({ where: { userId: user.id }});
        profiles.forEach(async (profile) => {
            let file = `${path}/${profile.dbid}`;
            if (fs.existsSync(file)) {
                const diskprof = JSON.parse(fs.readFileSync(file, 'utf-8')) as PlayerData;
                profile.metadata ??= {};
                profile.metadata.crew_avatar = {
                    symbol: diskprof.player?.character?.crew_avatar?.symbol ?? null,
                    name: diskprof.player?.character?.crew_avatar?.name ?? null,
                };
                console.log(`Crew avatar for ${profile.captainName} set to ${diskprof.player.character.crew_avatar?.name}...`);
                await profile.save();
            }
        });
    }
    console.log("Done with Directive: Upgrade Avatars");
}