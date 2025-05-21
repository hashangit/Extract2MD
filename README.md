# Extract2MD: Client-Side PDF to Markdown Converter

<!-- Badges (Placeholder - Replace with actual badges) -->
[![NPM Version](https://img.shields.io/npm/v/extract2md.svg)](https://www.npmjs.com/package/extract2md)
[![License](https://img.shields.io/npm/l/extract2md.svg)](https://github.com/hashangit/Extract2MD/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dt/extract2md.svg)](https://www.npmjs.com/package/extract2md)
<!-- [![Build Status](https://img.shields.io/travis/com/hashangit/Extract2MD.svg)](https://travis-ci.com/hashangit/Extract2MD) -->
<!-- [![Coverage Status](https://img.shields.io/coveralls/github/hashangit/Extract2MD.svg)](https://coveralls.io/github/hashangit/Extract2MD) -->

**Current Version**: 1.0.2

Extract2MD is a powerful and versatile client-side JavaScript library for extracting text from PDF files and converting it into Markdown. It offers multiple extraction strategies, including fast direct extraction and high-accuracy OCR, along with an optional LLM-based text rewriting feature using WebLLM.

The library is designed with offline capability in mind. Core dependencies (workers, WASM modules) are bundled, and essential language data for OCR is downloaded during installation to ensure smooth operation even without a persistent internet connection post-setup.

## Key Features

-   **Multiple Extraction Methods**:
    -   `quickConvert()`: Fast text extraction directly from PDF data using `pdf.js`.
    -   `highAccuracyConvert()`: More accurate (often slower) extraction using `pdf.js` for image rendering and `Tesseract.js` for OCR.
-   **LLM-Powered Rewriting**:
    -   `llmRewrite()`: Optionally refines extracted text using the WebLLM engine for improved clarity and grammar.
-   **Client-Side Operation**: All processing occurs within the user's web browser, ensuring data privacy.
-   **Offline Capability**:
    -   Core PDF and Tesseract engines (workers, WASM) are bundled with the package.
    -   Tesseract.js language data for English (`eng`) and Sinhala (`sin`) is automatically downloaded via a `postinstall` script, enabling offline OCR for these languages after initial setup.
    -   WebLLM engine JavaScript is bundled; LLM model files are handled by WebLLM's caching or can be served locally by the application.
-   **Configurable**:
    -   Customize asset paths if not using the default structure.
    -   Select Tesseract.js OCR language and options.
    -   Define custom post-processing rules for text cleaning.
    -   Choose LLM models and configure prompts for rewriting.
-   **Progress Reporting**: Provides callbacks for tracking the progress of lengthy operations.
-   **Markdown Output**: Converts processed text into a clean, basic Markdown format suitable for various uses, including compatibility with systems like DuckDB.
-   **Post-Processing**: Includes default and customizable rules for text normalization, with an option for smart splitting of `PascalCase` and `camelCase` words.

## Table of Contents

- [Extract2MD: Client-Side PDF to Markdown Converter](#extract2md-client-side-pdf-to-markdown-converter)
  - [Key Features](#key-features)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Usage](#usage)
    - [Initialization](#initialization)
    - [Asset Handling and Offline Use](#asset-handling-and-offline-use)
    - [API Methods](#api-methods)
      - [`async quickConvert(pdfFile, options = {})`](#async-quickconvertpdffile-options--)
      - [`async highAccuracyConvert(pdfFile, options = {})`](#async-highaccuracyconvertpdffile-options--)
      - [`async llmRewrite(textToRewrite, options = {})`](#async-llmrewritetexttorewrite-options--)
      - [`async unloadLLM()`](#async-unloadllm)
  - [Advanced Offline Usage](#advanced-offline-usage)
    - [Using Other Tesseract Languages Offline](#using-other-tesseract-languages-offline)
    - [Using LLM Models Offline](#using-llm-models-offline)
  - [Configuration Options](#configuration-options)
    - [Constructor Options](#constructor-options)
    - [Method-Specific Options](#method-specific-options)
  - [Post-Processing](#post-processing)
  - [Dependencies and Asset Management](#dependencies-and-asset-management)
  - [Supported OCR Languages](#supported-ocr-languages)
  - [For Maintainers: Building the Library](#for-maintainers-building-the-library)
  - [Contributing](#contributing)
  - [License](#license)

## Installation

Install `extract2md` using npm:

```bash
npm install extract2md
```

**Important Note on Installation:**
Upon installation, a `postinstall` script will automatically download the Tesseract.js language data files for English (`eng.traineddata`) and Sinhala (`sin.traineddata`). These files are placed into the `node_modules/extract2md/dist/assets/lang-data/` directory. This step requires an active internet connection *only during the initial installation*. Once downloaded, these assets are available for offline use.

After installation, import the library into your ES Module project:

```javascript
import Extract2MDConverter from 'extract2md';
```

## Quick Start

```javascript
import Extract2MDConverter from 'extract2md';

const pdfFile = /* your File object from an <input type="file"> or other source */;

async function processPdf() {
    const converter = new Extract2MDConverter({
        progressCallback: (progressInfo) => {
            console.log(`[${progressInfo.stage}] ${progressInfo.message}`,
                        progressInfo.progress !== undefined ? (progressInfo.progress * 100).toFixed(1) + '%' : '');
        }
    });

    try {
        console.log("Starting quick conversion...");
        const quickMarkdown = await converter.quickConvert(pdfFile);
        console.log("Quick Convert Markdown:\n", quickMarkdown);

        console.log("\nStarting high-accuracy conversion (English)...");
        const ocrMarkdownEng = await converter.highAccuracyConvert(pdfFile, {
            tesseractLanguage: 'eng'
        });
        console.log("High Accuracy OCR Markdown (English):\n", ocrMarkdownEng);

        // Example: Rewriting the OCR'd text
        if (ocrMarkdownEng.trim()) {
            console.log("\nRewriting English OCR text with LLM...");
            const rewrittenText = await converter.llmRewrite(ocrMarkdownEng);
            console.log("LLM Rewritten Text:\n", rewrittenText);
            await converter.unloadLLM(); // Unload model to free resources
        }

    } catch (error) {
        console.error("An error occurred:", error);
    }
}

// Assuming pdfFile is available
if (pdfFile) {
    processPdf();
}
```

## Usage

### Initialization

Instantiate `Extract2MDConverter` with optional configuration:

```javascript
const converter = new Extract2MDConverter({
    // --- Asset Path Configuration (Optional: Override if not serving from default locations) ---
    // pdfJsWorkerSrc: '/custom/path/to/pdf.worker.min.js',
    // tesseractWorkerPath: '/custom/path/to/tesseract-worker.min.js',
    // tesseractCorePath: '/custom/path/to/tesseract-core.wasm.js',
    // tesseractLangPath: '/custom/path/to/your/lang-data/', // For *additional* languages not auto-downloaded

    // --- OCR Configuration ---
    tesseractLanguage: 'eng', // Default OCR language (eng and sin are auto-downloaded)
    // tesseractOptions: { /* Advanced Tesseract.js options */ },

    // --- Text Processing Configuration ---
    splitPascalCase: false, // Set to true to split PascalCaseText and camelCaseText
    postProcessRules: [
        // Example custom rule:
        // { find: /CONFIDENTIAL/gi, replace: '[REDACTED]' }
    ],

    // --- LLM Configuration ---
    llmModel: 'Qwen3-0.6B-q4f16_0-MLC', // Default model for llmRewrite
    // llmPromptTemplate: (text) => `Summarize this: ${text}`, // Custom prompt

    // --- General Configuration ---
    progressCallback: (progressInfo) => {
        console.log(`[${progressInfo.stage}] ${progressInfo.message}`,
                    progressInfo.progress !== undefined ? (progressInfo.progress * 100).toFixed(1) + '%' : '');
        // Example: Update a progress bar in your UI
    }
});
```
*(See [Configuration Options](#configuration-options) for more details.)*

### Asset Handling and Offline Use

`extract2md` is designed for robust offline functionality after initial setup:

1.  **Core Assets (Workers, WASM):**
    -   The library's build process (via `webpack.config.js`) bundles essential runtime assets:
        -   `pdf.worker.min.mjs` (copied to `dist/` within the package)
        -   `tesseract-worker.min.js` (copied to `dist/assets/` within the package)
        -   `tesseract-core.wasm.js` (copied to `dist/assets/` within the package)
    -   These files are part of the `extract2md` package you install from npm.

2.  **Tesseract.js Language Data (English & Sinhala):**
    -   As noted in the [Installation](#installation) section, `eng.traineddata` and `sin.traineddata` are downloaded by a `postinstall` script into `node_modules/extract2md/dist/assets/lang-data/`. This requires an internet connection *only* during the `npm install extract2md` step.

3.  **Default Behavior & Paths:**
    -   The library is pre-configured to locate these assets within its standard installed directory structure in `node_modules`.
    -   The main UMD bundle is `dist/assets/extract2md.umd.js`.
        -   `pdf.worker.min.js` is expected at `../pdf.worker.min.js` (relative to the UMD bundle).
        -   Tesseract worker and core WASM are expected in `./` (i.e., `dist/assets/`).
        -   Downloaded Tesseract language data is expected in `./lang-data/` (i.e., `dist/assets/lang-data/`).

4.  **Achieving Offline Operation:**
    -   Once the `postinstall` script successfully downloads the language data, all components necessary for PDF processing and OCR (for English and Sinhala) are available locally. No further internet connection is needed for these core features.

5.  **Custom Hosting of Core Assets:**
    -   If you deploy your application in an environment where you need to serve the Webpack-bundled assets (workers, WASM) from a different path than their default location within the `extract2md` package (e.g., from a global CDN or a centralized static assets folder), you **must** provide the correct URLs via the `pdfJsWorkerSrc`, `tesseractWorkerPath`, and `tesseractCorePath` options in the `Extract2MDConverter` constructor.
    -   If you also move the `lang-data` directory, `tesseractLangPath` must be updated accordingly.

### API Methods

All conversion methods are asynchronous and return a `Promise` that resolves to the extracted/converted Markdown string.

#### `async quickConvert(pdfFile, options = {})`

Performs fast text extraction using the bundled `pdf.js` library. This method is suitable when speed is prioritized and the PDF's text layer is reliable.

-   `pdfFile`: A `File` object representing the PDF.
-   `options` (optional):
    -   `postProcessRules`: An array of custom post-processing rules to apply after default cleaning.

**Example:**
```javascript
const pdfFile = /* your File object */;
try {
    const markdown = await converter.quickConvert(pdfFile, {
        postProcessRules: [{ find: /DRAFT/g, replace: 'FINAL' }]
    });
    console.log("Quick Convert Markdown:", markdown);
} catch (error) {
    console.error("Quick Convert Error:", error);
}
```

#### `async highAccuracyConvert(pdfFile, options = {})`

Employs OCR via `Tesseract.js` for potentially higher accuracy, especially with scanned documents or PDFs with problematic text layers. This method renders PDF pages as images before performing OCR. Language data for English and Sinhala is automatically downloaded during installation.

-   `pdfFile`: A `File` object representing the PDF.
-   `options` (optional):
    -   `pdfRenderScale`: (Number, default: `2.5`) The scale factor for rendering PDF pages to images. Higher values can improve OCR accuracy but increase processing time.
    -   `tesseractLanguage`: (String, default: `'eng'`) The language code for Tesseract.js (e.g., `'eng'`, `'sin'`).
    -   `tesseractOptions`: (Object) Advanced options to pass directly to Tesseract.js `recognize()` method. Can be used to override Tesseract's internal asset paths if needed, though generally not required with the default setup.
    -   `postProcessRules`: An array of custom post-processing rules.

**Example:**
```javascript
try {
    const markdown = await converter.highAccuracyConvert(pdfFile, {
        pdfRenderScale: 3.0,
        tesseractLanguage: 'sin', // Use Sinhala OCR
    });
    console.log("High Accuracy OCR Markdown (Sinhala):", markdown);
} catch (error) {
    console.error("High Accuracy Convert Error:", error);
}
```

#### `async llmRewrite(textToRewrite, options = {})`

Rewrites the provided text using the WebLLM engine. This can be used to improve clarity, grammar, or tone. Note that LLM model files are not bundled with `extract2md` and are handled by WebLLM's caching or application-specific hosting (see [Using LLM Models Offline](#using-llm-models-offline)).

The default prompt is:
`"Please rewrite the following text, which was extracted from a PDF. Aim to improve its clarity, correct grammatical errors, and enhance its flow and professional tone, while preserving the original meaning, information, details, context and structure. Correct spelling errors in common words (do not change spelling in uncommon words like names, places, brands, etc.). Output only the rewritten text.\n\nOriginal Text:\n${text}\n\nRewritten Text:"`

-   `textToRewrite`: The string of text to be rewritten.
-   `options` (optional):
    -   `llmModel`: (String, default: `'Qwen3-0.6B-q4f16_0-MLC'`) The ID of the WebLLM model to use.
    -   `llmPromptTemplate`: (Function or String) A template for the LLM prompt. If a function, it receives the `textToRewrite` as an argument and should return the full prompt string. If a string, `${text}` will be replaced with `textToRewrite`.
    -   `chatOpts`: (Object) Configuration options passed directly to WebLLM's `ChatModule.reload()` or `ChatRestModule.reload()` method, useful for specifying custom model lists or other advanced WebLLM settings.

**Example:**
```javascript
const someExtractedText = "This text needs some improvement for clarity.";
try {
    const rewrittenText = await converter.llmRewrite(someExtractedText, {
        llmModel: 'Llama-3-8B-Instruct-q4f16_1-MLC', // Example: Using a different model
        llmPromptTemplate: (text) => `Make this text more concise: ${text}`
    });
    console.log("LLM Rewritten Text:", rewrittenText);
} catch (error) {
    console.error("LLM Rewrite Error:", error);
}
```

#### `async unloadLLM()`

Unloads the currently loaded LLM model from WebLLM to free up browser resources (memory, GPU). It's good practice to call this when the LLM is no longer needed.

**Example:**
```javascript
await converter.unloadLLM();
console.log("LLM model unloaded.");
```

## Advanced Offline Usage

### Using Other Tesseract Languages Offline

The `postinstall` script automatically downloads language data for English (`eng`) and Sinhala (`sin`). If you need to perform OCR for other languages:

1.  **Obtain Language Data:** Download the required `[lang].traineddata` or `[lang].traineddata.gz` file.
    -   Official Tesseract data: [tesseract-ocr/tessdata](https://github.com/tesseract-ocr/tessdata) (for Tesseract 4.x/5.x)
    -   Tesseract.js specific data (often pre-compiled for WASM): [tesseract.js-data](https://github.com/naptha/tessdata)
    Ensure the data is compatible with the Tesseract.js version used by `extract2md` (v5.x).

2.  **Make Data Available:**
    *   **Option A (Simpler, less robust for updates):** After installing `extract2md`, manually place your additional `[lang].traineddata` file into the `node_modules/extract2md/dist/assets/lang-data/` directory. The library will find it if you specify `tesseractLanguage: '[lang]'` in `highAccuracyConvert` options. This method might require repeating the copy if `extract2md` is reinstalled or updated.
    *   **Option B (Recommended for applications):** Host the language file(s) in a directory served by your application (e.g., `/static/my-custom-ocr-langs/`). Then, configure the `Extract2MDConverter` instance:
        ```javascript
        const converter = new Extract2MDConverter({
            // Points to YOUR directory for *additional* languages
            tesseractLangPath: '/static/my-custom-ocr-langs/'
            // If you've also moved the default tesseract worker/core, set those paths too.
        });
        
        // Then, when calling highAccuracyConvert:
        // await converter.highAccuracyConvert(pdfFile, { tesseractLanguage: 'your_custom_lang_code' });
        ```

### Using LLM Models Offline

The WebLLM engine JavaScript (`web-llm.js`) is bundled with `extract2md`. However, the actual LLM model files (weights, configurations) are large and are **not** included in the `extract2md` package. WebLLM handles model fetching and caching.

*   **Strategy 1: WebLLM's Built-in Caching (Default)**
    -   On the first use of a specific LLM model, WebLLM downloads it from its default CDN and caches it in the browser's IndexedDB.
    -   Subsequent calls for the same model can use the cached version, enabling offline use *after the initial online download*. This is the simplest approach if an initial online connection is acceptable.

*   **Strategy 2: Application-Managed Local Models (Full Offline Control)**
    -   For robust offline LLM functionality without relying on initial CDN downloads, you can package the LLM model artifacts directly with your application and instruct WebLLM to load them from your local paths.
    -   Download the desired model artifacts (e.g., from [MLC LLM's Hugging Face repositories](https://huggingface.co/mlc-ai)). You'll typically need the `mlc-chat-config.json`, the model weights file (e.g., `*.wasm`), and potentially other configuration files.
    -   Serve these files from your application (e.g., under `/app-assets/llm-models/YourModelName/`).
    -   Configure `Extract2MDConverter` using the `chatOpts` parameter to point WebLLM to your local model:
        ```javascript
        const myCustomModelId = 'MyLocalQwenModel';
        await converter.llmRewrite(textToRewrite, {
            llmModel: myCustomModelId, // Use your custom ID
            chatOpts: {
                // This structure is passed to WebLLM's ChatModule.reload()
                appConfig: {
                    model_list: [
                        {
                            "model_id": myCustomModelId,
                            // URL to your locally hosted mlc-chat-config.json for this model
                            "model_url": "/app-assets/llm-models/Qwen3-0.6B-q4f16_0-MLC/mlc-chat-config.json",
                            // URL to your locally hosted model library (WASM file)
                            "model_lib_url": "/app-assets/llm-models/Qwen3-0.6B-q4f16_0-MLC/Qwen3-0.6B-q4f16_0-MLC-webgpu.wasm",
                        },
                        // ... you can list other locally hosted models here
                    ],
                    // Optionally, specify a different base URL for model artifacts if not relative
                    // "model_lib_map": { /* ... */ }
                }
            }
        });
        ```
    Refer to the [WebLLM documentation](https://llm.mlc.ai/docs/deploy/javascript.html) for detailed information on `appConfig` and local model hosting.

## Configuration Options

### Constructor Options

Passed when creating an `Extract2MDConverter` instance:

| Option                | Type       | Default                                       | Description                                                                                                                               |
| --------------------- | ---------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pdfJsWorkerSrc`      | `String`   | `../pdf.worker.min.js`                        | Path to the `pdf.js` worker file, relative to the main UMD bundle (`dist/assets/`).                                                       |
| `tesseractWorkerPath` | `String`   | `./tesseract-worker.min.js`                   | Path to the Tesseract.js worker file, relative to the main UMD bundle.                                                                    |
| `tesseractCorePath`   | `String`   | `./tesseract-core.wasm.js`                    | Path to the Tesseract.js core WebAssembly file, relative to the main UMD bundle.                                                          |
| `tesseractLangPath`   | `String`   | `./lang-data/`                                | Path to the directory containing Tesseract language data files (`.traineddata`), relative to the main UMD bundle.                         |
| `tesseractLanguage`   | `String`   | `'eng'`                                       | Default language for OCR operations.                                                                                                      |
| `tesseractOptions`    | `Object`   | `{}`                                          | Advanced options passed directly to Tesseract.js `createWorker`.                                                                          |
| `splitPascalCase`     | `Boolean`  | `false`                                       | If `true`, enables heuristic splitting of `PascalCaseText` and `camelCaseText` during post-processing.                                  |
| `postProcessRules`    | `Array`    | `[]`                                          | Array of custom post-processing rules ( `{ find: RegExp, replace: String }`). Applied after default rules.                               |
| `llmModel`            | `String`   | `'Qwen3-0.6B-q4f16_0-MLC'`                    | Default WebLLM model ID for `llmRewrite()`.                                                                                               |
| `llmPromptTemplate`   | `Function` or `String` | (Default internal prompt)         | Template for LLM rewrite prompts. See `llmRewrite()` method description.                                                                  |
| `progressCallback`    | `Function` | `(progressInfo) => {}`                        | Callback function for progress updates. Receives `progressInfo` object: `{ stage: String, message: String, progress?: Number (0-1) }`. |

### Method-Specific Options

These are passed as the second argument to specific conversion methods:

-   **`quickConvert(pdfFile, options)`**:
    -   `options.postProcessRules`: (Array) Custom rules, same format as constructor.
-   **`highAccuracyConvert(pdfFile, options)`**:
    -   `options.pdfRenderScale`: (Number, default: `2.5`) PDF page rendering scale.
    -   `options.tesseractLanguage`: (String) Overrides default OCR language for this call.
    -   `options.tesseractOptions`: (Object) Overrides Tesseract options for this call.
    -   `options.postProcessRules`: (Array) Custom rules.
-   **`llmRewrite(textToRewrite, options)`**:
    -   `options.llmModel`: (String) Overrides default LLM model for this call.
    -   `options.llmPromptTemplate`: (Function or String) Overrides default prompt for this call.
    -   `options.chatOpts`: (Object) WebLLM chat configuration options.

## Post-Processing

Text extracted from PDFs often requires cleaning. `extract2md` applies a set of default post-processing rules and allows you to add custom rules.

-   **Default Rules Include**:
    -   Trimming whitespace.
    -   Normalizing line breaks.
    -   Removing excessive blank lines.
    -   Basic ligature replacement (e.g., "ﬁ" to "fi").
-   **`splitPascalCase` Option**: If enabled in the constructor, this adds a rule to heuristically insert spaces into `PascalCaseWords` and `camelCaseWords` to improve readability.
-   **Custom Rules**: You can provide an array of `{ find: RegExp, replace: String }` objects to the constructor's `postProcessRules` option or to individual conversion methods. These are applied *after* the default rules.

## Dependencies and Asset Management

`extract2md` manages its core dependencies to facilitate ease of use and offline capability:

-   **`pdfjs-dist`**: The PDF.js library is used for parsing PDF structures and rendering pages.
    -   Worker: `pdf.worker.min.mjs` (copied to `dist/` by Webpack during `extract2md`'s build).
-   **`tesseract.js`**: Used for Optical Character Recognition (OCR).
    -   Worker: `tesseract-worker.min.js` (copied to `dist/assets/`).
    -   Core WASM: `tesseract-core.wasm.js` (copied to `dist/assets/`).
    -   Language Data: `eng.traineddata` (English) and `sin.traineddata` (Sinhala) are downloaded to `dist/assets/lang-data/` by the `postinstall` script when you install `extract2md`.
-   **`@mlc-ai/web-llm`**: The WebLLM library enables client-side Large Language Model operations.
    -   Engine JavaScript: Bundled with `extract2md`.
    -   LLM Model Files: Not bundled; handled by WebLLM's caching or application-specific hosting.

The library's default path configurations assume these assets are served relative to the main `extract2md.umd.js` bundle as per the structure created in `node_modules/extract2md/dist/`.

## Supported OCR Languages

The `highAccuracyConvert()` method currently supports the following languages for OCR, with data files downloaded automatically during installation:

-   **English**: `eng` (e.g., `tesseractLanguage: 'eng'`)
-   **Sinhala**: `sin` (e.g., `tesseractLanguage: 'sin'`)

For information on using other languages, see [Using Other Tesseract Languages Offline](#using-other-tesseract-languages-offline). Language codes are typically ISO 639-2/T or ISO 639-3; consult Tesseract.js documentation for specifics.

## For Maintainers: Building the Library

1.  **Install Dependencies**: Run `npm install` in the project root.
2.  **Build**: Run `npm run build`. This command executes Webpack, which:
    -   Bundles the main library source code from `src/` into `dist/assets/extract2md.umd.js`.
    -   Uses `CopyWebpackPlugin` (configured in `webpack.config.js`) to copy essential worker and WASM files from `node_modules` (of `pdfjs-dist` and `tesseract.js`) to their respective locations in `dist/` and `dist/assets/`.
3.  **`postinstall` Script**: The `scripts/postinstall.js` script is *not* executed during the build of `extract2md` itself. It is designed to run when a *consumer* installs the `extract2md` package from npm.
4.  **Publishing Checklist**:
    -   Ensure `package.json`'s `"version"` is updated.
    -   Ensure `package.json`'s `"files"` array correctly includes `dist/`, `src/`, and `scripts/` so that all necessary components are published.
    -   The `.npmignore` file is configured to exclude the language data files from being packed into the `.tgz` (as they are fetched by `postinstall`).
    -   Run `npm pack` to create a local tarball and inspect its contents to verify correctness before publishing.
    -   Publish using `npm publish`.

## Contributing

Contributions are highly welcome! Whether it's bug reports, feature requests, documentation improvements, or code contributions, please feel free to open an issue or submit a pull request on the [GitHub repository](https://github.com/hashangit/Extract2MD).

## License

Extract2MD is released under the [MIT License](https://github.com/hashangit/Extract2MD/blob/main/LICENSE).
