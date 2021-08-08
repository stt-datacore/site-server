import { logger } from 'express-winston';
import fetch from 'node-fetch';
import { Logger } from './logger';

// Facebook STT client ID
const CLIENT_ID = '322613001274224';

export async function getSTTToken() {
  Logger.info('Fetching new STT API token');
  const params = new URLSearchParams();
  params.append('username', process.env.STT_BOT_USERNAME!);
  params.append('password', process.env.STT_BOT_PASSWORD!);
  params.append('grant_type', 'password');
  params.append('client_id', CLIENT_ID);

	const data = await fetch(
    'https://thorium.disruptorbeam.com/oauth2/token',
    { method: 'POST', body: params }
  )
    .then((res) => res.json());

  if (data?.access_token) {
    Logger.info('New token fetched successfully');
    return data.access_token;
  } else {
    Logger.info('Failed to fetch token', data);
    throw new Error(`Failed to fetch token: ${data}`);
  }
}