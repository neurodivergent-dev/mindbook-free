const fs = require('fs');
const path = require('path');

// Function to extract all translation keys from a translation file
function extractTranslationKeys(obj, prefix = '') {
  const keys = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === 'object' && value !== null) {
      keys.push(...extractTranslationKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

// Function to find translation usage in code files
function findTranslationUsageInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const translationKeys = [];

    // Find t('key') patterns - improved regex
    const tFunctionMatches = content.match(/t\(['"`]([^'"`]+)['"`]/g);
    if (tFunctionMatches) {
      tFunctionMatches.forEach(match => {
        const key = match.replace(/t\(['"`]/, '').replace(/['"`]\)/, '');
        if (key && key.includes('.')) {
          // Only add valid translation keys
          translationKeys.push(key);
        }
      });
    }

    // Find i18next.t('key') patterns - improved regex
    const i18nextMatches = content.match(/i18next\.t\(['"`]([^'"`]+)['"`]/g);
    if (i18nextMatches) {
      i18nextMatches.forEach(match => {
        const key = match.replace(/i18next\.t\(['"`]/, '').replace(/['"`]\)/, '');
        if (key && key.includes('.')) {
          // Only add valid translation keys
          translationKeys.push(key);
        }
      });
    }

    return translationKeys;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

// Function to find translation usage with file information
function findTranslationUsageWithFiles(dir, extensions = ['.tsx', '.ts', '.jsx', '.js']) {
  const translationUsage = {};

  function scanRecursive(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!['node_modules', '.git', 'coverage', '__tests__', 'supabase'].includes(item)) {
          scanRecursive(fullPath);
        }
      } else if (extensions.includes(path.extname(item))) {
        const keys = findTranslationUsageInFile(fullPath);
        keys.forEach(key => {
          if (!translationUsage[key]) {
            translationUsage[key] = [];
          }
          // Store relative path from app directory
          const relativePath = path.relative(dir, fullPath);
          if (!translationUsage[key].includes(relativePath)) {
            translationUsage[key].push(relativePath);
          }
        });
      }
    }
  }

  scanRecursive(dir);
  return translationUsage;
}

