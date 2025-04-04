// This file is used to configure the Babel compiler for the application.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: null,
          safe: false,
          allowUndefined: true,
        },
      ],
      'react-native-reanimated/plugin',
      // Remove all console messages (even if NODE_ENV=development)
      ['transform-remove-console', { exclude: ['error'] }],
    ],
  };
};
