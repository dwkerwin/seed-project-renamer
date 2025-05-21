/**
 * Seed Project Renamer
 * 
 * Main module exports for programmatic usage.
 */

const rename = require('./rename');

// Export the renaming functionality
module.exports = {
  // Function to programmatically rename a project
  rename: (projectName) => {
    // If project name is provided, set it in argv
    if (projectName) {
      process.argv[2] = projectName;
    }
    
    // Call the main function
    return rename();
  }
}; 