// IP Finder
const fs = require('fs');
const path = require('path');

function findIPsInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // IPv4 regex pattern
  const ipv4Pattern =
    /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  const matches = content.match(ipv4Pattern);

  if (matches) {
    console.log(`Found IP addresses in ${filePath}: ${matches.join(', ')}`);
  }
}

// Scan all files in the directory
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      scanDirectory(filePath);
    } else if (
      stats.isFile() &&
      (file.endsWith('.js') ||
        file.endsWith('.jsx') ||
        file.endsWith('.ts') ||
        file.endsWith('.tsx'))
    ) {
      findIPsInFile(filePath);
    }
  }
}

scanDirectory('./app');
