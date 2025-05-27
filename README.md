# Extract2MD - Enhanced PDF to Markdown Converter

<!-- Badges (Placeholder - Replace with actual badges) -->
[![NPM Version](https://img.shields.io/npm/v/extract2md.svg)](https://www.npmjs.com/package/extract2md)
[![License](https://img.shields.io/npm/l/extract2md.svg)](https://github.com/hashangit/Extract2MD/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dt/extract2md.svg)](https://www.npmjs.com/package/extract2md)

[![Sponsor on Patreon](https://img.shields.io/badge/Sponsor%20on-Patreon-F96854?logo=patreon&style=flat)](https://www.patreon.com/HashanWickramasinghe)

A powerful client-side JavaScript library for converting PDFs to Markdown with multiple extraction methods and optional LLM enhancement. Now with scenario-specific methods for different use cases.

![Extract2MD](https://github.com/user-attachments/assets/0704e80a-54bc-4449-a495-eb944a318400)

## 🚀 Quick Start

Extract2MD now offers 5 distinct scenarios for different conversion needs:

```javascript
import Extract2MDConverter from 'extract2md';

// Scenario 1: Quick conversion only
const markdown1 = await Extract2MDConverter.quickConvertOnly(pdfFile);

// Scenario 2: High accuracy OCR conversion only  
const markdown2 = await Extract2MDConverter.highAccuracyConvertOnly(pdfFile);

// Scenario 3: Quick conversion + LLM enhancement
const markdown3 = await Extract2MDConverter.quickConvertWithLLM(pdfFile);

// Scenario 4: High accuracy conversion + LLM enhancement
const markdown4 = await Extract2MDConverter.highAccuracyConvertWithLLM(pdfFile);

// Scenario 5: Combined extraction + LLM enhancement (most comprehensive)
const markdown5 = await Extract2MDConverter.combinedConvertWithLLM(pdfFile);
```

## 📋 Scenarios Explained

### Scenario 1: Quick Convert Only
- **Use case**: Fast conversion when PDF has selectable text
- **Method**: `quickConvertOnly(pdfFile, config?)`
- **Tech**: PDF.js text extraction only
- **Output**: Basic markdown formatting

### Scenario 2: High Accuracy Convert Only
- **Use case**: PDFs with images, scanned documents, complex layouts
- **Method**: `highAccuracyConvertOnly(pdfFile, config?)`
- **Tech**: Tesseract.js OCR
- **Output**: Markdown from OCR extraction

### Scenario 3: Quick Convert + LLM
- **Use case**: Fast extraction with AI enhancement for better formatting
- **Method**: `quickConvertWithLLM(pdfFile, config?)`
- **Tech**: PDF.js + WebLLM
- **Output**: AI-enhanced markdown with improved structure and clarity

### Scenario 4: High Accuracy + LLM
- **Use case**: OCR extraction with AI enhancement
- **Method**: `highAccuracyConvertWithLLM(pdfFile, config?)`
- **Tech**: Tesseract.js OCR + WebLLM
- **Output**: AI-enhanced markdown from OCR

### Scenario 5: Combined + LLM (Recommended)
- **Use case**: Most comprehensive conversion using both extraction methods
- **Method**: `combinedConvertWithLLM(pdfFile, config?)`
- **Tech**: PDF.js + Tesseract.js + WebLLM with specialized prompts
- **Output**: Best possible markdown leveraging strengths of both extraction methods

## ⚙️ Configuration

Create a configuration object or JSON file to customize behavior:

```javascript
const config = {
  // PDF.js Worker
  pdfJsWorkerSrc: "../pdf.worker.min.mjs",
  
  // Tesseract OCR Settings
  tesseract: {
    workerPath: "./tesseract-worker.min.js",
    corePath: "./tesseract-core.wasm.js", 
    langPath: "./lang-data/",
    language: "eng",
    options: {}
  },
  
  // LLM Configuration
  webllm: {
    model: "Qwen3-0.6B-q4f16_1-MLC",
    // Optional: Custom model
    customModel: {
      model: "https://huggingface.co/mlc-ai/your-model/resolve/main/",
      model_id: "YourModel-ID",
      model_lib: "https://example.com/your-model.wasm",
      required_features: ["shader-f16"],
      overrides: { conv_template: "qwen" }
    },
    options: {
      temperature: 0.7,
      maxTokens: 4096
    }
  },
  
  // System Prompt Customizations
  systemPrompts: {
    singleExtraction: "Focus on preserving code examples exactly.",
    combinedExtraction: "Pay attention to tables and diagrams from OCR."
  },
  
  // Processing Options
  processing: {
    splitPascalCase: false,
    pdfRenderScale: 2.5,
    postProcessRules: [
      { find: /\bAPI\b/g, replace: "API" }
    ]
  },
  
  // Progress Tracking
  progressCallback: (progress) => {
    console.log(`${progress.stage}: ${progress.message}`);
    if (progress.currentPage) {
      console.log(`Page ${progress.currentPage}/${progress.totalPages}`);
    }
  }
};

// Use configuration
const markdown = await Extract2MDConverter.combinedConvertWithLLM(pdfFile, config);
```

## 🔧 Advanced Usage

### Using Individual Components

```javascript
import { 
  WebLLMEngine, 
  OutputParser, 
  SystemPrompts,
  ConfigValidator 
} from 'extract2md';

// Validate configuration
const validatedConfig = ConfigValidator.validate(userConfig);

// Initialize WebLLM engine
const engine = new WebLLMEngine(validatedConfig);
await engine.initialize();

// Generate text
const result = await engine.generate("Your prompt here");

// Parse output
const parser = new OutputParser();
const cleanMarkdown = parser.parse(result);
```

### Custom System Prompts

The library uses different system prompts for different scenarios:

```javascript
// For scenarios 3 & 4 (single extraction)
const singlePrompt = SystemPrompts.getSingleExtractionPrompt(
  "Additional instruction: Preserve all technical terms."
);

// For scenario 5 (combined extraction) 
const combinedPrompt = SystemPrompts.getCombinedExtractionPrompt(
  "Focus on creating comprehensive documentation."
);
```

### Configuration from JSON

```javascript
import { ConfigValidator } from 'extract2md';

// Load from JSON string
const config = ConfigValidator.fromJSON(configJsonString);

// Use with any scenario
const result = await Extract2MDConverter.quickConvertWithLLM(pdfFile, config);
```

## 🎯 Error Handling & Progress Tracking

```javascript
const config = {
  progressCallback: (progress) => {
    switch (progress.stage) {
      case 'scenario_5_start':
        console.log('Starting combined conversion...');
        break;
      case 'webllm_load_progress':
        console.log(`Loading model: ${progress.progress}%`);
        break;
      case 'ocr_page_process':
        console.log(`OCR: ${progress.currentPage}/${progress.totalPages}`);
        break;
      case 'webllm_generate_start':
        console.log('AI enhancement in progress...');
        break;
      case 'scenario_5_complete':
        console.log('Conversion completed!');
        break;
      default:
        console.log(`${progress.stage}: ${progress.message}`);
    }
    
    if (progress.error) {
      console.error('Error:', progress.error);
    }
  }
};

try {
  const result = await Extract2MDConverter.combinedConvertWithLLM(pdfFile, config);
  console.log('Success:', result);
} catch (error) {
  console.error('Conversion failed:', error.message);
}
```

## 🔄 Migration from Legacy API

If you're using the old API, you can still access it:

```javascript
import { LegacyExtract2MDConverter } from 'extract2md';

// Old way
const converter = new LegacyExtract2MDConverter(options);
const quick = await converter.quickConvert(pdfFile);
const ocr = await converter.highAccuracyConvert(pdfFile);
const enhanced = await converter.llmRewrite(text);

// New way (recommended)
const quick = await Extract2MDConverter.quickConvertOnly(pdfFile, config);
const ocr = await Extract2MDConverter.highAccuracyConvertOnly(pdfFile, config);
const enhanced = await Extract2MDConverter.quickConvertWithLLM(pdfFile, config);
```

## 🌟 Features

- **5 Scenario-Specific Methods**: Choose the right approach for your use case
- **WebLLM Integration**: Client-side AI enhancement with Qwen models
- **Custom Model Support**: Use your own trained models
- **Advanced Output Parsing**: Automatic removal of thinking tags and formatting
- **Comprehensive Configuration**: Fine-tune every aspect of the conversion
- **Progress Tracking**: Real-time updates for UI integration
- **TypeScript Support**: Full type definitions included
- **Backwards Compatible**: Legacy API still available

## 📚 TypeScript Support

Full TypeScript definitions are included:

```typescript
import Extract2MDConverter, { 
  Extract2MDConfig, 
  ProgressReport,
  CustomModelConfig 
} from 'extract2md';

const config: Extract2MDConfig = {
  webllm: {
    model: "Qwen3-0.6B-q4f16_1-MLC",
    options: {
      temperature: 0.7,
      maxTokens: 4096
    }
  },
  progressCallback: (progress: ProgressReport) => {
    console.log(progress.stage, progress.message);
  }
};

const result: string = await Extract2MDConverter.combinedConvertWithLLM(pdfFile, config);
```

## 🏗️ Installation & Deployment

### NPM Installation
```bash
npm install extract2md
```

### CDN Usage
```html
<script src="https://unpkg.com/extract2md@2.0.0/dist/assets/extract2md.umd.js"></script>
<script>
    // Available as global Extract2MD
    const result = await Extract2MD.Extract2MDConverter.quickConvertOnly(pdfFile);
</script>
```

### Worker Files Configuration
The package requires worker files for PDF.js and Tesseract.js. These are automatically copied during build:

```javascript
// Default worker paths (adjust for your deployment)
const config = {
    pdfJsWorkerSrc: "/pdf.worker.min.mjs",
    tesseract: {
        workerPath: "/tesseract-worker.min.js",
        corePath: "/tesseract-core.wasm.js"
    }
};
```

### Bundle Size Considerations
- **Total Size**: ~11 MB (includes OCR and PDF processing)
- **PDF.js**: ~950 KB
- **Tesseract.js**: ~4.5 MB 
- **WebLLM**: Variable (model-dependent)

Use lazy loading and code splitting for production deployments.

## 📚 Documentation

- **[Migration Guide](./MIGRATION.md)** - Upgrade from legacy API
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Examples](./examples/)** - Complete usage examples
- **[How To Run the Demo](./examples/README.md)** - Instructions on how to run the demo
- **[TypeScript Definitions](./src/types/index.d.ts)** - Full type definitions

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines before submitting PRs.

## 🐛 Issues

Report issues on the [GitHub Issues page](https://github.com/hashangit/Extract2MD/issues).
