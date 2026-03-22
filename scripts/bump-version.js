#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get version type from arguments (major, minor, patch)
const versionType = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: major, minor, or patch');
  process.exit(1);
}

const packagesDir = path.join(__dirname, '../packages');
const packages = fs.readdirSync(packagesDir).filter(file =>
  fs.statSync(path.join(packagesDir, file)).isDirectory()
);

const bumpVersion = (version, type) => {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
  }
};

console.log(`🔄 Bumping ${versionType} version for all packages...\n`);

packages.forEach(packageName => {
  const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  const newVersion = bumpVersion(packageJson.version, versionType);
  packageJson.version = newVersion;
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ @carats/${packageName}: ${packageJson.version} → ${newVersion}`);
});

console.log(`\n✨ Successfully bumped ${versionType} version for all packages`);
