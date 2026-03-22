# Carats Monorepo

A pnpm monorepo containing separate npm packages under the `@carats` scope.

## 📦 Packages

- `@carats/core` - Core functionality
- `@carats/csr` - Client-side rendering module
- `@carats/express` - Express integration
- `@carats/hooks` - Hooks module
- `@carats/ssg` - Static site generation
- `@carats/url` - URL utilities

## 🚀 Quick Start

### Installation

```bash
pnpm install
```

### Building All Packages

```bash
pnpm build
```

This will compile all packages in the `packages/` directory.

### Building a Specific Package

```bash
cd packages/csr
pnpm build
```

## 📤 Publishing

### Publish All Packages

Automatically builds and publishes all packages to npm:

```bash
pnpm publish
```

This script will:
1. Build each package
2. Publish each package to npm with public access
3. Display a summary of the publish status

### Publish Specific Package

```bash
cd packages/csr
pnpm publish --access public
```

## 🔄 Version Management

### Bump Versions

Bump the version for all packages:

```bash
# Bump patch version (1.0.0 → 1.0.1)
node scripts/bump-version.js patch

# Bump minor version (1.0.0 → 1.1.0)
node scripts/bump-version.js minor

# Bump major version (1.0.0 → 2.0.0)
node scripts/bump-version.js major
```

## 📁 Project Structure

```
.
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── dist/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── csr/
│   ├── express/
│   ├── hooks/
│   ├── ssg/
│   └── url/
├── scripts/
│   ├── publish.js
│   └── bump-version.js
├── tsconfig.base.json
├── package.json
└── pnpm-workspace.yaml
```

## 🔧 Configuration

### Shared TypeScript Configuration

The `tsconfig.base.json` file contains shared TypeScript settings used by all packages. Individual packages extend this configuration in their own `tsconfig.json`.

### pnpm Workspaces

The monorepo uses pnpm workspaces for dependency management. All packages share the same node_modules structure via symlinks, which is more efficient than npm or yarn.

## 🎯 Usage Examples

### Import a module

```typescript
// From @carats/csr
import csr from "@carats/csr";

// From @carats/express
import express from "@carats/express";
```

### Development Workflow

1. Make changes in a package's `src/` directory
2. Run `pnpm build` to compile all packages
3. Test locally
4. Bump versions: `node scripts/bump-version.js patch`
5. Publish: `pnpm publish`

## 📝 Adding a New Package

1. Create a new directory in `packages/`:
   ```bash
   mkdir packages/newpackage
   mkdir packages/newpackage/src
   mkdir packages/newpackage/dist
   ```

2. Create `package.json`:
   ```json
   {
     "name": "@carats/newpackage",
     "version": "1.0.0",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "files": ["dist"],
     "scripts": {
       "build": "tsc"
     },
     "publishConfig": {
       "access": "public"
     }
   }
   ```

3. Create `tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

4. Add your code to `src/index.ts`

5. Run `pnpm install` to update the workspace

## 🔗 Links

- [pnpm Documentation](https://pnpm.io/)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
