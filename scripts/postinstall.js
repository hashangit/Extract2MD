import fs from 'fs';
import https from 'https';
import zlib from 'zlib';
import path from 'path';
import { fileURLToPath } from 'url';

// Polyfill for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const langDataPath = path.resolve(__dirname, '..', 'dist', 'assets', 'lang-data');

const filesToDownload = [
  {
    url: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz',
    fileName: 'eng.traineddata.gz',
    destFileName: 'eng.traineddata.gz', // Ensure final file is named .gz but contains uncompressed data
    gzipped: true,
  },
  {
    url: 'https://github.com/tesseract-ocr/tessdata/raw/4.00/sin.traineddata',
    fileName: 'sin.traineddata', // Original name from URL (or how we save it initially)
    destFileName: 'sin.traineddata.gz', // Final name Tesseract.js expects
    gzipped: false, // Source is not gzipped, so no decompression needed
  },
];

async function ensureDirExists(dirPath) {
  try {
    await fs.promises.mkdir(dirPath, { recursive: true });
    console.log(`Directory ensured: ${dirPath}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
    console.log(`Directory already exists: ${dirPath}`);
  }
}

async function downloadFile(url, destPath, fileName, redirectCount = 0) {
  const MAX_REDIRECTS = 5;

  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      reject(new Error(`Exceeded maximum redirect limit (${MAX_REDIRECTS}) for ${fileName}`));
      return;
    }

    const tempFilePath = path.join(langDataPath, `_${fileName}`); // Download to a temp name
    // Ensure tempFilePath is not created if the actual destPath is the same (for non-gzipped direct save)
    // However, for consistency and cleanup, using a temp file is safer.
    // The final rename will handle placing it correctly.

    console.log(`Downloading ${fileName} from ${url} (Attempt: ${redirectCount + 1})...`);

    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`Redirected for ${fileName} to ${response.headers.location}`);
        // Consume response data to free up memory
        response.resume();
        downloadFile(response.headers.location, destPath, fileName, redirectCount + 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        // fs.unlink(tempFilePath, () => {}); // Don't unlink if it wasn't opened yet or on redirect
        reject(new Error(`Failed to download ${fileName}. Status Code: ${response.statusCode} from ${url}`));
        return;
      }

      const fileStream = fs.createWriteStream(tempFilePath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(async (err) => {
          if (err) {
            fs.unlink(tempFilePath, () => {}).catch(() => {}); // Clean up temp file, ignore error if it doesn't exist
            reject(new Error(`Error closing file stream for ${fileName}: ${err.message}`));
            return;
          }
          try {
            // Ensure target directory exists before renaming
            await ensureDirExists(path.dirname(destPath));
            await fs.promises.rename(tempFilePath, destPath);
            console.log(`Successfully downloaded and saved ${fileName} to ${destPath}`);
            resolve();
          } catch (renameError) {
            fs.unlink(tempFilePath, () => {}).catch(() => {});
            reject(new Error(`Error renaming ${tempFilePath} to ${destPath}: ${renameError.message}`));
          }
        });
      });

      fileStream.on('error', (err) => {
        fs.unlink(tempFilePath, () => {}).catch(() => {});
        reject(new Error(`Error writing file ${fileName}: ${err.message}`));
      });
    });

    request.on('error', (err) => {
      // fs.unlink(tempFilePath, () => {}).catch(() => {}); // Temp file might not exist if request itself failed early
      reject(new Error(`Error downloading ${fileName} from ${url}: ${err.message}`));
    });
  });
}

async function decompressGzip(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    const isSameFile = sourcePath === destPath;
    // Use a temporary file for the decompressed output, especially if decompressing in-place.
    const tempOutputPath = isSameFile ? `${destPath}.tmp_decompress_${Date.now()}` : destPath;

    console.log(`Decompressing ${sourcePath} to ${tempOutputPath}${isSameFile ? ' (will then replace original)' : ''}...`);

    const gzip = zlib.createGunzip();
    const sourceStream = fs.createReadStream(sourcePath);
    const destStream = fs.createWriteStream(tempOutputPath);

    sourceStream.pipe(gzip).pipe(destStream);

    destStream.on('finish', () => {
      destStream.close(async (closeErr) => {
        if (closeErr) {
          // Attempt to clean up temporary file if it exists
          if (fs.existsSync(tempOutputPath)) {
            await fs.promises.unlink(tempOutputPath).catch(unlinkErr => console.error(`Error unlinking temp file ${tempOutputPath} on close error:`, unlinkErr));
          }
          reject(new Error(`Error closing destination stream for ${tempOutputPath}: ${closeErr.message}`));
          return;
        }
        try {
          if (isSameFile) {
            // If source and dest are the same, rename temp file to replace original sourcePath with decompressed content
            await fs.promises.rename(tempOutputPath, destPath);
            console.log(`Successfully decompressed and replaced ${sourcePath} with uncompressed content.`);
          } else {
            // If source and dest are different, the decompressed file is at destPath (which was tempOutputPath).
            // The original gzipped sourcePath should be removed.
            await fs.promises.unlink(sourcePath);
            console.log(`Successfully decompressed ${sourcePath} to ${destPath}. Original ${sourcePath} removed.`);
          }
          resolve();
        } catch (moveOrUnlinkError) {
          // Attempt to clean up temporary file if it exists and wasn't the final destPath
          if (fs.existsSync(tempOutputPath) && tempOutputPath !== destPath) {
             await fs.promises.unlink(tempOutputPath).catch(unlinkErr => console.error(`Error unlinking temp file ${tempOutputPath} on finalization error:`, unlinkErr));
          }
          reject(new Error(`Error finalizing decompression for ${sourcePath} (to ${destPath}): ${moveOrUnlinkError.message}`));
        }
      });
    });

    destStream.on('error', async (streamErr) => {
      if (fs.existsSync(tempOutputPath)) {
        await fs.promises.unlink(tempOutputPath).catch(unlinkErr => console.error(`Error unlinking temp file ${tempOutputPath} on stream error:`, unlinkErr));
      }
      reject(new Error(`Error writing decompressed file ${tempOutputPath}: ${streamErr.message}`));
    });
    gzip.on('error', (gzipErr) => reject(new Error(`Error decompressing ${sourcePath}: ${gzipErr.message}`)));
    sourceStream.on('error', (sourceErr) => reject(new Error(`Error reading ${sourcePath} for decompression: ${sourceErr.message}`)));
  });
}

async function main() {
  try {
    console.log('Starting postinstall script for extract2md...');
    await ensureDirExists(langDataPath);

    for (const file of filesToDownload) {
      const downloadedFilePath = path.join(langDataPath, file.fileName);
      const finalDestPath = path.join(langDataPath, file.destFileName);

      // Check if final decompressed/copied file already exists
      if (fs.existsSync(finalDestPath)) {
        console.log(`${file.destFileName} already exists at ${finalDestPath}. Skipping download.`);
        continue;
      }
      
      // Check if intermediate .gz file exists (for gzipped files)
      if (file.gzipped && fs.existsSync(downloadedFilePath)) {
         console.log(`Intermediate file ${file.fileName} already exists. Attempting decompression.`);
      } else {
        await downloadFile(file.url, downloadedFilePath, file.fileName);
      }

      if (file.gzipped) {
        // Ensure downloaded file exists before trying to decompress
        if (!fs.existsSync(downloadedFilePath)) {
            console.error(`Error: Gzipped file ${downloadedFilePath} not found after download attempt. Skipping decompression.`);
            continue;
        }
        await decompressGzip(downloadedFilePath, finalDestPath);
      } else {
        // Handle non-gzipped files: if downloadedFilePath is different from finalDestPath, rename.
        // This applies if we downloaded 'lang.traineddata' but want 'lang.traineddata.gz' (containing uncompressed data).
        if (downloadedFilePath !== finalDestPath) {
          if (fs.existsSync(downloadedFilePath)) {
            console.log(`Renaming non-gzipped file ${downloadedFilePath} to ${finalDestPath}...`);
            await fs.promises.rename(downloadedFilePath, finalDestPath);
            console.log(`Successfully renamed ${downloadedFilePath} to ${finalDestPath}.`);
          } else {
            console.warn(`File ${downloadedFilePath} not found for renaming to ${finalDestPath}. It might have been saved directly as ${finalDestPath} if download logic handles it, or download failed.`);
          }
        } else {
          // If downloadedFilePath is the same as finalDestPath, it means the file was already saved with the correct name.
          console.log(`Non-gzipped file ${finalDestPath} is already correctly named. No rename needed.`);
        }
      }
    }

    console.log('Postinstall script completed successfully.');
  } catch (error) {
    console.error('Error during postinstall script:', error.message);
    // process.exit(1); // Optionally exit with error, though npm might handle this.
  }
}

main();