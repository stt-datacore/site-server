import { Router, Request, Response } from 'express';
import { ApiResult, DataCoreAPI, LogData } from '../logic';
import { PlayerData } from '../datacore/player';
import { ITrackedAssignment, ITrackedVoyage } from '../datacore/voyage';
import { IFBB_BossBattle_Document } from '../mongoModels/playerCollab';
import { CrewTrial, Solve } from '../datacore/boss';

// Assign router to the express.Router() instance
const router: Router = Router();

function getLogDataFromReq(req: Request): LogData {
	let logData = new LogData();
	logData.ip = req.get('cf-connecting-ip') || req.get('x-forwarded-for') || req.ip;
	logData.cfCountry = req.get('cf-ipcountry');
	logData.userAgent = req.get('user-agent');
	if (req.get('x-requested-with')) {
		logData.requestedWith = req.get('x-requested-with');
	}
	return logData;
}

router.post('/post_profile', async (req: Request, res: Response, next) => {
	if (!req.body || !req.body.dbid || !req.body.player_data) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.postPlayerData(req.body.dbid.toString(), req.body.player_data, getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.post('/login', async (req: Request, res: Response, next) => {
	if (!req.body || !req.body.user || !req.body.password) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.login(req.body.user.toString(), req.body.password.toString(), getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.get('/whoami', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.token) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.whoami(req.query.token.toString(), getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.get('/comments', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.symbol) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.loadComments(req.query.symbol.toString(), getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.post('/savecomment', async (req: Request, res: Response, next) => {
	if (!req.body || !req.body.token || !req.body.symbol || !req.body.markdown) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.saveComment(
			req.body.token.toString(),
			req.body.symbol.toString(),
			req.body.markdown.toString(),
			getLogDataFromReq(req)
		);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.get('/fleet_info', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.fleetid) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.loadFleetInfo(req.query.fleetid.toString(), getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.get('/gauntlet_info', async (req: Request, res: Response, next) => {
	if (!req.query) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.loadGauntletStatus(getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.get('/offer_info', async (req: Request, res: Response, next) => {
	try {
		let apiResult = await DataCoreAPI.loadStoreCrewOffers(getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.get('/get_dbid_from_discord', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.username || !req.query.discriminator) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.getDBIDbyDiscord(req.query.username.toString(), req.query.discriminator.toString());
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.get('/telemetry', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.type) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.getTelemetry(
			req.query.type.toString()
		);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.post('/telemetry', async (req: Request, res: Response, next) => {
	if (!req.body || !req.body.type || !req.body.data) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = await DataCoreAPI.recordTelemetry(
			req.body.type, req.body.data
		);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});


/** MongoDB-connected routes */

router.get('/queryAlive', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.what) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult = {
			Status: 200,
			Body: { 
				service: req.query.what,
				result: "UP"
			}
		}

		if (req.query.what === 'mongodb') {
			if (!DataCoreAPI.mongoAvailable) {				
				apiResult.Status = 503;
				apiResult.Body.result = "DOWN";	
			}
		}

		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});


router.post('/postProfile', async (req: Request, res: Response, next) => {
	if (!req.body) {
		res.status(400).send('Whaat?');
		return;
	}	
	try {
		let playerData = req.body as PlayerData;
		let apiResult = await DataCoreAPI.mongoPostPlayerData(playerData.player.dbid, playerData, getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {		
		next(e);
	}
});

router.get('/getProfile', async (req: Request, res: Response, next) => {
	if (!req.query || (!req.query.dbid && !req.query.dbidhash)) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let apiResult: ApiResult | undefined = undefined;

		if (req.query.dbid) {
			apiResult = await DataCoreAPI.mongoGetPlayerData(Number.parseInt(req.query.dbid.toString()));
		}
		else if (req.query.dbidhash) {
			apiResult = await DataCoreAPI.mongoGetPlayerData(undefined, req.query.dbidhash.toString());
		}
		if (apiResult) {
			res.status(apiResult.Status).send(apiResult.Body);
		}
		else {
			res.status(500).send();
		}
	} catch (e) {
		next(e);
	}
});

router.get('/getProfiles', async (req: Request, res: Response, next) => {
	if (!req.query || (!req.query.fleet && !req.query.squadron )) {
		res.status(400).send('Whaat?');
		return;
	}

	try {		
		let fleet = req.query?.fleet ? Number.parseInt(req.query.fleet.toString()) : undefined;
		let squadron = req.query?.squadron ? Number.parseInt(req.query.squadron.toString()) : undefined;
		let apiResult = await DataCoreAPI.mongoGetManyPlayers(fleet, squadron);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.post('/postVoyage', async (req: Request, res: Response, next) => {
	if (!req.body) {
		res.status(400).send('Whaat?');
		return;
	}	
	try {
		let dbid = req.body.dbid;
		let voyage = req.body.voyage as ITrackedVoyage;		
		let apiResult = await DataCoreAPI.mongoPostTrackedVoyage(dbid, voyage, getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {		
		next(e);
	}
});

router.get('/getVoyages', async (req: Request, res: Response, next) => {
	if (!req.query || (!req.query.dbid && !req.query.trackerId )) {
		res.status(400).send('Whaat?');
		return;
	}

	try {		
		let dbid = req.query?.dbid ? Number.parseInt(req.query.dbid.toString()) : undefined;
		let trackerId = req.query?.trackerId ? Number.parseInt(req.query.trackerId.toString()) : undefined;
		let apiResult = await DataCoreAPI.mongoGetTrackedVoyages(dbid, trackerId);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.post('/postAssignment', async (req: Request, res: Response, next) => {
	if (!req.body) {
		res.status(400).send('Whaat?');
		return;
	}	
	
	try {
		let dbid = req.body.dbid;
		let crew = req.body.crew;		
		let assignment = req.body.assignment as ITrackedAssignment;
		let apiResult = await DataCoreAPI.mongoPostTrackedAssignment(dbid, crew, assignment, getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {		
		next(e);
	}
});

router.post('/postAssignments', async (req: Request, res: Response, next) => {
	if (!req.body) {
		res.status(400).send('Whaat?');
		return;
	}	
	
	try {
		let dbid = req.body.dbid;
		let assign = req.body.assigments as { [key: string]: ITrackedAssignment };
		let crew = Object.keys(assign);
		let assignments = Object.values(assign);		
		let apiResult = await DataCoreAPI.mongoPostTrackedAssignmentsMany(dbid, crew, assignments, getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {		
		next(e);
	}
});

router.get('/getAssignments', async (req: Request, res: Response, next) => {
	if (!req.query || (!req.query.dbid && !req.query.trackerId )) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let dbid = req.query?.dbid ? Number.parseInt(req.query.dbid.toString()) : undefined;
		let trackerId = req.query?.trackerId ? Number.parseInt(req.query.trackerId.toString()) : undefined;
		let apiResult = await DataCoreAPI.mongoGetTrackedVoyages(dbid, trackerId);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.get('/getTrackedData', async (req: Request, res: Response, next) => {
	if (!req.query || (!req.query.dbid && !req.query.trackerId )) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let dbid = req.query?.dbid ? Number.parseInt(req.query.dbid.toString()) : undefined;
		let trackerId = req.query?.trackerId ? Number.parseInt(req.query.trackerId.toString()) : undefined;
		let apiResult = await DataCoreAPI.mongoGetTrackedData(dbid, trackerId);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.post('/postBossBattle', async (req: Request, res: Response, next) => {
	if (!req.body) {
		res.status(400).send('Whaat?');
		return;
	}	
	
	try {		
		if ("id" in req.body) {
			req.body.bossBattleId = req.body.id;
			delete req.body.id;
		}
		let battle = req.body as IFBB_BossBattle_Document;
		let apiResult = await DataCoreAPI.mongoPostBossBattle(battle);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {		
		next(e);
	}
});


router.post('/postBossBattleSolves', async (req: Request, res: Response, next) => {
	if (!req.body) {
		res.status(400).send('Whaat?');
		return;
	}	
	
	try {		
		let bossBattleId = req.body.bossBattleId as number;
		let chainIndex = req.body.chainIndex as number;
		let solves = req.body.solves as Solve[];

		if (!bossBattleId || !chainIndex || !solves) {
			res.status(400).send("Bad data");
		}

		let apiResult = await DataCoreAPI.mongoPostSolves(bossBattleId, chainIndex, solves);

		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {		
		next(e);
	}
});

router.post('/postBossBattleTrials', async (req: Request, res: Response, next) => {
	if (!req.body) {
		res.status(400).send('Whaat?');
		return;
	}	
	
	try {		
		let bossBattleId = req.body.bossBattleId as number;
		let chainIndex = req.body.chainIndex as number;
		let trials = req.body.trials as CrewTrial[];

		if (!bossBattleId || !chainIndex || !trials) {
			res.status(400).send("Bad data");
		}

		let apiResult = await DataCoreAPI.mongoPostTrials(bossBattleId, chainIndex, trials);

		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {		
		next(e);
	}
});


router.get('/getBossBattle', async (req: Request, res: Response, next) => {
	if (!req.query || (!req.query.room && !req.query.id )) {
		res.status(400).send('Whaat?');
		return;
	}

	try {		
		let room = undefined as string | undefined;		
		let id = undefined as number | undefined;

		if (req.query.room) {
			room = req.query.room as string;
		}
		if (req.query.id) {
			id = Number.parseInt(req.query.id as string);
		}

		let apiResult = await DataCoreAPI.mongoGetCollaboration(id, room);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

// Export the express.Router() instance to be used by server.ts
export const ApiController: Router = router;
