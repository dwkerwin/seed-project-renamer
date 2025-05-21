#!/usr/bin/env node

/**
 * Seed Project Rename and Cleanup Utility
 * 
 * This script:
 * 1. Renames all occurrences of the seed project name throughout the codebase
 * 2. Updates package.json to remove the rename script
 * 3. Removes itself and its directory when finished
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { glob } = require('glob');

// Define the seed project name (kebab-case)
const SEED_NAME_KEBAB = 'seed-nodejs-npm-lib';
const SEED_NAME_PASCAL = 'Seed-Nodejs-Npm-Lib';
const SEED_NAME_CAMEL = 'SeedNodejsNpmLib';
const SEED_NAME_SNAKE = 'seed_nodejs_npm_lib';
const SEED_TG_NAME = 'seed-nodejs-npm-lib-tg';

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    projectName: null,
    isDotNet: false,
    help: false
  };

  // Check for options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dotnet') {
      result.isDotNet = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (!arg.startsWith('--') && !result.projectName) {
      // First non-option argument is the project name
      result.projectName = arg;
    }
  }
  
  return result;
}

// Main function
async function main() {
  // Parse command line arguments
  const args = parseArgs();
  
  // Show help if requested
  if (args.help) {
    console.log(`
Usage: npx @dwkerwin/seed-project-renamer [options] your-project-name

Options:
  --dotnet    Process as a .NET project (handle .csproj files and solution structure)
  --help, -h  Show this help message

Examples:
  npx @dwkerwin/seed-project-renamer my-new-service
  npx @dwkerwin/seed-project-renamer --dotnet MyNewApi
`);
    process.exit(0);
  }

  // Get the new project name from command line
  const name = args.projectName;
  const isDotNet = args.isDotNet;

  if (!name) {
    console.error('Usage: npx @dwkerwin/seed-project-renamer your-project-name');
    process.exit(1);
  }

  // Validate project name format (allow letters, numbers, and hyphens)
  if (!/^[a-zA-Z0-9-]+$/.test(name)) {
    console.error('❌ Error: Project name must contain only letters, numbers, and hyphens.');
    process.exit(1);
  }

  // Generate variations of the new name
  const namePascal = name.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('-');

  // Convert to CamelCase (remove hyphens, capitalize each word)
  const nameCamel = name.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  // Convert to snake_case (lowercase with underscores)
  const nameSnake = name.replace(/-/g, '_').toLowerCase();

  // Create shortened version for target group name if needed
  let nameTg = name;
  if (name.length > 29) {
    nameTg = name.replace(/[aeiou]/g, '').substring(0, 29);
  }
  nameTg += "-tg";

  // Define ignore patterns for files we don't want to process
  const ignorePatterns = [
    '**/node_modules/**',
    '**/.git/**',
    // We will handle package-lock.json separately
    '**/scripts/init/**',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.png',
    '**/*.gif',
    '**/*.ico',
    '**/*.pdf',
    '**/*.zip',
    '**/*.tar',
    '**/*.gz',
    '**/*.jar',
    '**/*.exe',
    '**/*.bin'
  ];

  // Define replacements
  const replacements = [
    { from: SEED_NAME_KEBAB, to: name.toLowerCase() },
    { from: SEED_NAME_PASCAL, to: namePascal },
    { from: SEED_NAME_CAMEL, to: nameCamel },
    { from: SEED_NAME_SNAKE, to: nameSnake },
    { from: SEED_TG_NAME, to: nameTg }
  ];

  try {
    console.log(`🚀 Renaming project to: ${name}`);
    
    // Find all files in the project excluding ignored patterns
    const files = await glob('**/*', { 
      ignore: ignorePatterns,
      nodir: true,
      dot: true
    });
    
    console.log(`Found ${files.length} files to process`);
    
    // Track statistics
    const stats = {
      filesProcessed: 0,
      totalReplacements: 0,
      modifiedFiles: new Set()
    };
    
    // Process each file
    for (const file of files) {
      try {
        // Skip binary files by checking extension
        if (isBinaryFile(file)) {
          continue;
        }
        
        // Read file content
        let content = fs.readFileSync(file, 'utf8');
        let originalContent = content;
        let fileModified = false;
        
        // Apply each replacement
        for (const replacement of replacements) {
          if (content.includes(replacement.from)) {
            const tempContent = content;
            content = content.split(replacement.from).join(replacement.to);
            
            const occurrences = (tempContent.match(new RegExp(replacement.from, 'g')) || []).length;
            
            if (occurrences > 0) {
              console.log(`  - Replaced "${replacement.from}" with "${replacement.to}" in ${file} (${occurrences} occurrences)`);
              stats.totalReplacements += occurrences;
              fileModified = true;
            }
          }
        }
        
        // Write file if modified
        if (fileModified) {
          fs.writeFileSync(file, content, 'utf8');
          stats.modifiedFiles.add(file);
        }
        
        stats.filesProcessed++;
      } catch (err) {
        console.error(`Error processing file ${file}:`, err.message);
      }
    }
    
    console.log(`\nProcessed ${stats.filesProcessed} files`);
    console.log(`Modified ${stats.modifiedFiles.size} files`);
    console.log(`Made ${stats.totalReplacements} replacements\n`);
    
    // Rename directories and files
    if (isDotNet) {
      // Rename directories
      renameIfExists(
        path.join(process.cwd(), SEED_NAME_CAMEL), 
        path.join(process.cwd(), nameCamel)
      );
      
      renameIfExists(
        path.join(process.cwd(), `${SEED_NAME_CAMEL}.Tests`), 
        path.join(process.cwd(), `${nameCamel}.Tests`)
      );
      
      // Rename solution file
      renameIfExists(
        path.join(process.cwd(), `${SEED_NAME_CAMEL}.sln`), 
        path.join(process.cwd(), `${nameCamel}.sln`)
      );
      
      // Rename .csproj files
      renameIfExists(
        path.join(process.cwd(), nameCamel, `${SEED_NAME_CAMEL}.csproj`), 
        path.join(process.cwd(), nameCamel, `${nameCamel}.csproj`)
      );
      
      renameIfExists(
        path.join(process.cwd(), `${nameCamel}.Tests`, `${SEED_NAME_CAMEL}.Tests.csproj`), 
        path.join(process.cwd(), `${nameCamel}.Tests`, `${nameCamel}.Tests.csproj`)
      );
    }
    
    console.log(`\n✅ Project successfully renamed to: ${name}`);
    
    // Cleanup phase
    console.log('🧹 Cleaning up...');
    
    // Update package.json to remove the rename script
    const packageJsonPaths = [
      path.join(process.cwd(), 'package.json'),
      path.join(process.cwd(), 'src', 'package.json')
    ];
    
    for (const packageJsonPath of packageJsonPaths) {
      if (fs.existsSync(packageJsonPath)) {
        console.log(`Updating ${packageJsonPath}...`);
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Remove scripts
        if (packageJson.scripts) {
          delete packageJson.scripts.rename;
          delete packageJson.scripts.cleanup;
        }
        
        // Write the updated package.json
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
      }
    }
    
    // Create cleanup script
    const cleanupCommand = `
      echo "Removing initialization scripts directory...";
      rm -rf "${path.join(process.cwd(), 'scripts', 'init')}";
      
      # Check if scripts directory is empty and remove it if it is
      if [ -z "$(ls -A "${path.join(process.cwd(), 'scripts')}")" ]; then
        echo "Removing empty scripts directory...";
        rm -rf "${path.join(process.cwd(), 'scripts')}";
      fi
      
      # Only remove the root package.json if there's another one in src/
      if [ -f "${path.join(process.cwd(), 'src', 'package.json')}" ]; then
        echo "Removing root package.json (src/package.json exists)...";
        rm -f "${path.join(process.cwd(), 'package.json')}";
      else
        echo "Keeping root package.json (no src/package.json found)...";
      fi
      
      echo "\\n🎉 All done! Your project '${name}' is ready to use.";
      echo "\\nRemember to:";
      
      if [ "${isDotNet}" = "true" ]; then
        echo "1. Update project dependencies (run 'dotnet restore')";
        echo "2. Review your Terraform resources in ${nameCamel}/terraform/main.tf";
      else
        echo "1. Update package-lock.json (run 'npm install')";
        if [ -d "${path.join(process.cwd(), 'src')}" ]; then
          echo "2. Review your Terraform resources in src/terraform/main.tf";
        else
          echo "2. Review your project structure and configuration";
        fi
      fi
      
      echo "3. Update README.md with:";
      echo "   - A clear description of your service's purpose";
      echo "   - Update the title and introduction";
      echo "   - Remove the 'Renaming the Seed Project' section";
      
      echo "4. Regenerate package-lock.json with: npm install";
    `;
    
    // Create and execute the cleanup script
    const tempScriptPath = path.join(process.cwd(), '.temp-cleanup.sh');
    fs.writeFileSync(tempScriptPath, cleanupCommand, { mode: 0o755 });
    
    // Update package-lock.json to match new name before removing scripts
    try {
      console.log('Regenerating package-lock.json...');
      execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
      console.log('Warning: Could not regenerate package-lock.json. You should run npm install manually.');
    }
    
    execSync(`bash ${tempScriptPath} && rm ${tempScriptPath}`, { stdio: 'inherit' });
    
    return { success: true, name };
  } catch (error) {
    console.error('❌ Error during rename process:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Helper function to check if a file is likely binary
function isBinaryFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.ico', '.pdf', '.zip', 
                           '.tar', '.gz', '.jar', '.exe', '.bin', '.dll', '.pdb'];
  return binaryExtensions.includes(ext);
}

// Helper function to rename a file/directory if it exists
function renameIfExists(oldPath, newPath) {
  if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
    console.log(`Renaming: ${path.basename(oldPath)} -> ${path.basename(newPath)}`);
    fs.renameSync(oldPath, newPath);
    return true;
  }
  return false;
}

// Export the functionality for programmatic use
module.exports = main;

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
} 