// Main function to find missing translations
function findMissingTranslations() {
  const translationsDir = path.join(__dirname, 'app', 'translations');
  const appDir = path.join(__dirname, 'app');
  let report = '';

  console.log('🔍 Scanning for missing translation keys...\n');

  // Read English translation file (reference)
  const enTranslationPath = path.join(translationsDir, 'en.tsx');
  const enTranslationContent = fs.readFileSync(enTranslationPath, 'utf8');

  // Extract the translation object from the file
  const enTranslationMatch = enTranslationContent.match(/export default ({[\s\S]*});/);
  if (!enTranslationMatch) {
    console.error('Could not parse English translation file');
    report += 'Could not parse English translation file\n';
    fs.writeFileSync('translation_report.txt', report);
    return;
  }

  // Evaluate the translation object (safe in this context)
  const enTranslation = eval('(' + enTranslationMatch[1] + ')');
  const enKeys = extractTranslationKeys(enTranslation);

  console.log(`📊 English translation file contains ${enKeys.length} keys\n`);

  // Get translation usage with file information
  const translationUsage = findTranslationUsageWithFiles(appDir);
  const usedKeys = Object.keys(translationUsage);

  console.log('🔍 Scanning codebase for translation usage...');
  console.log(`📊 Found ${usedKeys.length} unique translation keys used in code\n`);

  // Find keys used in code but not defined in English
  const missingInEnglish = usedKeys.filter(key => !enKeys.includes(key));

  // Check other language files
  const languageFiles = [
    'tr.tsx',
    'de.tsx',
    'fr.tsx',
    'zh.tsx',
    'es.tsx',
    'ru.tsx',
    'ar.tsx',
    'hi.tsx',
    'pt.tsx',
    'ja.tsx',
    'ko.tsx',
  ];
  const missingTranslations = {};
  const languageStats = {};

  // Get English stats
  languageStats['en.tsx'] = {
    totalKeys: enKeys.length,
    missingKeys: 0,
    completionRate: 100,
  };

  for (const langFile of languageFiles) {
    const langPath = path.join(translationsDir, langFile);
    if (fs.existsSync(langPath)) {
      const langContent = fs.readFileSync(langPath, 'utf8');
      const langMatch = langContent.match(/export default ({[\s\S]*});/);

      if (langMatch) {
        try {
          const langTranslation = eval('(' + langMatch[1] + ')');
          const langKeys = extractTranslationKeys(langTranslation);
          const missing = enKeys.filter(key => !langKeys.includes(key));

          // Calculate completion rate
          const completionRate = (((enKeys.length - missing.length) / enKeys.length) * 100).toFixed(
            1
          );

          languageStats[langFile] = {
            totalKeys: langKeys.length,
            missingKeys: missing.length,
            completionRate: parseFloat(completionRate),
          };

          if (missing.length > 0) {
            missingTranslations[langFile] = missing;
          }
        } catch (error) {
          console.error(`Error parsing ${langFile}:`, error.message);
          report += `Error parsing ${langFile}: ${error.message}\n`;
          languageStats[langFile] = {
            totalKeys: 0,
            missingKeys: enKeys.length,
            completionRate: 0,
          };
        }
      }
    } else {
      languageStats[langFile] = {
        totalKeys: 0,
        missingKeys: enKeys.length,
        completionRate: 0,
      };
    }
  }

  // Report results
  console.log('📋 TRANSLATION ANALYSIS RESULTS\n');
  console.log('='.repeat(50));

  if (missingInEnglish.length > 0) {
    console.log('\n❌ KEYS USED IN CODE BUT MISSING FROM ENGLISH TRANSLATION:');
    missingInEnglish.forEach(key => {
      console.log(`  - ${key}`);
      if (translationUsage[key] && translationUsage[key].length > 0) {
        console.log(`    📁 Used in: ${translationUsage[key].join(', ')}`);
      }
    });
    report += '\n❌ KEYS USED IN CODE BUT MISSING FROM ENGLISH TRANSLATION:\n';
    missingInEnglish.forEach(key => {
      report += `  - ${key}\n`;
      if (translationUsage[key] && translationUsage[key].length > 0) {
        report += `    📁 Used in: ${translationUsage[key].join(', ')}\n`;
      }
    });
  } else {
    console.log('\n✅ All translation keys used in code are defined in English translation');
    report += '\n✅ All translation keys used in code are defined in English translation\n';
  }

  console.log('\n' + '='.repeat(50));

  if (Object.keys(missingTranslations).length > 0) {
    console.log('\n❌ MISSING TRANSLATIONS IN OTHER LANGUAGES:');
    for (const [langFile, missing] of Object.entries(missingTranslations)) {
      console.log(`\n📁 ${langFile} (${missing.length} missing keys):`);
      missing.forEach(key => {
        console.log(`  - ${key}`);
        if (translationUsage[key] && translationUsage[key].length > 0) {
          console.log(`    📁 Used in: ${translationUsage[key].join(', ')}`);
        }
      });
      report += `\n📁 ${langFile} (${missing.length} missing keys):\n`;
      missing.forEach(key => {
        report += `  - ${key}\n`;
        if (translationUsage[key] && translationUsage[key].length > 0) {
          report += `    📁 Used in: ${translationUsage[key].join(', ')}\n`;
        }
      });
    }
  } else {
    console.log('\n✅ All language files have complete translations');
    report += '\n✅ All language files have complete translations\n';
  }

  console.log('\n' + '='.repeat(50));

  // Find unused keys in English
  const unusedKeys = enKeys.filter(key => !usedKeys.includes(key));
  if (unusedKeys.length > 0) {
    console.log('\n⚠️  UNUSED KEYS IN ENGLISH TRANSLATION:');
    console.log(`(${unusedKeys.length} keys that might be unused):`);
    unusedKeys.forEach(key => {
      console.log(`  - ${key}`);
      if (translationUsage[key] && translationUsage[key].length > 0) {
        console.log(`    📁 Used in: ${translationUsage[key].join(', ')}`);
      }
    });
    report += `\n⚠️  UNUSED KEYS IN ENGLISH TRANSLATION:\n(${unusedKeys.length} keys that might be unused):\n`;
    unusedKeys.forEach(key => {
      report += `  - ${key}\n`;
      if (translationUsage[key] && translationUsage[key].length > 0) {
        report += `    📁 Used in: ${translationUsage[key].join(', ')}\n`;
      }
    });
  } else {
    console.log('\n✅ All English translation keys are being used');
    report += '\n✅ All English translation keys are being used\n';
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 DETAILED LANGUAGE STATISTICS:');
  console.log('='.repeat(50));

  // Sort languages by completion rate (descending)
  const sortedLanguages = Object.entries(languageStats).sort(
    (a, b) => b[1].completionRate - a[1].completionRate
  );

  for (const [langFile, stats] of sortedLanguages) {
    const langName = langFile.replace('.tsx', '').toUpperCase();
    const status = stats.completionRate === 100 ? '✅' : stats.completionRate >= 80 ? '⚠️' : '❌';
    console.log(`${status} ${langName} (${langFile}):`);
    console.log(`   Total Keys: ${stats.totalKeys}`);
    console.log(`   Missing Keys: ${stats.missingKeys}`);
    console.log(`   Completion Rate: ${stats.completionRate}%`);
    console.log('');
    report += `${status} ${langName} (${langFile}):\n`;
    report += `   Total Keys: ${stats.totalKeys}\n`;
    report += `   Missing Keys: ${stats.missingKeys}\n`;
    report += `   Completion Rate: ${stats.completionRate}%\n`;
    report += '\n';
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 SUMMARY:');
  console.log(`- English keys: ${enKeys.length}`);
  console.log(`- Used in code: ${usedKeys.length}`);
  console.log(`- Missing from English: ${missingInEnglish.length}`);
  console.log(`- Languages with missing keys: ${Object.keys(missingTranslations).length}`);
  console.log(`- Potentially unused: ${unusedKeys.length}`);
  console.log(
    `- Average completion rate: ${(
      Object.values(languageStats).reduce((sum, stats) => sum + stats.completionRate, 0) /
      Object.keys(languageStats).length
    ).toFixed(1)}%`
  );
  report += '\n📊 SUMMARY:\n';
  report += `- English keys: ${enKeys.length}\n`;
  report += `- Used in code: ${usedKeys.length}\n`;
  report += `- Missing from English: ${missingInEnglish.length}\n`;
  report += `- Languages with missing keys: ${Object.keys(missingTranslations).length}\n`;
  report += `- Potentially unused: ${unusedKeys.length}\n`;
  report += `- Average completion rate: ${(
    Object.values(languageStats).reduce((sum, stats) => sum + stats.completionRate, 0) /
    Object.keys(languageStats).length
  ).toFixed(1)}%\n`;

  // Print to console
  console.log(report);
  // Save to file
  fs.writeFileSync('translation_report.txt', report);
}

// Run the analysis
findMissingTranslations();
