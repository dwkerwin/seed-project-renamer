/**
 * Mocha root setup file
 * This file combines test environment setup and global hooks
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.dev file
console.log('Loading test environment from .env.dev');
dotenv.config({ path: path.join(__dirname, '../.env.dev') });

// Set default region if not specified
if (!process.env.AWS_REGION) {
  console.log('Setting default AWS_REGION to us-east-1');
  process.env.AWS_REGION = 'us-east-1';
}

// Log basic configuration
console.log(`Environment: ${process.env.AWS_ENV || 'dev'}`);
console.log(`Region: ${process.env.AWS_REGION}`);
console.log(`Log level: ${process.env.LOG_LEVEL || 'info'}`);

// Global Mocha hooks for test setup and cleanup
const { cleanupAllTestResources } = require('./utils/testCleanup');
const logger = require('../logger');

// Run this after all tests in the entire suite have completed
exports.mochaHooks = {
  afterAll: async function() {
    this.timeout(30000);
    try {
      logger.info('All tests completed, running test resource cleanup...');
      await cleanupAllTestResources();
      logger.info('Test resource cleanup completed');
    } catch (error) {
      logger.error({ err: error }, 'Failed to clean up test resources');
      // We don't rethrow the error here as we don't want cleanup failures
      // to cause test failures - tests have already passed at this point
    }
  }
}; 