import fetch from 'node-fetch';
import { LogData, Logger } from './logger';
import { BeamableStoreRoot } from '../models/beamable';

// Facebook STT client ID
// const CLIENT_ID = '1425f8c5-b07f-45ba-b490-3dfd4561d5cf';
const CLIENT_ID = '322613001274224';

export async function getSTTToken(username?: string, password?: string) {
    Logger.info('Fetching new STT API token');

    const params = new URLSearchParams();

    params.append('username', username ?? process.env.STT_BOT_USERNAME!);
    params.append('password', password ?? process.env.STT_BOT_PASSWORD!);
    params.append('grant_type', 'password');
    params.append('client_id', CLIENT_ID);

    const data = await fetch(
        'https://thorium.disruptorbeam.com/oauth2/token',
        { method: 'POST', body: params, headers: { 'Content-type': 'application/x-www-form-urlencoded' } }
    )
        .then((res) => res.json());

    if (data?.access_token) {
        Logger.info('New token fetched successfully');
        return data.access_token as string;
    } else {
        Logger.info('Failed to fetch token', data);
        throw new Error(`Failed to fetch token: ${data}`);
    }
}

export async function getBeamableStore(dbid: string | number, stt_token: string, logData?: LogData) {
    if (logData) Logger.info('Load store crew offers', { logData });
    try {
        let response = await fetch(
            `https://api.beamable.com/object/commerce/${dbid}?scope=event_crew,event,crew`,
            {
                headers: {
                    "Authorization": `Bearer ${stt_token}`,
                    "Referer": "https://app.startrektimelines.com",
                    "Origin": "https://app.startrektimelines.com",
                    "X-De-Scope": "326859044761600.sttprod"
                }
            }
        );
        if (response?.ok) {
            return (await response.json()) as BeamableStoreRoot;
        }
    }
    catch (e: any) {
        console.log("Cannot load beamable store!");
        console.log(e);
    }
    return null;
}
