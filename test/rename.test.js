const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

const renamer = require('../rename');
const { utils } = renamer;

describe('Seed Project Renamer', () => {
  let tempDir;
  const newProjectName = 'my-new-project';
  const seedProjectName = 'seed-nodejs-sqs-consumer-lambda';
  let newDir;

  before(async () => {
    // Clean up any existing test output first
    const parentDir = path.join(__dirname, 'test-output');
    if (fs.existsSync(parentDir)) {
      fs.removeSync(parentDir);
    }
    
    // Create a fresh test output directory
    fs.ensureDirSync(parentDir);

    // This is the directory that the user would have cloned
    tempDir = path.join(parentDir, seedProjectName);
    fs.ensureDirSync(tempDir);

    // Copy the contents of the seed project into the cloned directory
    fs.copySync(path.join(__dirname, 'assets', seedProjectName), tempDir);

    const originalCwd = process.cwd();
    
    try {
      // The script should be run from within the cloned directory
      process.chdir(tempDir);

      // Stub process.exit to prevent the test runner from exiting
      const exitStub = sinon.stub(utils, 'exit');

      try {
        await renamer({
          projectName: newProjectName,
          fromSeed: seedProjectName,
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
        // Just change to the parent directory
        process.chdir(path.dirname(originalCwd));
      }
    }
  });

  after(() => {
    // Clean up the test output directory - comment this out if you want to inspect the results
    // fs.removeSync(path.join(__dirname, 'test-output'));
  });

  it('should rename the project directory', () => {
    expect(fs.existsSync(tempDir)).to.be.false;
    expect(fs.existsSync(newDir)).to.be.true;
  });

  it('should update package.json with the new project name', () => {
    const packageJsonPath = path.join(newDir, 'package.json');
    const packageJson = fs.readJsonSync(packageJsonPath);
    expect(packageJson.name).to.equal(newProjectName);
  });

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

  it('should update terraform/main.tf with the new project name', () => {
    const terraformFilePath = path.join(newDir, 'terraform', 'main.tf');
    const terraformFileContent = fs.readFileSync(terraformFilePath, 'utf8');

    // Check for updated resource names
    const newProjectNameSnake = newProjectName.replace(/-/g, '_');
    expect(terraformFileContent).to.include(`resource "aws_sns_topic" "${newProjectNameSnake}"`);
    expect(terraformFileContent).to.include(`name              = "${newProjectName}-topic"`);
    expect(terraformFileContent).to.include(`function_name = "${newProjectName}"`);
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