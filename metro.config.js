// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable aggressive obfuscation for production builds
if (process.env.NODE_ENV === 'production') {
  config.transformer.minifierConfig = {
    mangle: {
      keep_fnames: false,
      toplevel: true,
      reserved: ['__DEV__', '__METRO_GLOBAL_PREFIX__'],
      properties: {
        regex: /^_/, // Mangle properties starting with underscore
      },
    },
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.warn'],
      passes: 2,
      unsafe: true,
      unsafe_comps: true,
      unsafe_math: true,
      unsafe_proto: true,
    },
    output: {
      comments: false,
      beautify: false,
    },
  };
}

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
