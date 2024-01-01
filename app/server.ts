import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';

import expressWinston from 'express-winston';

import { ApiController } from './controllers';
import { Logger, DataCoreAPI } from './logic';
import { sequelize } from './sequelize';
import { exit } from 'process';

require('dotenv').config();

// Create a new express application instance
const app: express.Application = express();

// When used with nginx reverse proxy, pick a rerouting port
let port: number = 4420;
//let port: number = 4421;

if (process.argv.length > 2) {
	if (process.argv[2] !== 'stats') {
		port = parseInt(process.argv[2]);
	}	
}

let nocache = (req: Request, res: Response, next: any) => {
	res.setHeader('Surrogate-Control', 'no-store');
	res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.setHeader('Pragma', 'no-cache');
	res.setHeader('Expires', '0');

	next();
};

// Add logger
let expressLogger = expressWinston.logger({
	transports: Logger.transports,
	colorize: true,
	msg: 'HTTP {{req.method}} {{req.url}} ({{res.responseTime}}ms) from {{req.ip}}'
});

app.use(bodyParser.json({ limit: '20mb' })); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Add CORS support
let corsOptions: any = {	
	origin: [
		// Main site
		process.env.CORS_ORIGIN, 
		// Beta site
		'https://beta.datacore.app', 
		// Alpha sites
		/https:\/\/[a-zA-Z0-9_.-]+\.website-i3mu\.pages\.dev/, 
		// localhost is temporary for testing
		'http://localhost:81'
	],
	optionsSuccessStatus: 200 // some legacy browsers choke on 204
};

app.use(cors(corsOptions));

// Mount the controllers' routes
app.use('/api', nocache, expressLogger, ApiController);

(async () => {
	await sequelize.sync();

	// Now that the DB is actually up, initialize the cache
	await DataCoreAPI.initializeCache();
	console.log(JSON.stringify(process.argv));
	// Begin Voyage Stats generation cycle
	DataCoreAPI.beginStatsCycle();
	
	if (!process.argv.includes("stats")) {
		// Serve the application at the given port
		app.listen(port, '0.0.0.0', () => {
			// Success callback
			console.log(`Listening at http://0.0.0.0:${port}/`);
		});

	}
})();

process.on('SIGINT', () => {
	process.exit(0);
});
