const { expect } = require('chai');
const processMessage = require('../processMessage');
const config = require('../ssmConfig');

describe('processMessage', () => {

  it('should process an SNS notification message successfully', async () => {
    // Create a test message that will be inside the SNS notification
    const testMessage = {
      id: 'test-123',
      timestamp: new Date().toISOString(),
      data: { key: 'value' }
    };

    // Create an SNS notification that contains the test message
    const snsNotification = {
      Type: 'Notification',
      MessageId: 'test-sns-message-id',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
      Subject: 'Test Message',
      Message: JSON.stringify(testMessage),
      Timestamp: new Date().toISOString()
    };

    // Call the processMessage function with the stringified SNS notification
    const result = await processMessage(JSON.stringify(snsNotification), 'test-message-id');
    
    // Verify the function returns true for successful processing
    expect(result).to.equal(true);
  });

  it('should throw a permanent error for invalid JSON in SNS notification', async () => {
    // Create an invalid JSON string
    const invalidJson = '{ "Type": "Notification", invalid json }';

    try {
      await processMessage(invalidJson, 'test-message-id');
      // If we get here, the test should fail
      expect.fail('Should have thrown an error for invalid JSON');
    } catch (error) {
      // Verify error is marked as permanent
      expect(error.permanent).to.equal(true);
      expect(error.message).to.include('SNS notification parsing error');
    }
  });

  it('should throw a permanent error for missing Message field in SNS notification', async () => {
    // Create an SNS notification missing the Message field
    const snsNotificationMissingMessage = {
      Type: 'Notification',
      MessageId: 'test-sns-message-id',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
      Subject: 'Test Message',
      // Missing Message field
      Timestamp: new Date().toISOString()
    };

    try {
      await processMessage(JSON.stringify(snsNotificationMissingMessage), 'test-message-id');
      expect.fail('Should have thrown an error for missing Message field');
    } catch (error) {
      expect(error.permanent).to.equal(true);
      expect(error.message).to.include('SNS notification missing Message field');
    }
  });

  it('should throw a permanent error for invalid JSON in SNS Message field', async () => {
    // Create an SNS notification with invalid JSON in Message field
    const snsNotificationWithInvalidMessage = {
      Type: 'Notification',
      MessageId: 'test-sns-message-id',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
      Subject: 'Test Message',
      Message: '{ "id": "test", invalid json }', // Invalid JSON
      Timestamp: new Date().toISOString()
    };

    try {
      await processMessage(JSON.stringify(snsNotificationWithInvalidMessage), 'test-message-id');
      expect.fail('Should have thrown an error for invalid JSON in Message field');
    } catch (error) {
      expect(error.permanent).to.equal(true);
      expect(error.message).to.include('Failed to parse SNS Message content as JSON');
    }
  });

  it('should throw a permanent error for invalid message schema', async () => {
    // Create a message without required 'id' field
    const messageWithoutId = {
      timestamp: new Date().toISOString(),
      data: { key: 'value' }
    };

    const snsNotification = {
      Type: 'Notification',
      MessageId: 'test-sns-message-id',
      TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
      Subject: 'Test Message',
      Message: JSON.stringify(messageWithoutId),
      Timestamp: new Date().toISOString()
    };

    try {
      await processMessage(JSON.stringify(snsNotification), 'test-message-id');
      expect.fail('Should have thrown an error for invalid message schema');
    } catch (error) {
      expect(error.permanent).to.equal(true);
      expect(error.message).to.include('Invalid message schema');
    }
  });

}); 