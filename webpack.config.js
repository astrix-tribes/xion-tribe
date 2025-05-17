const path = require('path');
const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      "process": require.resolve("process/browser"),
      "zlib": require.resolve("browserify-zlib"),
      "stream": require.resolve("stream-browserify"),
      "util": require.resolve("util/"),
      "assert": require.resolve("assert/"),
      "buffer": require.resolve("buffer/"),
      "path": false,
      "fs": false,
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
}; 