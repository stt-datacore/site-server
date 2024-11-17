import { logger } from 'express-winston';
import fetch from 'node-fetch';
import { Logger } from './logger';

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