#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packagesDir = path.join(__dirname, '../packages');
const packages = fs.readdirSync(packagesDir).filter(file => 
  fs.statSync(path.join(packagesDir, file)).isDirectory()
);

const getPackageVersion = (packageName) => {
  const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  return packageJson.version;
};

const publishPackage = (packageName) => {
  const packagePath = path.join(packagesDir, packageName);
  const packageJsonPath = path.join(packagePath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  console.log(`\n📦 Publishing @carats/${packageName} v${packageJson.version}...`);
  
  try {
    // Build the package
    console.log(`   Building @carats/${packageName}...`);
    execSync('pnpm run build', { cwd: packagePath, stdio: 'inherit' });
    
    // Publish the package
    console.log(`   Publishing to npm...`);
    execSync('pnpm publish --access public', { cwd: packagePath, stdio: 'inherit' });
    
    console.log(`   ✅ Successfully published @carats/${packageName}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Failed to publish @carats/${packageName}`);
    return false;
  }
};

const main = () => {
  console.log('🚀 Starting Carats monorepo publish sequence...\n');
  
  const results = packages.map(pkg => ({
    name: pkg,
    success: publishPackage(pkg)
  }));
  
  console.log('\n📊 Publish Summary:');
  console.log('='.repeat(50));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} @carats/${result.name}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log(`\nPublished ${successCount}/${totalCount} packages`);
  
  process.exit(successCount === totalCount ? 0 : 1);
};

main();
