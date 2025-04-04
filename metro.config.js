// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// More stringent configuration of the Metro reporter
config.reporter = {
  ...config.reporter,
  update: event => {
    // Hide all logs of type INFO
    if (event.type === 'log' && event.level === 'info') {
      return;
    }

    // Hide React Native 0.77 warning message
    if (
      event.type === 'update' &&
      event.message &&
      (event.message.includes('JavaScript logs will be removed') ||
        event.message.includes('React Native DevTools'))
    ) {
      return;
    }

    // Hide messages containing "INFO" in any other way
    if (
      event.message &&
      typeof event.message === 'string' &&
      (event.message.includes('INFO') || event.message.startsWith(' INFO'))
    ) {
      return;
    }

    // Use original reporter
    config.reporter.update && config.reporter.update(event);
  },
};

module.exports = config;
