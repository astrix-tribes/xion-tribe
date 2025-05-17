const webpack = require('webpack');

module.exports = function override(config) {
  // Add fallbacks for node modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "assert": require.resolve("assert"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify"),
    "url": require.resolve("url"),
    "zlib": require.resolve("browserify-zlib"),
    "process": require.resolve("process/browser"),
    "buffer": require.resolve("buffer"),
    "vm": require.resolve("vm-browserify"),
    "path": false,
    "fs": false,
  };

  // Add plugins
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  // Ignore source map loader warnings
  config.ignoreWarnings = [/Failed to parse source map/];
  
  return config;
}; 