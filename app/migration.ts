import { Op } from "sequelize";
import { CrewMember } from "./datacore/crew";
import { Historical, Voyage } from "./models/VoyageRecord";

import fs from 'fs'
import { exit } from "process";
import { getHistoricalDb } from "./sequelize";


// Most of the of the code in this file is one-use migration.
// I'm keeping it in this repo "in case of fire" and what have you.

export async function utilityMethod() {

	type CatalogRecord = { duration: number, crew: string[], date?: Date };
	type VoyageCatalog = { [key: string]: CatalogRecord };	

	console.log("Reading crew roster...");
	const roster = JSON.parse(fs.readFileSync("../website/static/structured/crew.json", 'utf-8')) as CrewMember[];	
	
	console.log("Reading voyages ..."); 

	const distinctVoyages = JSON.parse(fs.readFileSync('static/stats/voyages_filtered.json', 'utf-8')) as VoyageCatalog;
	
	let i = 0;
	let ct = roster.length;
	
	console.log("Filtering ...");

	const seats = [
		'command_skill', 
		'command_skill', 
		'diplomacy_skill', 
		'diplomacy_skill', 
		'security_skill', 
		'security_skill', 
		'engineering_skill', 
		'engineering_skill', 
		'science_skill', 
		'science_skill', 
		'medicine_skill',
		'medicine_skill' 
	];

	// This section is for compiling statistics from a populated new Voyages database

	// const dsets = [{
	// 	date: new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)),
	// 	file: "one_year"
	// },
	// {
	// 	date: new Date(Date.now() - (182.5 * 24 * 60 * 60 * 1000)),
	// 	file: "six_months"
	// },
	// {
	// 	date: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)),
	// 	file: "one_week"
	// }];

	// for (let dset of dsets) {
	// 	let { date: d, file: fn } = dset;
	// 	console.log(`From ${d} as '${fn}'...`);
	// 	let results = await Voyage.findAll({ where: { voyageDate: { [Op.gte]: d } } });

	// 	type CrewPeople = {
	// 		crew: string,
	// 		seats: { seat: string, count: number, avgTime: number }[],
	// 		avgTime: number,
	// 		firstVoyage: Date,
	// 		mostRecentVoyage: Date,
	// 		grandTotal: number;
	// 	}
	
	// 	const cp = {} as { [key: string]: CrewPeople };
	
	// 	for (let res of results) {
	// 		let seat = 0;
	// 		if (!res.estimatedDuration) continue;
	// 		for (let c of res.crew) {
	// 			cp[c] ??= {
	// 				crew: c,
	// 				seats: [],
	// 				avgTime: 0,
	// 				firstVoyage: res.voyageDate,
	// 				mostRecentVoyage: res.voyageDate,
	// 				grandTotal: 0
	// 			};
	// 			cp[c].grandTotal++;
	// 			cp[c].mostRecentVoyage = res.voyageDate;
	// 			cp[c].avgTime = ((cp[c].avgTime * cp[c].seats.length) + res.estimatedDuration) / (cp[c].seats.length + 1);
	// 			let currseat = cp[c].seats.find(s => s.seat === seats[seat]);
	// 			if (currseat) {
	// 				currseat.avgTime = ((currseat.avgTime * currseat.count) + res.estimatedDuration) / (currseat.count + 1);
	// 				currseat.count++;
	// 			}
	// 			else {
	// 				cp[c].seats.push({
	// 					seat: seats[seat],
	// 					count: 1,
	// 					avgTime: res.estimatedDuration
	// 				})
	// 			}
	// 			seat++;
	// 		}
	// 	}

	// 	let finalOut = Object.values(cp);

	// 	finalOut.sort((a, b) => b.grandTotal - a.grandTotal);
	
	// 	fs.writeFileSync(`static/stats/${fn}.json`, JSON.stringify(finalOut));
	
	// }

	// // This section is for converting the file.
	// await Voyage.sync({ alter: true });
	
	// const voykeys = Object.keys(distinctVoyages);
	// let yago = (new Date(Date.now() - (365 * 24 * 60 * 60 * 1000))).getTime();
	// let vid = 1;
	
	// for (let key of voykeys) {
	// 	let [dstr, ] = key.split("_");
	// 	const voyDate = new Date(dstr);
	// 	if (voyDate.getTime() < yago) continue;
	// 	const data = distinctVoyages[key];
		
	// 	console.log(`Creating Voyage ${voyDate}...`);
		
	// 	try {
	// 		await Voyage.create({
	// 			estimatedDuration: data.duration,
	// 			crew: data.crew,
	// 			voyageDate: voyDate
	// 		});
	// 	}
	// 	catch (err: any) {
	// 		console.log(err);
	// 	}
	// }


	// This section is for historical data.
	let sql = await getHistoricalDb();
	if (!sql) exit(1);

	await Historical.sync({ alter: true });
	
	const voykeys = Object.keys(distinctVoyages);
	let yago = (new Date(Date.now() - (365 * 24 * 60 * 60 * 1000))).getTime();
	let vid = 1;
	
	for (let key of voykeys) {
		let [dstr, ] = key.split("_");
		const voyDate = new Date(dstr);
		if (voyDate.getTime() >= yago) continue;
		const data = distinctVoyages[key];
		
		console.log(`Creating Voyage ${voyDate}...`);
		
		try {
			await Historical.create({
				estimatedDuration: data.duration,
				crew: data.crew,
				voyageDate: voyDate
			});
		}
		catch (err: any) {
			console.log(err);
		}
	}


	// for (let yr = 2021; yr <= 2023; yr++) {
	// 	for (let mo = 1; mo <= 12; mo++) {
	// 		let movoys = [] as CatalogRecord[];
	// 		let m = (mo < 10 ? "0" : "") + mo.toString();
	// 		let my = `${yr}-${m}-`;
	// 		console.log(`Reading Month ${my}...`);

	// 		let mokeys = voykeys.filter(v => v.startsWith(my));
	// 		console.log(`It appears ${mokeys.length} voyages ran in this month...`);
	// 		if (!mokeys.length) continue;
			
	// 		for (let key of mokeys) {
	// 			let [dts, ] = key.split("_");
	// 			let kdate = new Date(dts);
	// 			movoys.push({ ...distinctVoyages[key], date: kdate });
	// 		}
			
	// 		console.log(`Writing Month ${my}...`);
	// 		fs.writeFileSync(`static/stats/VOY_${my}.json`, JSON.stringify(movoys));
	// 	}
	// }

	// const goodVoyages = {} as VoyageCatalog;

	// Object.keys(distinctVoyages).forEach((key) => {
	// 	let tpass = 0;
		
	// 	for (i = 0; i < 12; i++) {
	// 		let crew = roster.find(f => f.symbol === distinctVoyages[key].crew[i]);
	// 		if (!crew) break;
	// 		if (seats[i] in crew?.base_skills) {
	// 			tpass++;
	// 		}
	// 	}

	// 	if (tpass === 12) {
	// 		goodVoyages[key] = distinctVoyages[key];
	// 	}
	// });


	// const outkeys = Object.keys(goodVoyages);
	
	// console.log(`Input Records: ${keys.length}`);
	// console.log(`Output Records: ${outkeys.length}`);

	// fs.writeFileSync('static/stats/voyages_filtered.json', JSON.stringify(goodVoyages));

	// const distinctVoyages = {} as VoyageCatalog;

	// let rc = 0;						
	// let voys = 0;

	// let numrecs = await VoyageRecord.count();

	// for (let i = 0; i < numrecs; i += 288000) {
	// 	let records = await VoyageRecord.findAll({ offset: i, limit: 288000 });
	// 	if (records?.length) {
	// 		let voyKey = "";
	// 		console.log(`Doing voyage ${i+1} ...`);

	// 		for (let record of records) {
	// 			if (!record.estimatedDuration) continue;
	// 			if (!record.voyageDate) continue;

	// 			record.voyageDate.setMilliseconds(0);
	// 			voyKey = record.voyageDate.toISOString() + "_" + record.estimatedDuration.toString();

	// 			if (!(voyKey in distinctVoyages)) {
	// 				distinctVoyages[voyKey] = { duration: record.estimatedDuration, crew: [] };
	// 				voys++;
	// 			}

	// 			distinctVoyages[voyKey].crew.push(record.crewSymbol);
	// 		}			
			
	// 		records.length = 0;
	// 		console.log(`${voys} Unique voyages so far ...`);
	// 	}
	// }

	// for (let crew of roster) {
	// 	i++;
	// 	let records = await VoyageRecord.findAll({ where: { crewSymbol: crew.symbol }});
	// 	if (records?.length) {
	// 		console.log(`Compiling records for crew Member: ${crew.name} (${i}/${ct}), Total Records: ${records.length}`);
	// 		for (let record of records) {
	// 			if (!record.estimatedDuration) continue;
	// 			record.voyageDate.setMilliseconds(0);
	// 			let voyKey = record.voyageDate.toISOString() + "_" + record.estimatedDuration.toString();
	// 			if (!(voyKey in distinctVoyages)) {
	// 				voys++;
	// 				distinctVoyages[voyKey] = { duration: record.estimatedDuration, crew: [] };
	// 			}
	// 			distinctVoyages[voyKey].crew.push(record.crewSymbol);
	// 			rc++;
	// 		}
			
	// 		console.log(`${voys} Unique voyages tallied (${rc} records) ...`);
	// 	}
	// }

	// const newDistincts = {} as VoyageCatalog;
	// const keys = Object.keys(distinctVoyages);

	
	// let lastBad = undefined as CatalogRecord | undefined;

	// Object.keys(distinctVoyages).forEach((key) => {
	// 	let data = distinctVoyages[key];
	// 	if (data.crew.length === 12) {
	// 		newDistincts[key] = data; 
	// 	}
	// 	else {
	// 		console.log(`Voyage '${key}' Not 12 Crew!`);
	// 		if (lastBad) {
	// 			if (lastBad.duration === data.duration && lastBad.crew.length + data.crew.length === 12) {
	// 				console.log("Putting Humpty Dumpty Together Again!");
	// 				data.crew = lastBad.crew.concat(data.crew);
	// 				newDistincts[key] = data; 					
	// 				lastBad = undefined;
	// 			}
	// 			else {
	// 				lastBad = data;
	// 			}
	// 		}
	// 		else {
	// 			lastBad = data;
	// 		}
			
	// 	}
	// });

	// const outkeys = Object.keys(newDistincts);
	
	// console.log(`Input Records: ${keys.length}`);
	// console.log(`Output Records: ${outkeys.length}`);

	// fs.writeFileSync('static/stats/voyages.json', JSON.stringify(newDistincts));
	console.log("Task complete. Quit.");
}
