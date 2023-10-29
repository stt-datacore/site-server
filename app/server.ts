import express from 'express';
import cors from 'cors';
import { Request, Response } from 'express';
import bodyParser from 'body-parser';

import expressWinston from 'express-winston';

import { ApiController } from './controllers';
import { Logger, DataCoreAPI } from './logic';
import { sequelize } from './sequelize';
import { collections, connectToMongo } from './mongo';
import { VoyageRecord } from './models/VoyageRecord';
import { Op, Sequelize } from 'sequelize';
import { ITelemetryVoyage, TelemetryVoyage } from './mongoModels/voyageHistory';
import fs from 'fs'
import { CrewMember } from './datacore/crew';
require('dotenv').config();

// Create a new express application instance
const app: express.Application = express();

// When used with nginx reverse proxy, pick a rerouting port
let port: number = 4420;

if (process.argv.length > 2) {
	port = parseInt(process.argv[2]);
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

const cycleInitMongo = async (force?: boolean) => {
	if (DataCoreAPI.mongoAvailable && !force) return;

	try {		
		DataCoreAPI.mongoAvailable = await connectToMongo();		
	}
	catch {
		DataCoreAPI.mongoAvailable = false;
	}

	if (!DataCoreAPI.mongoAvailable) {
		console.log("MongoDB is not available. Disabling affected routes. Will try again in 60 seconds.");
		setTimeout(() => {
			console.log("Re-attempting MongoDB connection...")
			cycleInitMongo();
		}, 60000);
	}
};

(async () => {
	await sequelize.sync();
	
	// Now that the DB is actually up, initialize the cache
	await DataCoreAPI.initializeCache();

	setTimeout(async () => {
		await cycleInitMongo();
		// if (DataCoreAPI.mongoAvailable && collections.telemetry) {
		// 	let response = collections.telemetry.aggregate([
		// 		{$group : {_id: "$crewSymbol", count: { $sum: 1 } } }
		// 	]);
		// 	if (response) {
		// 		let result = await response.toArray();
		// 		console.log(`${result.length} records queried.`);
		// 		console.log(result);
		// 	}
		// 	// let response = collections.telemetry.find({ crewSymbol: 'mariner_mirror_crew' });
		// 	// if (response) {
		// 	// 	console.log(await response.toArray());
		// 	// }
		// }

		// if (DataCoreAPI.mongoAvailable) {
		// 	console.log("Connection Established, Querying Old Telemetry Data...");
		// 	const baseFilter = {
		// 		group: ['crewSymbol'],
		// 		attributes: ['crewSymbol', [Sequelize.fn('COUNT', Sequelize.col('crewSymbol')), 'crewCount'], [Sequelize.fn('AVG', Sequelize.col('estimatedDuration')), 'averageDuration']],
		// 	} as any;
		
		// 	if (collections.telemetry){ 
		// 		console.log("Wiping current MongoDB telemetry collection...");
		// 		await collections.telemetry.deleteMany({});
		// 		console.log("Done.");
		// 	}

		// 	const crews = JSON.parse(fs.readFileSync("../website/static/structured/crew.json", 'utf8')) as CrewMember[];
			
		// 	for (let crew of crews) {

		// 		console.log(`Reading old data from '${crew.name}' ... `);
				
		// 		let data: VoyageRecord[] | null;
				
		// 		data = await VoyageRecord.findAll({ where: { crewSymbol: crew.symbol } });
				
		// 		if (!data?.length) {
		// 			console.log("No data, skipping...");					
		// 			continue;
		// 		}

		// 		console.log(`Old data from '${crew.name}': ${data.length} Records...`);								
				
		// 		if (collections.telemetry) {
					
		// 			let mapped = data.map(item => { return { 
		// 				crewSymbol: item.crewSymbol,
		// 				voyageDate: item.voyageDate,
		// 				estimatedDuration: item.estimatedDuration ?? 0
		// 			 } as ITelemetryVoyage });
		// 			data.length = 0;
		// 			data = null;

		// 			console.log(`Inserting records from crew '${mapped[0].crewSymbol}' into Mongo ...`);
		// 			collections.telemetry.insertMany(mapped);
		// 			console.log("Done. Moving on to next set...");
		// 		}
		// 		else {
		// 			data.length = 0;
		// 			data = null;	

		// 			console.log("Mongo is not found!");
		// 			break;
		// 		}
		// 	}

		// 	console.log("Populating MongoDB completed. You may quit.");

		// }
	})

	// Serve the application at the given port
	app.listen(port, '0.0.0.0', () => {
		// Success callback
		console.log(`Listening at http://0.0.0.0:${port}/`);
	});
})();

process.on('SIGINT', () => {
	process.exit(0);
});
