const webpack = require('webpack'),
  path = require('path'),
  fileSystem = require('fs'),
  env = require('./utils/env'),
  CleanWebpackPlugin = require('clean-webpack-plugin').CleanWebpackPlugin,
  CopyWebpackPlugin = require('copy-webpack-plugin'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  WriteFilePlugin = require('write-file-webpack-plugin'),
  glob = require('glob');

if (!env.NODE_ENV) env.NODE_ENV = 'development';

var PACKAGE = require('./package.json');

require('dotenv').config({
  path: __dirname + '/.env.' + env.NODE_ENV,
});
const DotenvPlugin = require('webpack-dotenv-plugin');

const PLATFORM = process.env.FIREFOX
  ? 'firefox'
  : process.env.CHROME
  ? 'chrome'
  : process.env.SAFARI
  ? 'safari'
  : null;

if (!PLATFORM) {
  throw Error('FIREFOX, CHROME or SAFARI env variable has to be defined');
}
var FEATURES = require(`./features/${PACKAGE.version}-${PLATFORM}.json`);

var fileExtensions = ['css', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'ttf'];
var manifest = `manifest.${PLATFORM}.json`;

var options = {
  mode: process.env.NODE_ENV || 'development',
  node: false,
  optimization: {
    minimize: false,
  },
  devtool: 'cheap-module-source-map',
  entry: {
    content: path.join(__dirname, 'src', 'js', 'content.js'),
    background: path.join(__dirname, 'src', 'js', 'background.js'),
    options: path.join(__dirname, 'src', 'js', 'options.js'),
    popup: path.join(__dirname, 'src', 'js', 'popup.js'),
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: [
          'babel-loader',
          {
            loader: 'ifdef-loader',
            options: {
              PLATFORM: PLATFORM.toUpperCase(),
            },
          },
        ],
      },
      {
        test: new RegExp('.(' + fileExtensions.join('|') + ')$'),
        exclude: /node_modules/,
        use: [
          'file-loader',
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]'
            }
          }
        ]
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    // clean the build folder
    new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
    // expose and write the allowed env vars on the compiled bundle
    new webpack.EnvironmentPlugin(['NODE_ENV']),
    new DotenvPlugin({
      // makes vars available to the application js code
      path: '/.env.' + env.NODE_ENV,
      sample: '.env.default',
      allowEmptyValues: true,
    }),
    new webpack.DefinePlugin({
      __FEATURES__: JSON.stringify(FEATURES),
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/' + manifest,
          to: './manifest.json',
          transform(content) {
            const json = JSON.parse(content);
            json.version = PACKAGE.version;
            if (env.NODE_ENV !== 'development') {
              return JSON.stringify(json, undefined, 2);
            }

            return JSON.stringify(json, undefined, 2);
          },
        },
      ],
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './node_modules/semantic-ui-css/semantic.min.css',
          to: './semantic.min.css',
        },
        {
          context: './node_modules/semantic-ui-css',
          from: 'themes/default/**/*',
        },
        {
          from: '_locales/**/*',
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'options.html'),
      filename: 'options.html',
      chunks: ['options'],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, 'src', 'popup.html'),
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      'window.jQuery': 'jquery',
    }),
    new WriteFilePlugin(),
  ],
};

module.exports = options;
