# Extract2MD - Client-Side PDF to Markdown Converter (extract2md)

A powerful and versatile client-side JavaScript library for extracting text from PDF files and converting it into Markdown. It offers multiple extraction strategies, including fast direct extraction and high-accuracy OCR, along with an optional LLM-based text rewriting feature using WebLLM. Core dependencies are bundled for enhanced offline capability.

**Version**: 1.0.0

## Features

- **Offline Capable Core**: 
  - `pdf.js` (engine and worker)
  - `Tesseract.js` (engine, worker, and core WASM)
  - **Language data for all listed supported languages for Tesseract.js (`*.traineddata.gz`)**
  - WebLLM engine JavaScript
  All these core dependencies are bundled with the library (typically in `dist/assets/`), enabling core functionality in offline applications when assets are served correctly.
- **Multiple Extraction Methods**:
  - `quickConvert()`: Fast text extraction using bundled pdf.js.
  - `highAccuracyConvert()`: Slower but often more accurate text extraction using bundled pdf.js (for rendering) and Tesseract.js (for OCR).
- **LLM-Powered Rewriting**:
  - `llmRewrite()`: Optionally rewrite extracted text using the bundled WebLLM engine. LLM model files require separate handling for offline use (see "Offline LLM Models" section).
- **Configurable Post-Processing**: Apply default and custom rules to clean and normalize extracted text. Includes an option to control aggressive splitting of PascalCase/camelCase words.
- **Markdown Conversion**: Converts processed text into a basic, DuckDB-friendly Markdown format.
- **Client-Side Operation**: Runs entirely in the user's web browser.
- **Progress Reporting**: Callbacks for tracking lengthy operations.
- **Configurable**: Paths for workers/assets, Tesseract.js options, post-processing rules, LLM model selection and prompts.

## Installation

### Via NPM

```bash
npm install extract2md
```

Then, import it into your project (ES Module):

```javascript
import Extract2MDConverter from 'extract2md';
```

## Usage

### Initialization

```javascript
const converter = new Extract2MDConverter({
    // Optional: Override default paths if your bundled assets are in a custom location.
    // Defaults assume the main bundle is in 'dist/assets/' and other assets are relative to it.
    // pdfJsWorkerSrc: '../pdf.worker.min.js', // Default (relative to dist/assets/)
    // tesseractWorkerPath: './tesseract-worker.min.js', // Default (relative to dist/assets/)
    // tesseractCorePath: './tesseract-core.wasm.js', // Default (relative to dist/assets/)
    // tesseractLangPath: './lang-data/', // Default, contains bundled languages (relative to dist/assets/)

    // Example of custom paths if assets are served from '/static/my-pdf-lib/':
    // pdfJsWorkerSrc: '/static/my-pdf-lib/pdf.worker.min.js', 
    // tesseractWorkerPath: '/static/my-pdf-lib/tesseract-worker.min.js',
    // tesseractCorePath: '/static/my-pdf-lib/tesseract-core.wasm.js',
    // tesseractLangPath: '/static/my-pdf-lib/lang-data/', // For *additional* non-bundled languages
    
    tesseractLanguage: 'eng', // Default language. All supported languages are bundled.
    splitPascalCase: false, // Default is false. Set to true to enable splitting PascalCaseText.

    postProcessRules: [ /* ... custom rules ... */ ],
    llmModel: 'Qwen3-0.6B-q4f16_0-MLC', // Default LLM for rewrite. Other models can be used.
    progressCallback: (progressInfo) => { 
        console.log(`[${progressInfo.stage}] ${progressInfo.message}`, progressInfo.progress !== undefined ? (progressInfo.progress*100).toFixed(1)+'%' : '');
        // Update UI, e.g., progressInfo.progress (0-1 for LLM load)
    }
});
```

**Note on Asset Paths for Offline Use**:
The library's build process (via its `webpack.config.js`) copies essential runtime assets:
- `extract2md.umd.js` (main bundle) to `dist/assets/`
- `pdf.worker.min.js` to `dist/`
- Tesseract.js worker (`tesseract-worker.min.js`) to `dist/assets/`
- Tesseract.js core WASM (`tesseract-core.wasm.js`) to `dist/assets/`
- **Tesseract.js language data (`*.traineddata.gz`) for all supported languages to `dist/assets/lang-data/`**

