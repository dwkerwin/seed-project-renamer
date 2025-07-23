const logger = require('./logger');

/**
 * Process a message from the SQS queue
 * 
 * This handles SNS messages from the SQS queue. When using SNS -> SQS -> Lambda
 * pattern, the SQS message body contains an SNS notification with the actual
 * message in the "Message" field.
 * 
 * @param {string} rawMessage - The raw message body string from SQS
 * @param {string} messageId - The SQS message ID for logging
 * @returns {Promise<boolean>} - Returns true on success
 * @throws {Error} - Throws error with property 'permanent' set to true/false
 *                   to indicate if the error should be retried
 */
async function processMessage(rawMessage, messageId) {
  // Step 1: Parse the SNS notification (the SQS body contains the SNS notification)
  let snsNotification;
  try {
    snsNotification = JSON.parse(rawMessage);
    logger.info({ snsNotification, messageId }, 'Parsed SNS notification');
  } catch (error) {
    // Invalid JSON is a permanent failure - no point retrying
    const parseError = new Error(`SNS notification parsing error: ${error.message}`);
    parseError.permanent = true; // Mark as permanent failure
    throw parseError;
  }

  // Step 2: Extract the actual message from SNS Message field
  let actualMessage;
  try {
    actualMessage = extractMessageFromSnsNotification(snsNotification, messageId);
    logger.info({ actualMessage, messageId }, 'Extracted actual message from SNS notification');
  } catch (error) {
    // SNS format errors are permanent
    const extractionError = new Error(`SNS message extraction error: ${error.message}`);
    extractionError.permanent = true;
    throw extractionError;
  }

  // Step 3: Validate message schema
  if (!isValidMessage(actualMessage)) {
    // Invalid schema is a permanent failure
    const validationError = new Error('Invalid message schema');
    validationError.permanent = true;
    throw validationError;
  }

  // Step 4: Process the message with business logic
  try {
    // In a real implementation, this is where you would implement your
    // business logic for handling the message, such as:
    // - Saving data to a database
    // - Calling other services or APIs
    // - Performing calculations or transformations
    // - Sending push notifications, emails, etc.

    // Implement actual business logic here using the extracted actualMessage
    // ...

    logger.info({ messageId }, 'Successfully processed message');
    
    // Return true to indicate successful processing
    return true;
  } catch (error) {
    // Error handling: For SQS consumers, we need to distinguish between:
    // - Permanent errors (validation, bad data): Set error.permanent = true
    // - Transient errors (network, throttling): Set error.permanent = false

    // By default, mark errors as retryable unless already marked permanent
    if (!error.permanent) {
      error.permanent = false;
    }
    
    throw error;
  }
}

/**
 * Extracts the actual message from the SNS notification
 * 
 * When using SNS -> SQS -> Lambda pattern, the SQS message body contains
 * an SNS notification with the actual message in the "Message" field.
 * 
 * @param {Object} snsNotification - The parsed SNS notification
 * @param {string} messageId - The message ID for logging  
 * @returns {Object} The actual message content
 * @throws {Error} If the SNS notification format is invalid
 */
function extractMessageFromSnsNotification(snsNotification, messageId) {
  // Validate SNS notification structure
  if (!snsNotification || typeof snsNotification !== 'object') {
    throw new Error('SNS notification is not a valid object');
  }

  // Check for required SNS notification fields
  if (!snsNotification.Message) {
    throw new Error(`SNS notification missing Message field. Available keys: ${Object.keys(snsNotification).join(', ')}`);
  }

  // Parse the actual message content from the SNS Message field
  let messageContent;
  try {
    messageContent = JSON.parse(snsNotification.Message);
  } catch (error) {
    throw new Error(`Failed to parse SNS Message content as JSON: ${error.message}. Message preview: ${snsNotification.Message?.substring(0, 200) || 'null'}`);
  }

  logger.debug('Successfully extracted message from SNS notification', { 
    snsSubject: snsNotification.Subject,
    snsTopicArn: snsNotification.TopicArn,
    messageKeys: Object.keys(messageContent || {}),
    messageId 
  });

  return messageContent;
}

/**
 * Validates that the message conforms to the expected format
 * 
 * @param {Object} message - The parsed message
 * @returns {boolean} - True if message is valid
 */
function isValidMessage(message) {
  // Define your validation logic here
  // This is just a simple example - use a proper validation library in production
  
  // Example: Check that required fields exist
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  // Example: Check for required fields
  if (!message.id) {
    return false;
  }
  
  // If all validations pass, return true
  return true;
}

module.exports = processMessage; 