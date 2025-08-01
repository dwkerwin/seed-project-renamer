#!/usr/bin/env node

/**
 * Seed Project Rename and Cleanup Utility
 * 
 * This script:
 * 1. Renames all occurrences of the specified seed project name throughout the codebase
 * 2. Updates package.json to remove the rename script
 * 3. Removes itself and its directory when finished
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { glob } = require('glob');

// Generate seed project name variations
function generateSeedVariations(seedName) {
  const kebab = seedName;
  const lowerKebab = seedName.toLowerCase();
  
  const pascal = seedName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  const camel = seedName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const snake = seedName.replace(/-/g, '_').toLowerCase();
  const snakePascal = seedName.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('_');
  
  // Create shortened version for target group name if needed
  let tgBase = seedName;
  if (seedName.length > 29) {
    tgBase = seedName.replace(/[aeiou]/g, '').substring(0, 29);
  }
  const tg = tgBase + "-tg";
  const tgLower = tgBase.toLowerCase() + "-tg";
  
  return { kebab, pascal, camel, snake, snakePascal, tg, tgLower, lowerKebab };
}

// Auto-detect seed project name from package.json or folder name
function autoDetectSeedName() {
  // Method 1: Check package.json files (Node.js projects)
  const packageJsonPaths = [
    path.join(process.cwd(), 'package.json'),
    path.join(process.cwd(), 'src', 'package.json')
  ];
  
  for (const packageJsonPath of packageJsonPaths) {
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const name = packageJson.name;
        
        // Check if this looks like a seed project name
        if (name && name.startsWith('seed-')) {
          console.log(`🔍 Auto-detected seed project: ${name} (from ${packageJsonPath})`);
          return name;
        }
      } catch (error) {
        // Continue to next method if this one has issues
        continue;
      }
    }
  }
  
  // Method 2: Use current directory name (language agnostic)
  const currentDir = path.basename(process.cwd());
  if (currentDir && currentDir.startsWith('seed-')) {
    console.log(`🔍 Auto-detected seed project: ${currentDir} (from directory name)`);
    return currentDir;
  }
  
  // If we can't auto-detect, provide helpful error
  return null;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    projectName: null,
    fromSeed: null, // Will auto-detect if not provided
    isDotNet: false,
    help: false,
    version: false
  };

  // Check for options
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--from' && i + 1 < args.length) {
      result.fromSeed = args[i + 1];
      i++; // Skip next argument since it's the value for --from
    } else if (arg === '--dotnet') {
      result.isDotNet = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (!arg.startsWith('--') && !result.projectName) {
      // First non-option argument is the project name
      result.projectName = arg;
    }
  }
  
  return result;
}

// Wrapper for process.exit to allow for stubbing in tests
const utils = {
  exit: (code) => {
    process.exit(code);
  }
};

// Main function
async function main(options = {}) {
  // Parse command line arguments
  const args = parseArgs();
  
  // Show help if requested
  if (args.help) {
    console.log(`
Usage: npx @dwkerwin/seed-project-renamer [options] your-project-name

Options:
  --from <name>   Source seed project name to rename from (auto-detects if not provided)
  --dotnet        Process as a .NET project (handle .csproj files and solution structure)
  --version, -v   Show version number
  --help, -h      Show this help message

Examples:
  npx @dwkerwin/seed-project-renamer my-new-service
  npx @dwkerwin/seed-project-renamer --from seed-nodejs-npm-lib my-new-service
  npx @dwkerwin/seed-project-renamer --from seed-nodejs-koa-nextjs-ecsfargate-api my-api
  npx @dwkerwin/seed-project-renamer --dotnet --from seed-csharp-api MyNewApi

Note: When --from is not specified, the tool will auto-detect the seed project name
by looking for seed-* names in package.json files, or by using the directory name.
`);
    utils.exit(0);
  }

  // Show version if requested
  if (args.version) {
    const packageJson = require('./package.json');
    console.log(packageJson.version);
    utils.exit(0);
  }

  // Get the new project name from command line
  const name = options.projectName || args.projectName;
  let fromSeed = options.fromSeed || args.fromSeed;
  const isDotNet = options.isDotNet || args.isDotNet;

  if (!name) {
    console.error('❌ Error: Project name is required.');
    console.error('Usage: npx @dwkerwin/seed-project-renamer [--from <seed-name>] your-project-name');
    console.error('Run with --help for more examples.');
    utils.exit(1);
  }

  // Auto-detect seed name if not provided
  if (!fromSeed) {
    fromSeed = autoDetectSeedName();
    if (!fromSeed) {
      console.error('❌ Error: Could not auto-detect seed project name.');
      console.error('Please specify the source seed project with --from parameter.');
      console.error('');
      console.error('Examples:');
      console.error('  --from seed-nodejs-npm-lib');
      console.error('  --from seed-nodejs-koa-nextjs-ecsfargate');
      console.error('  --from seed-nodejs-koa-nextjs-ecsfargate-api');
      utils.exit(1);
    }
  }

  // Validate project name format (allow letters, numbers, and hyphens)
  if (!/^[a-zA-Z0-9-]+$/.test(name)) {
    console.error('❌ Error: Project name must contain only letters, numbers, and hyphens.');
    utils.exit(1);
  }

  // Generate seed name variations
  const seedConfig = generateSeedVariations(fromSeed);
  
  console.log(`🔍 Renaming from seed: ${fromSeed}`);
  console.log(`🚀 Renaming project to: ${name}`);

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
  const nameSnakePascal = name.split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('_');

  // Generate abbreviated version for the new name using the same simple logic
  const nameParts = name.split('-');
  let nameAbbreviated = '';
  if (nameParts.length >= 2) {
    // For "my-new-project", this creates "my_new_project" (just use all parts for new names)
    nameAbbreviated = nameParts.join('_');
  }

  // Create shortened version for target group name if needed
  let nameTg = name;
  if (name.length > 29) {
    nameTg = name.replace(/[aeiou]/g, '').substring(0, 29);
  }
  nameTg += "-tg";

  // Define ignore patterns for files we don't want to process
  const ignorePatterns = [
    // Dependencies
    '**/node_modules/**',
    
    // Version control
    '**/.git/**',
    
    // Build outputs and cache directories
    '**/build/**',
    '**/dist/**',
    '**/.next/**',
    '**/out/**',
    '**/coverage/**',
    '**/.terraform/**',
    '**/.terraform.lock.hcl',
    
    // Cache and temporary files
    '**/.cache/**',
    '**/tmp/**',
    '**/temp/**',
    '**/.temp/**',
    
    // Log files
    '**/*.log',
    '**/logs/**',
    
    // IDE and editor files
    '**/.vscode/**',
    '**/.idea/**',
    '**/*.swp',
    '**/*.swo',
    '**/*~',
    
    // OS files
    '**/.DS_Store',
    '**/Thumbs.db',
    
    // Package manager files (these get regenerated)
    '**/package-lock.json',
    '**/yarn.lock',
    '**/pnpm-lock.yaml',
    
    // TypeScript build info
    '**/*.tsbuildinfo',
    
    // Seed project specific cleanup
    '**/scripts/init/**',
    
    // Binary files
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
    '**/*.bin',
    '**/*.dll',
    '**/*.pdb'
  ];

  // Define replacements
  const replacements = [
    // Handle the more specific target group names first
    { from: seedConfig.tg, to: nameTg },
    { from: seedConfig.tgLower, to: nameTg.toLowerCase() },

    // Handle the full project name first (most specific)
    { from: seedConfig.kebab, to: name },
    { from: seedConfig.lowerKebab, to: name.toLowerCase() },

    // Handle structured cases
    { from: seedConfig.pascal, to: namePascal },
    { from: seedConfig.camel, to: nameCamel },
    { from: seedConfig.snake, to: nameSnake },
    { from: seedConfig.snakePascal, to: nameSnakePascal },
    
    // Handle exact namespace patterns for .NET projects (like SeedDotnetRestapiEcsFargate)
    // This catches patterns that don't match the standard camel/pascal case due to mixed casing
    { from: seedConfig.kebab.replace(/-/g, ''), to: nameCamel },
    
    // Handle the exact mixed-case namespace pattern found in .NET projects
    { from: 'SeedDotnetRestapiEcsFargate', to: nameCamel },
    
    // Handle standalone "seed" references last (least specific)
    { from: 'Seed Project', to: `${name.charAt(0).toUpperCase() + name.slice(1)} Project` },
    { from: 'seed project', to: `${name} project` },
    { from: 'Seed', to: name.charAt(0).toUpperCase() + name.slice(1) },
    { from: 'seed', to: name.split('-')[0] || 'project' },
  ];

  try {
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
    console.log('🔄 Renaming directories and files...');
    
    // Get the parent directory of the current working directory
    const currentDir = process.cwd();
    const parentDir = path.dirname(currentDir);
    const baseName = path.basename(currentDir);
    
    if (isDotNet) {
      // Rename directories for .NET projects
      renameIfExists(
        path.join(process.cwd(), seedConfig.camel), 
        path.join(process.cwd(), nameCamel)
      );
      
      renameIfExists(
        path.join(process.cwd(), `${seedConfig.camel}.Tests`), 
        path.join(process.cwd(), `${nameCamel}.Tests`)
      );
      
      // Rename solution file - look for any .sln file that contains the seed name patterns
      const solutionFiles = fs.readdirSync(process.cwd()).filter(file => {
        if (!file.endsWith('.sln')) return false;
        const fileLower = file.toLowerCase();
        
        // Try multiple patterns to match the solution file
        return fileLower.includes(seedConfig.kebab.toLowerCase().replace(/-/g, '')) ||
               fileLower.includes(seedConfig.pascal.toLowerCase()) ||
               fileLower.includes(seedConfig.camel.toLowerCase());
      });
      
      if (solutionFiles.length > 0) {
        const oldSolutionFile = solutionFiles[0];
        const newSolutionFile = `${nameCamel}.sln`;
        renameIfExists(
          path.join(process.cwd(), oldSolutionFile), 
          path.join(process.cwd(), newSolutionFile)
        );
      }
      
      // Rename .csproj files
      renameIfExists(
        path.join(process.cwd(), nameCamel, `${seedConfig.camel}.csproj`), 
        path.join(process.cwd(), nameCamel, `${nameCamel}.csproj`)
      );
      
      renameIfExists(
        path.join(process.cwd(), `${nameCamel}.Tests`, `${seedConfig.camel}.Tests.csproj`), 
        path.join(process.cwd(), `${nameCamel}.Tests`, `${nameCamel}.Tests.csproj`)
      );
      
      // Rename the main project directory for .NET projects
      if (baseName === seedConfig.kebab) {
        renameIfExists(
          currentDir,
          path.join(parentDir, name.toLowerCase())
        );
      }
    } else {
      // Rename directories for non-.NET projects (Node.js, etc.)
      // Check for directories that match the seed project name in various formats
      
      // Try kebab-case directory (most common for Node.js projects)
      if (baseName === seedConfig.kebab) {
        renameIfExists(
          currentDir,
          path.join(parentDir, name.toLowerCase())
        );
      }
      
      // Try PascalCase directory
      if (baseName === seedConfig.pascal) {
        renameIfExists(
          currentDir,
          path.join(parentDir, namePascal)
        );
      }
      
      // Try CamelCase directory
      if (baseName === seedConfig.camel) {
        renameIfExists(
          currentDir,
          path.join(parentDir, nameCamel)
        );
      }
      
      // Try snake_case directory
      if (baseName === seedConfig.snake) {
        renameIfExists(
          currentDir,
          path.join(parentDir, nameSnake)
        );
      }
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
    
    // Remove initialization scripts directory if it exists
    const initScriptsPath = path.join(process.cwd(), 'scripts', 'init');
    if (fs.existsSync(initScriptsPath)) {
      console.log('Removing initialization scripts directory...');
      fs.rmSync(initScriptsPath, { recursive: true, force: true });
      
      // Check if scripts directory is empty and remove it if it is
      const scriptsPath = path.join(process.cwd(), 'scripts');
      if (fs.existsSync(scriptsPath)) {
        const scriptsContents = fs.readdirSync(scriptsPath);
        if (scriptsContents.length === 0) {
          console.log('Removing empty scripts directory...');
          fs.rmSync(scriptsPath, { recursive: true, force: true });
        }
      }
    }
    
    // Update package-lock.json to match new name
    try {
      console.log('Regenerating package-lock.json...');
      execSync('npm install', { stdio: 'inherit' });
    } catch (error) {
      console.log('Warning: Could not regenerate package-lock.json. You should run npm install manually.');
    }
    
    console.log('\n🎉 All done! Your project is ready to use.');
    console.log('\nRemember to:');
    
    if (isDotNet) {
      console.log('1. Update project dependencies (run \'dotnet restore\')');
      console.log(`2. Review your Terraform resources in ${nameCamel}/terraform/main.tf`);
    } else {
      console.log('1. Update package-lock.json (run \'npm install\')');
      if (fs.existsSync(path.join(process.cwd(), 'src'))) {
        console.log('2. Review your Terraform resources in src/terraform/main.tf');
      } else {
        console.log('2. Review your project structure and configuration');
      }
    }
    
    console.log('3. Update README.md with:');
    console.log('   - A clear description of your service\'s purpose');
    console.log('   - Update the title and introduction');
    console.log('   - Remove the \'Renaming the Seed Project\' section');
    console.log('4. Regenerate package-lock.json with: npm install');
    
    return { success: true, name };
  } catch (error) {
    console.error('❌ Error during rename process:', error);
    console.error('Stack:', error.stack);
    utils.exit(1);
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
module.exports.utils = utils;

// Run the main function if this script is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Unhandled error:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
} 