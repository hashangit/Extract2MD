import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production', // or 'development'
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist/assets'),
    filename: 'extract2md.umd.js',
    library: {
      name: 'Extract2MD', // This will be the global variable name
      type: 'umd', // Universal Module Definition
    },
    globalObject: 'this', // To make UMD build work in Node and browser
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        // Copy pdf.js worker to dist (not dist/assets)
        { 
          from: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'), 
          to: path.resolve(__dirname, 'dist/pdf.worker.min.mjs') 
        },
        // Copy Tesseract.js worker to dist/assets
        { 
          from: path.resolve(__dirname, 'node_modules/tesseract.js/dist/worker.min.js'), 
          to: path.resolve(__dirname, 'dist/assets/tesseract-worker.min.js')
        },
        {
          from: path.resolve(__dirname, 'node_modules/tesseract.js-core/tesseract-core.wasm.js'),
          to: path.resolve(__dirname, 'dist/assets/tesseract-core.wasm.js')
        },
      ]
    })
  ],
  resolve: {
    extensions: ['.js']
  },
  // Optional: if you want to see source maps in development
  devtool: 'source-map', 
  // To prevent bundling of certain dependencies if they are expected to be globals
  // externals: {
  //   'pdfjs-dist/build/pdf.js': 'pdfjsLib',
  //   'tesseract.js': 'Tesseract',
  //   '@mlc-ai/web-llm': 'webLLM' 
  // }
};