- **Default Behavior**: The library defaults to looking for these assets relative to where the main bundle (`dist/assets/extract2md.umd.js`) is loaded.
    - `pdf.worker.min.js` is expected at `../pdf.worker.min.js` (i.e., in the `dist/` folder).
    - Tesseract assets (`worker`, `core`, `lang-data`) are expected in `./` relative to `dist/assets/` (i.e., within `dist/assets/`). The `lang-data` subdirectory contains all bundled language files.
- **Offline Deployment**: For reliable offline functionality, your application must serve the *entire* `dist` folder from the `extract2md` package (including `dist/pdf.worker.min.js` and the `dist/assets/` subdirectory with its contents).
- **Custom Hosting**: If you host these assets at different locations, you **must** override the corresponding path options in the constructor.

### Methods

All conversion methods are asynchronous and return a Promise resolving to the Markdown string.

#### 1. async quickConvert(pdfFile, options = {})

Uses bundled pdf.js for direct text extraction.

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

(Options: postProcessRules)

#### 2. async highAccuracyConvert(pdfFile, options = {})

Uses bundled pdf.js (for rendering) and Tesseract.js (for OCR). **Language data for all supported languages is bundled.**

```javascript
try {
    const markdown = await converter.highAccuracyConvert(pdfFile, {
        pdfRenderScale: 2.5, // Default: 2.5
        tesseractLanguage: 'fra', // Example: Use French. Its data is bundled.
    });
    console.log("High Accuracy OCR Markdown:", markdown);
} catch (error) {
    console.error("High Accuracy Convert Error:", error);
}
```

(Options: pdfRenderScale, tesseractLanguage, tesseractOptions (to override Tesseract internal paths if needed), postProcessRules)

#### 3. async llmRewrite(textToRewrite, options = {})

Rewrites text using the bundled WebLLM engine. LLM model files are handled separately for offline use.
The default prompt aims to improve clarity, grammar, and flow, while preserving core meaning. It is:
`"Please rewrite the following text, which was extracted from a PDF. Aim to improve its clarity, correct grammatical errors, and enhance its flow and professional tone, while preserving the original meaning, information, details, context and structure. Correct spelling errors in common words (do not change spelling in uncommon words like names, places, brands, etc.). Output only the rewritten text.\n\nOriginal Text:\n${text}\n\nRewritten Text:"`

```javascript
const someExtractedText = "This text needs improvement.";
try {
    const rewrittenText = await converter.llmRewrite(someExtractedText, {
        llmModel: 'Qwen3-0.6B-q4f16_0-MLC', 
        llmPromptTemplate: (text) => `Improve this text: ${text}`
    });
    console.log("LLM Rewritten Text:", rewrittenText);
} catch (error) {
    console.error("LLM Rewrite Error:", error);
}
```

(Options: llmModel, llmPromptTemplate, chatOpts for WebLLM configuration)

#### 4. async unloadLLM()

Unloads the current LLM model to free resources.

```javascript
await converter.unloadLLM();
```

## Offline Usage Considerations

### Core Functionality (PDF Parsing, OCR with Supported Languages)

The library is designed to work offline for its core PDF parsing and OCR capabilities for **all listed supported languages**.
- `pdf.js` (engine and worker), `Tesseract.js` (engine, worker, and core WASM), and **language data (`*.traineddata.gz`) for all supported languages** are copied to the `dist/` and `dist/assets/` folders by the library's build process.
- Your application must serve the entire `dist` folder correctly.
- The constructor defaults for asset paths are set up for this bundled structure, meaning OCR for supported languages works offline out-of-the-box.
- If you serve assets from a different structure, you must override these paths in the constructor.

### Offline Tesseract Languages (Custom/Non-Bundled)

