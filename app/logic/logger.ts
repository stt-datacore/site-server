import winston from 'winston';
require('winston-daily-rotate-file');

require('dotenv').config();

export let Logger = winston.createLogger({
	level: 'info',
	transports: [
		new (winston.transports as any).DailyRotateFile({ dirname: process.env.LOG_PATH ? `${process.env.LOG_PATH}/sitelogs` : './logs' }),
		new winston.transports.Console({ format: winston.format.simple() }),
		new winston.transports.File({ filename: process.env.LOG_PATH ? `${process.env.LOG_PATH}/sitelogs/error.log` : './logs/error.log', level: 'error' })
	]
});

export class LogData {
	ip: string = '';
	cfCountry?: string;
	userAgent?: string;
	requestedWith?: string;
};
