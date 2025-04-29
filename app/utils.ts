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
import { Op } from 'sequelize';

require('dotenv').config();

interface Achiever {
	player_guid: string,
	player_name: string,
	date: Date,
	crew_archetype_id: number,
	published?: boolean;
	crew_symbol?: string;
	crew_name?: string;
	crew_url?: string;
	crew_rarity?: number;
}

type CapAchievers = {
	action: string,
	achievers: Achiever[]
}
export async function upgradeAvatars() {
    console.log("Directive: Upgrade Avatars\nSynchronizing Database.");
    await sequelize.sync();

    const path = process.env.PROFILE_DATA_PATH;
    const profiles = await Profile.findAll();
    profiles.forEach(async (profile) => {
        let file = `${path}/${profile.dbid}`;
        if (fs.existsSync(file)) {
            const diskprof = JSON.parse(fs.readFileSync(file, 'utf-8')) as PlayerData;
            let newprofile = profile.toJSON();
            if (newprofile.metadata.crew_avatar) return;

            newprofile.metadata ??= {};
            newprofile.metadata.crew_avatar = {
                symbol: diskprof.player?.character?.crew_avatar?.symbol ?? null,
                name: diskprof.player?.character?.crew_avatar?.name ?? null,
            };
            delete newprofile.id;
            console.log(`Crew avatar for ${profile.captainName} set to ${diskprof.player.character.crew_avatar?.name}...`);
            await Profile.update({ ...newprofile }, { where: { dbid: profile.dbid } } );
        }
    });
    console.log("Done with Directive: Upgrade Avatars");
}

export async function compareFTM() {
    let data = (await DataCoreAPI.getFTMLog()) as CapAchievers;
    console.log(`Directive: Scan Cap Achievers for Matches`);
    data.achievers.forEach(async (achiever) => {
        let results = await Profile.findAll({ where: { captainName: { [Op.like]: `${achiever.player_name}` } } });
        if (results?.length) {
            results.forEach((result) => {
                console.log(`Cap achiever found for Crew Archetype ${achiever.crew_archetype_id}, ${achiever.player_name}.`);
                if (result.metadata?.crew_avatar?.name ?? result.metadata?.crew_avatar?.symbol) {
                    console.log(`Player Avatar: ${result.metadata?.crew_avatar?.name ?? result.metadata?.crew_avatar?.symbol ?? 'None'}`)
                }
                else {
                    console.log(result.metadata);
                }
            });
        }
    });
}