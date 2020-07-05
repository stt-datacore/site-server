import { Comment } from '../models/Comment';
import { User } from '../models/User';

export async function loadCommentsDB(symbol: string) {
	if (!symbol) {
		throw new Error('Invalid symbol!');
	}

	let res = await Comment.findAll({ where: { symbol }, include: [{model: User, attributes: ['id', 'loginUserName', 'avatar']}] });
	return res;
}

export async function saveCommentDB(symbol: string, markdown: string, userId: number, booknote: boolean = false, lastUpdate: Date = new Date()) {
	let res = await Comment.findAll({ where: { symbol, userId } });
	if (res.length === 0) {
		return await Comment.create({ symbol, userId, markdown, lastUpdate, booknote });
	} else {
		return await Comment.update({ symbol, userId, markdown, lastUpdate, booknote }, { where: { symbol, userId } });
	}
}
