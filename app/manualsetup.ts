import { sequelize } from './sequelize';
import { addBookUser } from './logic/profiletools';

(async () => {
	await sequelize.sync();

	let myArgs = process.argv.slice(2);

	console.log(`adding new user: '${myArgs[0]}',password: '${myArgs[1]}'`);
	let res = await addBookUser(myArgs[0], myArgs[1]);

	console.log(res);
})();
