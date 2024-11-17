import { Router, Request, Response } from 'express';
import { ApiResult, DataCoreAPI, LogData } from '../logic';
import { PlayerData } from '../datacore/player';
import { IFullPayloadAssignment, ITrackedAssignment, ITrackedPayload, ITrackedVoyage } from '../datacore/voyage';
import { IFBB_BossBattle_Document } from '../models/BossBattles';
import { CrewTrial, Solve } from '../datacore/boss';
import { VoyageTrackerAPI } from '../logic/voyagetracker';
import { CollaborationAPI } from '../logic/collab';

// Assign router to the express.Router() instance
const router: Router = Router();

function getLogDataFromReq(req: Request): LogData {
	let logData = new LogData();
	logData.ip = req.get('cf-connecting-ip') || req.get('x-forwarded-for') || req.ip || 'unknown';
	logData.cfCountry = req.get('cf-ipcountry');
	logData.userAgent = req.get('user-agent');
	if (req.get('x-requested-with')) {
		logData.requestedWith = req.get('x-requested-with');
	}
	return logData;
}

// This method will be deprecated in favor of /postProfile
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

router.get('/profile', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.dbid) {
		res.status(400).send('Whaat?');
		return;
	}

	const short_crew = !!req.query.short_crew && req.query.short_crew === '1'

	try {
		let apiResult = await DataCoreAPI.getProfile(req.query.dbid.toString(), short_crew);
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

router.post('/fleet_info', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.fleetid || !req.body) {
		res.status(400).send('Whaat?');
		return;
	}

	const cred = req.body;

	try {
		let apiResult = await DataCoreAPI.loadFleetInfo(req.query.fleetid.toString(), getLogDataFromReq(req), cred.username, cred.password, cred.access_token);
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

router.get('/celestial-market', async (req: Request, res: Response, next) => {
	try {
		let apiResult = await DataCoreAPI.getCelestial();
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


router.get('/voyagesByCrew', async (req: Request, res: Response, next) => {
	try {
		let cstr = req.query.crew?.toString();
		let dstr = req.query.days?.toString();
		let opAnd = (req.query.opand === '1');
		let crew = cstr?.split(",");
		let days = dstr ? Number.parseInt(dstr) : undefined;

		let apiResult = await DataCoreAPI.getVoyages(crew, days, opAnd);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

/** Overhauled SQLite routes */

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
		let apiResult = await DataCoreAPI.postPlayerData(playerData.player.dbid.toString(), playerData, getLogDataFromReq(req));
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
			apiResult = await DataCoreAPI.sqliteGetPlayerData(Number.parseInt(req.query.dbid.toString()));
		}
		else if (req.query.dbidhash) {
			apiResult = await DataCoreAPI.sqliteGetPlayerData(undefined, req.query.dbidhash.toString());
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


router.post('/postVoyage', async (req: Request, res: Response, next) => {
	if (!req.body) {
		res.status(400).send('Whaat?');
		return;
	}
	try {
		let dbid = req.body.dbid;
		let voyage = req.body.voyage as ITrackedVoyage;
		let apiResult = await VoyageTrackerAPI.postTrackedVoyage(dbid, voyage, getLogDataFromReq(req));
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.post('/postTrackedData', async (req: Request, res: Response, next) => {
	if (!req.body || !req.body.dbid || !req.body.voyage || !req.body.assigments) {
		res.status(400).send('Whaat?');
		return;
	}
	try {
		let payload = req.body as ITrackedPayload;
		const { dbid, voyage, assignments } = payload;
		let apiResult = await VoyageTrackerAPI.postTrackedData(dbid, voyage, assignments, getLogDataFromReq(req));
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
		let apiResult = await VoyageTrackerAPI.getTrackedVoyages(dbid, trackerId);
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
		let dbid = Number.parseInt(req.body.dbid);
		let crew = req.body.crew;
		let assignment = req.body.assignment as ITrackedAssignment;
		let apiResult = await VoyageTrackerAPI.postTrackedAssignment(dbid, crew, assignment, getLogDataFromReq(req));
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
		let dbid = Number.parseInt(req.body.dbid);
		let assign = req.body.assignments as { [key: string]: ITrackedAssignment[] };
		let crew = Object.keys(assign);
		let assignmap = Object.values(assign);
		let assignments = [] as ITrackedAssignment[];
		let finalcrew = [] as string[];
		let x = 0;

		for (let a1 of assignmap) {
			let symbol = crew[x];
			for (let a2 of a1) {
				assignments.push(a2);
				finalcrew.push(symbol);
			}
			x++;
		}

		let apiResult = await VoyageTrackerAPI.postTrackedAssignmentsMany(dbid, finalcrew, assignments, getLogDataFromReq(req));
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
		let apiResult = await VoyageTrackerAPI.getTrackedVoyages(dbid, trackerId);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});


router.get('/getLastTrackedId', async (req: Request, res: Response, next) => {
	if (!req.query || (!req.query.dbid)) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let dbid = req.query?.dbid ? Number.parseInt(req.query.dbid.toString()) : undefined;
		let apiResult = await VoyageTrackerAPI.getLastTrackedId(dbid);
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
		let limit = req.query?.limit ? Number.parseInt(req.query.limit.toString()) : undefined;
		let apiResult = await VoyageTrackerAPI.getTrackedData(dbid, trackerId, limit);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

router.delete('/deleteTrackedData', async (req: Request, res: Response, next) => {
	if (!req.query || (!req.query.dbid && !req.query.trackerId )) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let dbid = req.query?.dbid ? Number.parseInt(req.query.dbid.toString()) : undefined;
		let trackerId = req.query?.trackerId ? Number.parseInt(req.query.trackerId.toString()) : undefined;
		let apiResult = await VoyageTrackerAPI.deleteTrackedVoyage(dbid, trackerId);
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
		let apiResult = await CollaborationAPI.postBossBattle(battle);
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
		let fleetId = req.body.fleetId as number;
		let bossBattleId = req.body.bossBattleId as number;
		let chainIndex = req.body.chainIndex as number;
		let solves = req.body.solves as Solve[];

		if (!fleetId || !bossBattleId || !chainIndex || !solves) {
			res.status(400).send("Bad data");
		}

		let apiResult = await CollaborationAPI.postSolves(fleetId, bossBattleId, chainIndex, solves);

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
		let fleetId = req.body.fleetId as number;
		let bossBattleId = req.body.bossBattleId as number;
		let chainIndex = req.body.chainIndex as number;
		let trials = req.body.trials as CrewTrial[];

		if (!fleetId || !bossBattleId || !chainIndex || !trials) {
			res.status(400).send("Bad data");
		}

		let apiResult = await CollaborationAPI.postTrials(fleetId, bossBattleId, chainIndex, trials);

		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});


router.get('/getBossBattle', async (req: Request, res: Response, next) => {
	if (!req.query || !req.query.fleetId || (!req.query.room && !req.query.id)) {
		res.status(400).send('Whaat?');
		return;
	}

	try {
		let room = undefined as string | undefined;
		let id = undefined as number | undefined;
		let fleetId: number | undefined = undefined;

		if (req.query.room) {
			room = req.query.room as string;
		}
		if (req.query.id) {
			id = Number.parseInt(req.query.id as string);
		}
		if (req.query.fleetId) {
			fleetId = Number.parseInt(req.query.fleetId as string);
		}
		else {
			res.status(500).send({});
			return;
		}

		let apiResult = await CollaborationAPI.getCollaboration(fleetId, id, room);
		res.status(apiResult.Status).send(apiResult.Body);
	} catch (e) {
		next(e);
	}
});

// Export the express.Router() instance to be used by server.ts
export const ApiController: Router = router;
