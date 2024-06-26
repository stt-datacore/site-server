import { Router, Request, Response } from 'express';
import { DataCoreAPI, LogData } from '../logic';

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

// Export the express.Router() instance to be used by server.ts
export const ApiController: Router = router;
