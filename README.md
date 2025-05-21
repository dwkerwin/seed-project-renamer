# Seed Project Renamer

A specialized utility for renaming and bootstrapping seed projects after cloning. This tool renames all occurrences of the seed project name across files and directories, supporting multiple naming conventions (kebab-case, PascalCase, camelCase, snake_case). It's primarily designed for my own opinionated project structures that use Terraform, AWS resources, and follow specific conventions for both NPM libraries (flat structure) and microservices (src/ directory structure). While it may work for similar project templates, it contains hardcoded assumptions about project organization and cleanup procedures that may require adaptation for other use cases.

## Installation

### Global Installation

```bash
npm install -g seed-project-renamer
```

### Local Installation

```bash
npm install seed-project-renamer
```

## Usage

### Usage

After cloning a seed project, navigate to its root directory and run the tool using one of these methods:

#### Method 1: Using npx (Recommended)
```bash
# For Node.js projects
npx @dwkerwin/seed-project-renamer your-new-project-name

# For .NET projects
npx @dwkerwin/seed-project-renamer --dotnet MyNewProject
```

#### Method 2: If installed globally
```bash
npm install -g @dwkerwin/seed-project-renamer
seed-project-renamer your-new-project-name
```

#### Method 3: Using node directly
```bash
node node_modules/@dwkerwin/seed-project-renamer/rename.js your-new-project-name
```

#### Command-line Options
```
--dotnet    Process as a .NET project (handle .csproj files and solution structure)
--help, -h  Show help information
```

The tool will:
1. Replace all occurrences of the seed project name with your new name throughout the codebase
2. Update relevant files with the new name in multiple formats (kebab-case, PascalCase, camelCase, snake_case)
3. Clean up initialization scripts when done

## Supported Project Structures

This utility is designed to work with two primary project structures:

1. **NPM Libraries** (flat structure):
   - Package.json in the root directory
   - No src/ directory containing a separate package.json

2. **Microservices** (src/ structure):
   - Root package.json for initialization only
   - Main package.json inside src/ directory

The tool will detect which structure your project uses and adapt accordingly.

## Limitations

This tool assumes specific naming conventions and directory structures used in my seed projects. It may not work correctly with other project templates without modification.

## License

MIT

## Publishing

For future reference, to publish a new version:

```bash
# Update the version in package.json
# Commit changes and push to GitHub

# Login to npm (if needed)
npm login

# Publish the package (scoped packages require --access=public)
npm publish --access=public
```
