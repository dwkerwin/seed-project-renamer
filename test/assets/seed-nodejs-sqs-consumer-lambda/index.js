// Load environment variables from .env files
// This will not throw if files are missing
const env = process.env.AWS_ENV || 'dev';
require('dotenv').config({ path: `.env.${env}`, silent: true });
// Also try to load secrets file (may not exist in repo, only locally)
require('dotenv').config({ path: `.env.${env}.secrets`, silent: true });

const { SQSClient } = require('@aws-sdk/client-sqs');
const config = require('./ssmConfig');
const logger = require('./logger');
const processMessage = require('./processMessage');

// Create SQS client
const sqsClient = new SQSClient({ region: config.AWS_REGION });

/**
 * Lambda handler that processes SQS messages
 * 
 * @param {Object} event - The Lambda event object containing SQS messages
 * @param {Object} context - The Lambda context object
 * @returns {Promise<Object>} - Processing results
 */
exports.handler = async (event, context) => {
  // Initialize configuration
  await config.initializeConfig(
    process.env.SSM_PARAMETER_KMS_KEY || 'alias/example-ssm-key'
  );
  
  logger.info({ event }, 'Received SQS event');
  
  const results = {
    batchItemFailures: []
  };
  
  // Check if there are no records
  if (!event.Records || event.Records.length === 0) {
    logger.info('No SQS messages to process');
    return results;
  }
  
  logger.info(`Processing ${event.Records.length} SQS messages`);
  
  // Process each message in the batch
  const processingPromises = event.Records.map(async (record) => {
    const messageId = record.messageId;
    try {
      logger.info({ messageId }, 'Processing message');
      
      // Process the message using processMessage function
      // This handles parsing, validation, and business logic
      const processResult = await processMessage(record.body, messageId);
      
      // processMessage returns true on success
      if (processResult !== true) {
        logger.warn({ messageId, processResult }, 'Message processed with non-success result');
      } else {
        logger.info({ messageId }, 'Successfully processed message');
      }
      
      return { success: true, messageId };
    } catch (error) {
      // Check if this is marked as a permanent error
      if (error.permanent === true) {
        // For permanent failures, log as error but don't add to batchItemFailures
        // This will remove the message from the queue without retrying
        logger.error(
          { error, messageId }, 
          'Permanent error processing message - will not retry'
        );
        return { success: false, messageId, error: error.message, permanent: true };
      } else {
        // For transient/retryable errors, add to batchItemFailures for retry
        logger.error(
          { error, messageId }, 
          'Retryable error processing message - will be retried'
        );
        results.batchItemFailures.push({ itemIdentifier: messageId });
        return { success: false, messageId, error: error.message, permanent: false };
      }
    }
  });
  
  // Wait for all messages to be processed
  const processResults = await Promise.all(processingPromises);
  
  // Count permanent failures vs retryable failures
  const permanentFailures = processResults.filter(r => r.success === false && r.permanent === true).length;
  const retryableFailures = results.batchItemFailures.length;
  
  logger.info({
    totalMessages: event.Records.length,
    successfulMessages: processResults.filter(r => r.success === true).length,
    permanentFailures,
    retryableFailures
  }, 'Completed processing batch');
  
  return results;
}; 