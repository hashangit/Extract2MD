# Migration Guide: Extract2MD v1.0.6

This guide helps you migrate from the legacy Extract2MD API to the new scenario-based API introduced in v1.0.6.

## Overview of Changes

The Extract2MD package has been restructured to provide clear, scenario-specific methods instead of a single class with multiple configuration options. This makes the API more intuitive and provides better TypeScript support.

## Key Changes

### Before (Legacy API)
```javascript
import Extract2MD from 'extract2md';

const converter = new Extract2MD();
const result = await converter.convertPDFToMarkdown(pdfFile, {
    useOCR: true,
    useLLM: false,
    ocrLanguage: 'eng'
});
```

### After (New API)
```javascript
import { Extract2MDConverter } from 'extract2md';

const result = await Extract2MDConverter.quickConvertOnly(pdfFile, {
    ocr: {
        language: 'eng',
        oem: 1,
        psm: 6
    }
});
```

## Migration by Use Case

### 1. Basic PDF Text Extraction (No OCR, No LLM)

**Legacy:**
```javascript
const converter = new Extract2MD();
const result = await converter.convertPDFToMarkdown(pdfFile, {
    useOCR: false,
    useLLM: false
});
```

**New:**
```javascript
const result = await Extract2MDConverter.quickConvertOnly(pdfFile, {
    // OCR config is optional - will use PDF text extraction only
});
```

### 2. PDF with OCR (No LLM)

**Legacy:**
```javascript
const converter = new Extract2MD();
const result = await converter.convertPDFToMarkdown(pdfFile, {
    useOCR: true,
    useLLM: false,
    ocrLanguage: 'eng',
    ocrPSM: 6
});
```

**New - Quick OCR:**
```javascript
const result = await Extract2MDConverter.quickConvertOnly(pdfFile, {
    ocr: {
        language: 'eng',
        oem: 1,
        psm: 6
    }
});
```

**New - High Accuracy OCR:**
```javascript
const result = await Extract2MDConverter.highAccuracyConvertOnly(pdfFile, {
    ocr: {
        language: 'eng',
        oem: 1,
        psm: 8
    }
});
```

### 3. PDF with OCR and LLM Rewrite

**Legacy:**
```javascript
const converter = new Extract2MD();
const result = await converter.convertPDFToMarkdown(pdfFile, {
    useOCR: true,
    useLLM: true,
    ocrLanguage: 'eng',
    llmModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    llmTemperature: 0.7
});
```

**New - Quick OCR + LLM:**
```javascript
const result = await Extract2MDConverter.quickConvertWithLLM(pdfFile, {
    ocr: {
        language: 'eng',
        oem: 1,
        psm: 6
    },
    webllm: {
        modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        temperature: 0.7,
        maxTokens: 4000,
        streamingEnabled: false
    }
});
```

**New - High Accuracy OCR + LLM:**
```javascript
const result = await Extract2MDConverter.highAccuracyConvertWithLLM(pdfFile, {
    ocr: {
        language: 'eng',
        oem: 1,
        psm: 8
    },
    webllm: {
        modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        temperature: 0.7,
        maxTokens: 4000,
        streamingEnabled: false
    }
});
```

### 4. Combined Extraction Methods with LLM

This is a new feature not available in the legacy API:

```javascript
const result = await Extract2MDConverter.combinedConvertWithLLM(pdfFile, {
    ocr: {
        language: 'eng',
        oem: 1,
        psm: 6
    },
    webllm: {
        modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        temperature: 0.7,
        maxTokens: 4000,
        streamingEnabled: false
    }
});
```

## Configuration Changes

### OCR Configuration

**Legacy:**
```javascript
{
    ocrLanguage: 'eng',
    ocrPSM: 6,
    ocrOEM: 1
}
```

**New:**
```javascript
{
    ocr: {
        language: 'eng',
        psm: 6,
        oem: 1
    }
}
```

### LLM Configuration

**Legacy:**
```javascript
{
    llmModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    llmTemperature: 0.7,
    llmMaxTokens: 4000
}
```

**New:**
```javascript
{
    webllm: {
        modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        temperature: 0.7,
        maxTokens: 4000,
        streamingEnabled: false
    }
}
```

## Backwards Compatibility

The legacy API is still available for backwards compatibility:

```javascript
import { LegacyExtract2MDConverter } from 'extract2md';

const converter = new LegacyExtract2MDConverter();
// Use old API as before
```

**Note:** The legacy API is deprecated and will be removed in v2.0.0. Please migrate to the new API.

## Benefits of the New API

1. **Clear Scenarios**: Each method has a specific purpose, making it easier to choose the right approach
2. **Better TypeScript Support**: Full type definitions for all configurations and return types
3. **Modular Architecture**: Better code organization and maintainability
4. **Configuration Validation**: Built-in validation for all configuration options
5. **Improved Error Handling**: More specific error messages and better error recovery
6. **Better Documentation**: Each scenario method is well-documented with examples

## Configuration Files

You can now use external configuration files:

```javascript
// config.json
{
    "ocr": {
        "language": "eng",
        "oem": 1,
        "psm": 6
    },
    "webllm": {
        "modelId": "Llama-3.2-1B-Instruct-q4f16_1-MLC",
        "temperature": 0.7,
        "maxTokens": 4000,
        "streamingEnabled": false
    }
}
```

```javascript
// In your code
const result = await Extract2MDConverter.quickConvertWithLLM(pdfFile, 'config.json');
```

## Error Handling

The new API provides more specific error types:

```javascript
try {
    const result = await Extract2MDConverter.quickConvertOnly(pdfFile, config);
} catch (error) {
    if (error.name === 'ConfigurationError') {
        console.error('Configuration issue:', error.message);
    } else if (error.name === 'OCRError') {
        console.error('OCR processing failed:', error.message);
    } else if (error.name === 'WebLLMError') {
        console.error('LLM processing failed:', error.message);
    } else {
        console.error('General error:', error.message);
    }
}
```

## Testing Your Migration

Use the provided test files to validate your migration:

```javascript
import { Extract2MDTests } from 'extract2md/test/scenarios.test.js';

const tests = new Extract2MDTests();
await tests.runBasicTests();

// With a PDF file
await tests.runFullTests(pdfFile);
```

## Need Help?

- Check the [examples](./examples/) folder for complete usage examples
- See the [README.md](./README.md) for full API documentation
- Open an issue on GitHub if you encounter migration problems

## Timeline

- **v1.0.6**: New API introduced, legacy API deprecated
- **v1.1.0**: Legacy API will show deprecation warnings
- **v2.0.0**: Legacy API will be removed (planned for 6 months after v1.0.6)

Migrate to the new API as soon as possible to take advantage of the improved features and ensure compatibility with future versions.
