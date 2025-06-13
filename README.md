# Seed Project Renamer

A specialized utility for renaming and bootstrapping seed projects after cloning. This tool renames all occurrences of the seed project name across files and directories, supporting multiple naming conventions (kebab-case, PascalCase, camelCase, snake_case). It automatically renames directories that match the seed project name and works with any seed project by explicitly specifying the source project name.

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

After cloning a seed project, navigate to its root directory and run:

```bash
# Auto-detect seed project from package.json (backward compatible)
npx @dwkerwin/seed-project-renamer your-new-project-name

# Explicit source specification (recommended for multi-service projects)
npx @dwkerwin/seed-project-renamer --from seed-nodejs-npm-lib your-new-project-name

# For .NET projects
npx @dwkerwin/seed-project-renamer --from seed-csharp-api --dotnet MyNewProject
```

### Command-line Options

```
--from <name>      Source seed project name to rename from (auto-detects if not provided)
--dotnet          Process as a .NET project (handle .csproj files and solution structure)
--help, -h        Show help information
```

### Auto-Detection

When `--from` is not specified, the tool automatically detects the seed project name by:
1. **Node.js projects**: Looking for `package.json` in current directory or `src/` subdirectory with names starting with `seed-`
2. **All languages**: Using the current directory name if it starts with `seed-`
3. **Fallback**: Request explicit `--from` parameter if detection fails

This approach supports:
- **Node.js projects** with package.json files
- **.NET projects** using directory names  
- **Any language** using directory names
- **Multi-service projects** using explicit `--from` for precision

This maintains 100% backward compatibility with existing single-service seed projects.

### Examples

```bash
# Most common: Single-service projects (auto-detection)
npx @dwkerwin/seed-project-renamer my-new-service

# Multi-service projects (explicit source specification)
npx @dwkerwin/seed-project-renamer --from seed-nodejs-koa-nextjs-ecsfargate-api my-web-app-api
npx @dwkerwin/seed-project-renamer --from seed-nodejs-koa-nextjs-ecsfargate-frontend my-web-app-frontend

# Alternative: Directory-by-directory approach for multi-service
cd api
npx @dwkerwin/seed-project-renamer my-web-app-api
cd ../frontend
npx @dwkerwin/seed-project-renamer my-web-app-frontend

# .NET projects
npx @dwkerwin/seed-project-renamer --from seed-csharp-api --dotnet MyNewApi
```

## How It Works

The tool:
1. **Takes the source seed project name** via `--from` parameter (auto-detects if not provided)
2. **Replaces all occurrences** of that seed name with your new project name in file contents
3. **Renames directories** that match the seed project name (in any naming format)
4. **Handles multiple naming formats** (kebab-case, PascalCase, camelCase, snake_case) 
5. **Updates package.json files** and removes initialization scripts
6. **Works with any project structure** - handles both single and multi-service projects

## Supported Seed Projects

The tool works with any seed project by specifying the `--from` parameter:
- `seed-nodejs-npm-lib`
- `seed-nodejs-koa-nextjs-ecsfargate`  
- `seed-nodejs-koa-nextjs-ecsfargate-api`
- `seed-nodejs-koa-nextjs-ecsfargate-frontend`
- Any other seed project name

## Multi-Service Projects

For projects with multiple services (e.g., API + frontend), you have two approaches:

### Recommended: Explicit renaming from root directory
```bash
npx @dwkerwin/seed-project-renamer --from seed-project-api my-app-api
npx @dwkerwin/seed-project-renamer --from seed-project-frontend my-app-frontend
```

**Benefits:**
- Works with mixed languages (Node.js + .NET, etc.)
- No directory navigation required
- More explicit and scriptable
- Handles any project structure

### Alternative: Auto-detection per directory
```bash
cd api
npx @dwkerwin/seed-project-renamer my-app-api
cd ../frontend
npx @dwkerwin/seed-project-renamer my-app-frontend
```

**Benefits:**
- Uses auto-detection within each service
- Familiar workflow if you prefer working within directories

Both approaches give you full control over each rename operation.

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
