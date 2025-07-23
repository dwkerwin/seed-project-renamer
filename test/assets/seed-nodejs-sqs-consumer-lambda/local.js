/**
 * Local development script for testing the Lambda handler
 * 
 * This script simulates an SQS event to test the Lambda handler locally.
 * The SQS body contains an SNS notification (following SNS -> SQS -> Lambda pattern).
 */

// Load environment variables from .env files
const env = process.env.AWS_ENV || 'dev';
require('dotenv').config({ path: `.env.${env}`, silent: true });

const { handler } = require('./index');
const logger = require('./logger');

// Create a mock SQS event with an SNS notification in the message body
const createMockSqsEvent = (actualMessage) => {
  // Create an SNS notification that contains the actual message
  const snsNotification = {
    Type: 'Notification',
    MessageId: 'test-sns-message-id',
    TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
    Subject: 'Test Message from Local Development',
    Message: JSON.stringify(actualMessage),
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1',
    Signature: 'mock-signature',
    SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-mock.pem',
    UnsubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=mock'
  };

  // The SQS event contains the SNS notification as the body
  return {
    Records: [
      {
        messageId: '19dd0b57-b21e-4ac1-bd88-01bbb068cb78',
        receiptHandle: 'MessageReceiptHandle',
        body: JSON.stringify(snsNotification), // SNS notification as SQS body
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: Date.now().toString(),
          SenderId: 'AIDAIOA7XMPIGVK5QAYYS',
          ApproximateFirstReceiveTimestamp: Date.now().toString()
        },
        messageAttributes: {},
        md5OfBody: 'fce0ea8dd236ccb3ed9b37dae260836f',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:my-queue',
        awsRegion: 'us-east-1'
      }
    ]
  };
};

async function runLocal() {
  try {
    logger.info('Starting local execution of Lambda handler');

    // Create the actual message that would be sent to SNS
    const sampleMessage = {
      id: '12345',
      timestamp: new Date().toISOString(),
      data: {
        key1: 'value1',
        key2: 'value2',
        nested: {
          nestedKey: 'nestedValue'
        }
      }
    };

    // Create a mock SQS event that contains an SNS notification with the sample message
    const mockEvent = createMockSqsEvent(sampleMessage);

    // Create a mock context
    const mockContext = {
      functionName: 'local-function',
      awsRequestId: '12345',
      logGroupName: '/aws/lambda/local-function',
      logStreamName: '2023/01/01/[$LATEST]12345'
    };

    logger.info({ mockEvent }, 'Invoking handler with mock event');

    // Invoke the handler with the mock event
    const result = await handler(mockEvent, mockContext);

    logger.info({ result }, 'Handler execution complete');
  } catch (error) {
    logger.error({ error }, 'Error during local execution');
    process.exit(1);
  }
}

// Run the local execution if this script is called directly
if (require.main === module) {
  runLocal();
} 