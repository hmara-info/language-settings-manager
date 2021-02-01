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

require('dotenv').config({
  path: __dirname + '/.env.' + env.NODE_ENV,
});
const DotenvPlugin = require('webpack-dotenv-plugin');

var fileExtensions = ['css', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'ttf'];

var options = {
  mode: process.env.NODE_ENV || 'development',
  optimization: {
    minimize: false,
  },
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
        test: new RegExp('.(' + fileExtensions.join('|') + ')$'),
        loader: 'file-loader?name=[name].[ext]',
        exclude: /node_modules/,
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
    new CopyWebpackPlugin({
      patterns: [
        {
          from: './src/manifest.json',
          to: './manifest.json',
          transform(content) {
            if (env.NODE_ENV !== 'development') {
              return content;
            }

            const json = JSON.parse(content);
            json.content_security_policy =
              "script-src 'self' 'unsafe-eval'; object-src 'self'";
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

if (env.NODE_ENV === 'development') {
  options.devtool = 'cheap-module-eval-source-map';
}

module.exports = options;
