const config = require('@dwkerwin/ssm-config');

const configMap = {
    AWS_REGION: { envVar: 'AWS_REGION', fallbackStatic: 'us-east-1', type: 'string' },
    AWS_ENV: { envVar: 'AWS_ENV', fallbackSSM: '/example-org/aws_env', type: 'string' },
    LOG_LEVEL: { envVar: 'LOG_LEVEL', fallbackStatic: 'info', type: 'string' },
    SQS_QUEUE_NAME: { envVar: 'SQS_QUEUE_NAME', fallbackStatic: 'seed-nodejs-sqs-consumer-lambda-queue', type: 'string' }
};

config.configMap = configMap;

module.exports = config; 