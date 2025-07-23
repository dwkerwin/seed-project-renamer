const bunyan = require('bunyan');
const chalk = require('chalk');

let name = 'seed-nodejs-sqs-consumer-lambda';
let shortName = 'seed-nodejs-sqs-consumer-lambda';

class CompactStream extends require('stream').Writable {
    write(record) {
        const obj = typeof record === 'string' ? JSON.parse(record) : record;
        const time = new Date(obj.time).toISOString();
        
        const levelColors = {
            10: chalk.gray('TRACE '),
            20: chalk.gray('DEBUG '),
            30: chalk.cyan('INFO  '),
            40: chalk.yellow('WARN  '),
            50: chalk.red('ERROR '),
            60: chalk.bgRed.white('FATAL ')
        };
        
        const levelOutput = levelColors[obj.level] || chalk.white('UNKNOWN');
        // Extract and format object data, ignoring standard Bunyan fields
        const standardFields = ['v', 'level', 'name', 'hostname', 'pid', 'time', 'msg'];
        const objData = Object.keys(obj)
            .filter(key => !standardFields.includes(key))
            .reduce((acc, key) => {
                const value = typeof obj[key] === 'object' ? 
                    JSON.stringify(obj[key]) : obj[key];
                acc[key] = value;
                return acc;
            }, {});
        
        const objStr = Object.keys(objData).length > 0 ? 
            chalk.gray(` ${JSON.stringify(objData)}`) : '';
            
        console.log(`[${time}] ${levelOutput}: ${chalk.cyan(shortName)}: ${obj.msg}${objStr}`);
        return true;
    }
}

const usePrettyLogs = process.stdout.isTTY && !process.env.FORCE_FULL_LOGS;

const loggerConfig = {
    name: name,
    streams: [
        {
            level: process.env.LOG_LEVEL || 'info',
            stream: usePrettyLogs ? new CompactStream() : process.stdout
        }
    ],
    ...((!usePrettyLogs) && {
        hostname: require('os').hostname(),
        pid: process.pid
    }),
    src: false
};

module.exports = bunyan.createLogger(loggerConfig);
