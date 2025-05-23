import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commonConfig = {
  mode: 'production', // or 'development'
  entry: './src/index.js',
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
  resolve: {
    extensions: ['.js']
  },
  devtool: 'source-map',
  // externals: { // Keep externals commented unless specifically needed
  //   'pdfjs-dist/build/pdf.js': 'pdfjsLib',
  //   'tesseract.js': 'Tesseract',
  //   '@mlc-ai/web-llm': 'webLLM'
  // }
};

const umdConfig = {
  ...commonConfig,
  output: {
    path: path.resolve(__dirname, 'dist/assets'),
    filename: 'extract2md.umd.js',
    library: {
      name: 'Extract2MD',
      type: 'umd',
    },
    globalObject: 'this',
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
          to: path.resolve(__dirname, 'dist/pdf.worker.min.mjs')
        },
        {
          from: path.resolve(__dirname, 'node_modules/tesseract.js/dist/worker.min.js'),
          to: path.resolve(__dirname, 'dist/assets/tesseract-worker.min.js')
        },
        {
          from: path.resolve(__dirname, 'node_modules/tesseract.js-core/tesseract-core.wasm.js'),
          to: path.resolve(__dirname, 'dist/assets/tesseract-core.wasm.js')
        },
        // Copy the main type definition file
        {
          from: path.resolve(__dirname, 'src/types/index.d.ts'),
          to: path.resolve(__dirname, 'dist/assets/extract2md.d.ts')
        }
      ]
    })
  ],
};

const esmConfig = {
  ...commonConfig,
  output: {
    path: path.resolve(__dirname, 'dist/assets'),
    filename: 'extract2md.esm.js',
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  // ESM build typically doesn't need to run CopyWebpackPlugin again if UMD build handles it.
  // If you run builds separately or want to ensure assets are copied for both, include it.
  // For simplicity, assuming UMD build's CopyWebpackPlugin handles all asset copying.
  // If you have a build script that runs webpack once with an array of configs,
  // the plugins from one of them (e.g., UMD) will handle the copying.
};

export default [umdConfig, esmConfig];