- The package bundles language data for all languages listed in the "Supported languages" section by default into `dist/assets/lang-data/`.
- If you need to use a language *not* listed as supported (and therefore not bundled):
  1. Download the required `[lang].traineddata.gz` files (e.g., from [tesseract.js-data](https://github.com/naptha/tessdata) or another official Tesseract data source). Use files compatible with your Tesseract.js version (v5.x).
  2. Place these language files in a directory served by your application. For example, if your application serves them from `/static/my-ocr-langs/`, your `xyz.traineddata.gz` would be at `/static/my-ocr-langs/xyz.traineddata.gz`.
  3. Configure the `Extract2MDConverter` instance:
    ```javascript
    const converter = new Extract2MDConverter({
        // This points to YOUR directory for *additional, non-bundled* languages
        tesseractLangPath: '/static/my-ocr-langs/' 
        // other options like workerPath/corePath might also need to be set if not using defaults
    });
    // Then, when calling highAccuracyConvert:
    // await converter.highAccuracyConvert(file, { tesseractLanguage: 'xyz' }); // For your custom language
    ```

### Offline LLM Models for llmRewrite

The WebLLM engine JavaScript is bundled. LLM model files (weights, etc.) are large and are **not** bundled.

#### Strategy 1: WebLLM Caching (Requires Initial Online Load per Model)
- WebLLM downloads and caches models in IndexedDB on first use. Subsequent offline calls can use the cache.

#### Strategy 2: Application-Managed Local Models (Robust Offline)
- Package LLM model artifacts with your application and configure WebLLM via `chatOpts` to load them locally.
```javascript
// Example: Model files are in your app at '/app-assets/llm-models/Qwen3-0.6B-q4f16_0-MLC/'
const myModelId = 'MyLocalQwen'; 
await converter.llmRewrite(text, {
    llmModel: myModelId,
    chatOpts: {
        appConfig: {
            model_list: [
                {
                    "model_id": myModelId,
                    "model_url": "/app-assets/llm-models/Qwen3-0.6B-q4f16_0-MLC/mlc-chat-config.json",
                    "model_lib_url": "/app-assets/llm-models/Qwen3-0.6B-q4f16_0-MLC/Qwen3-0.6B-q4f16_0-MLC-webgpu.wasm",
                },
            ]
        }
    }
});
```

## Post-Processing Rules
(Structure: `[{ find: RegExp, replace: String }, ...]`. Applied after defaults and constructor rules.)
- **`splitPascalCase` (boolean, default `false`):** If set to `true` in constructor options, enables heuristic splitting of `PascalCaseText` and `camelCaseText`.

## Markdown Conversion Logic (_convertToMarkdownLogic)
(Internal method for converting cleaned text to Markdown with heuristics for headings, paragraphs,and code blocks/tables.)

## Dependencies (Bundled for Core Offline Use)
- **pdfjs-dist**: Engine and worker. Worker copied to `dist/`.
- **tesseract.js**: Engine, worker, core WASM. Copied to `dist/assets/`.
- **tesseract.js-data**: Language data (`*.traineddata.gz`) for **all supported languages** copied to `dist/assets/lang-data/`.
- **@mlc-ai/web-llm**: Engine JavaScript is bundled. LLM model files are handled separately.

## Supported languages by the highAccuracyConvert()
(Language codes are typically ISO 639-2/T or ISO 639-3. Check Tesseract.js documentation. **All language data files listed here are bundled with the package.**)
Arabic - tesseractLanguage: 'ara'
Chinese - Simplified - tesseractLanguage: 'chi_sim'
Chinese - Traditional - tesseractLanguage: 'chi_tra'
Danish - tesseractLanguage: 'dan'
Dutch - tesseractLanguage: 'nld'
English - tesseractLanguage: 'eng'
Finnish - tesseractLanguage: 'fin'
French - tesseractLanguage: 'fra'
German - tesseractLanguage: 'deu'
Hindi - tesseractLanguage: 'hin'
Irish - tesseractLanguage: 'gle'
Italian - tesseractLanguage: 'ita'
Indonesian - tesseractLanguage: 'ind'
Javanese - tesseractLanguage: 'jav'
Japanese - tesseractLanguage: 'jpn'
Korean - tesseractLanguage; 'kor'
Malay - tesseractLanguage: 'msa'
Marathi - tesseractLanguage: 'mar'
Norwegian - tesseractLanguage: 'nor
Portuguese - tesseractLanguage: 'por'
Russian - tesseractLanguage: 'rus'
Sinhala - tesseractLanguage: 'sin'
Spanish - tesseractLanguage: 'spa'
Swedish - tesseractLanguage: 'swe'
Tagalog - tesseractLanguage: 'tgl'
Telugu - tesseractLanguage: 'tel'
Thai - tesseractLanguage: 'tha'
Tamil - tesseractLanguage: 'tam'
Turkish - tesseractLanguage: 'tur'
Ukrainian - tesseractLanguage: 'ukr'
Urdu - tesseractLanguage: 'urd'
Vietnamese - tesseractLanguage: 'vie'
Welsh - tesseractLanguage: 'cym'

## Building the Library (For Maintainers)
1. Ensure you have a `lang-data` folder at the project root containing **all** `*.traineddata.gz` files for the languages you want to bundle and list as supported.
2. Run `npm run build`.
3. Refer to the "Guide: Setting Up and Publishing Your Client-Side PDF to Markdown NPM Package" for full publishing instructions.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## License
MIT
