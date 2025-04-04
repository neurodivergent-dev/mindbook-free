// This script is used to install the necessary @types packages for the project
const fs = require('fs');
const { execSync } = require('child_process');

// Read project dependencies
const package = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Packages that should not have @types installed because they include their own types
const typesBlacklist = [
  'react-native', // React Native includes its own types
  'expo', // Expo includes its own types
];

// Check type packages and install missing ones
const dependencies = { ...package.dependencies, ...package.devDependencies };
const requiredTypes = new Set();

// Scan dependencies and identify required @types packages
Object.keys(dependencies).forEach(dep => {
  if (!dep.startsWith('@types/') && !dep.includes('typescript') && !typesBlacklist.includes(dep)) {
    const typePkg = `@types/${dep.replace('@', '').replace('/', '__')}`;
    requiredTypes.add(typePkg);
  }
});

// Install missing type packages
requiredTypes.forEach(typePkg => {
  try {
    require.resolve(typePkg);
    console.log(`✅ ${typePkg} already installed`);
  } catch (e) {
    console.log(`📦 ${typePkg} loading...`);
    try {
      execSync(`npm install -D ${typePkg}`, { stdio: 'inherit' });
    } catch (err) {
      console.log(`⚠️ ${typePkg} could not be loaded - probably not available`);
    }
  }
});
