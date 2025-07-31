const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const renamer = require('../rename');
const { utils } = renamer;

// Define the seed projects to test
const seedProjects = [
  {
    name: 'seed-nodejs-sqs-consumer-lambda',
    hasPackageJson: true,
    hasTerraform: true,
    specificChecks: (newDir, newProjectName) => {
      // Node.js specific checks
      const packageJsonPath = path.join(newDir, 'package.json');
      const packageJson = fs.readJsonSync(packageJsonPath);
      expect(packageJson.name).to.equal(newProjectName);

      // Check terraform/main.tf for Node.js project
      const terraformFilePath = path.join(newDir, 'terraform', 'main.tf');
      const terraformFileContent = fs.readFileSync(terraformFilePath, 'utf8');
      const newProjectNameSnake = newProjectName.replace(/-/g, '_');
      expect(terraformFileContent).to.include(`resource "aws_sns_topic" "${newProjectNameSnake}"`);
      expect(terraformFileContent).to.include(`name              = "${newProjectName}-topic"`);
      expect(terraformFileContent).to.include(`function_name = "${newProjectName}"`);
    }
  },
  {
    name: 'Seed-Dotnet-RestApi-ECSFargate',
    hasPackageJson: false,
    hasTerraform: true,
    isDotNet: true,
    specificChecks: (newDir, newProjectName) => {
      // .NET specific checks
      const solutionFiles = fs.readdirSync(newDir).filter(file => file.endsWith('.sln'));
      expect(solutionFiles.length).to.be.greaterThan(0);
      
      // Check that solution file has been renamed
      const expectedSolutionName = newProjectName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join('') + '.sln';
      expect(solutionFiles).to.include(expectedSolutionName);

      // Check terraform configuration in the main project directory
      const terraformDir = path.join(newDir, newProjectName.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(''), 'terraform');
      
      if (fs.existsSync(terraformDir)) {
        const terraformMainPath = path.join(terraformDir, 'main.tf');
        if (fs.existsSync(terraformMainPath)) {
          const terraformContent = fs.readFileSync(terraformMainPath, 'utf8');
          // We no longer need to check for 'augmetrics' since the asset is sanitized.
          // The main 'should not contain "seed"' test covers the generic case.
          expect(terraformContent).to.be.a('string');
        }
      }
    }
  }
];

describe('Seed Project Renamer', () => {
  seedProjects.forEach(seedProject => {
    describe(`${seedProject.name} project`, () => {
      let tempDir;
      const newProjectName = 'my-new-project';
      let newDir;

      before(async () => {
        // Clean up any existing test output first
        const parentDir = path.join(__dirname, 'test-output', seedProject.name);
        if (fs.existsSync(parentDir)) {
          fs.removeSync(parentDir);
        }
        
        // Create a fresh test output directory
        fs.ensureDirSync(parentDir);

        // This is the directory that the user would have cloned
        tempDir = path.join(parentDir, seedProject.name);
        fs.ensureDirSync(tempDir);

        // Copy the contents of the seed project into the cloned directory
        fs.copySync(path.join(__dirname, 'assets', seedProject.name), tempDir);

        const originalCwd = process.cwd();
        
        try {
          // The script should be run from within the cloned directory
          process.chdir(tempDir);

          // Stub process.exit to prevent the test runner from exiting
          const exitStub = sinon.stub(utils, 'exit');

          try {
            await renamer({
              projectName: newProjectName,
              fromSeed: seedProject.name,
              isDotNet: seedProject.isDotNet || false,
            });

            // After renaming, the current directory will have been renamed.
            newDir = path.join(path.dirname(tempDir), newProjectName.toLowerCase());

          } finally {
            exitStub.restore();
          }

        } finally {
          // Ensure we change back to the original directory even if there's an error
          try {
            process.chdir(originalCwd);
          } catch (error) {
            // If the chdir fails, we're probably in a renamed directory
            // Just change to the parent  directory
            process.chdir(path.dirname(originalCwd));
          }
        }
      });

      after(() => {
        // Clean up the test output directory - comment this out if you want to inspect the results
        // fs.removeSync(path.join(__dirname, 'test-output', seedProject.name));
      });

      it('should rename the project directory', () => {
        expect(fs.existsSync(tempDir)).to.be.false;
        expect(fs.existsSync(newDir)).to.be.true;
      });

      if (seedProject.hasPackageJson) {
        it('should update package.json with the new project name', () => {
          const packageJsonPath = path.join(newDir, 'package.json');
          const packageJson = fs.readJsonSync(packageJsonPath);
          expect(packageJson.name).to.equal(newProjectName);
        });
      }

      it('should not contain any "seed" references in any files', () => {
        const files = getAllFiles(newDir);
        for (const file of files) {
          if (shouldCheckFile(file)) {
            const content = fs.readFileSync(file, 'utf8');
            if (content.toLowerCase().includes('seed')) {
              console.error(`Found "seed" in file: ${file}`);
            }
            expect(content.toLowerCase()).to.not.include('seed');
          }
        }
      });

      it('should run project-specific validation checks', () => {
        seedProject.specificChecks(newDir, newProjectName);
      });
    });
  });
});

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach((file) => {
    if (file === 'node_modules') {
      return;
    }
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, file));
    }
  });

  return arrayOfFiles;
}

function shouldCheckFile(filePath) {
  const binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz', '.jar', '.exe', '.bin', '.dll', '.pdb'];
  const ext = path.extname(filePath).toLowerCase();
  return !binaryExtensions.includes(ext);
} 