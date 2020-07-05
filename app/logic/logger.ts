import winston from 'winston';
require('winston-daily-rotate-file');

export let Logger = winston.createLogger({
	level: 'info',
	transports: [
		new (winston.transports as any).DailyRotateFile({ dirname: './logs' }),
		new winston.transports.Console({ format: winston.format.simple() }),
		new winston.transports.File({ filename: './logs/error.log', level: 'error' })
	]
});

export class LogData {
	ip: string = '';
	cfCountry?: string;
	userAgent?: string;
};
