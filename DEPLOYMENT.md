# Deployment Documentation for Extract2MD v1.0.6

This document outlines the deployment process, distribution methods, and integration guidelines for the Extract2MD package.

## Package Structure

The Extract2MD package is distributed with the following structure:

```
extract2md/
├── dist/                           # Built files for distribution
│   ├── assets/
│   │   ├── extract2md.umd.js      # Main UMD bundle
│   │   ├── extract2md.umd.js.map  # Source map
│   │   ├── tesseract-worker.min.js # Tesseract.js worker
│   │   └── tesseract-core.wasm.js  # Tesseract WASM core
│   └── pdf.worker.min.mjs          # PDF.js worker
├── src/                            # Source code
│   ├── types/index.d.ts           # TypeScript definitions
│   ├── index.js                   # Main entry point
│   ├── converters/                # Converter modules
│   ├── engines/                   # Processing engines
│   └── utils/                     # Utility modules
├── examples/                      # Usage examples and demo
├── test/                         # Test files
├── package.json                  # Package configuration
├── config.example.json          # Example configuration
├── README.md                 # Main documentation
└── MIGRATION.md                 # Migration guide
```

## Distribution Methods

### 1. NPM Package Distribution

The package is designed for npm distribution with full TypeScript support.

#### Installation
```bash
npm install extract2md
```

#### Package Entry Points
- **Main (UMD)**: `dist/assets/extract2md.umd.js` - For browser use
- **Module (ES6)**: `src/index.js` - For modern bundlers
- **Types**: `src/types/index.d.ts` - TypeScript definitions

### 2. CDN Distribution

The UMD bundle can be served via CDN for direct browser use:

```html
<script src="https://unpkg.com/extract2md@1.0.6/dist/assets/extract2md.umd.js"></script>
<script>
    // Extract2MD is available as a global variable
    const result = await Extract2MD.Extract2MDConverter.quickConvertOnly(pdfFile, config);
</script>
```

### 3. Direct Bundle Integration

For projects that need to bundle the library:

```javascript
import { Extract2MDConverter } from 'extract2md';
// Use ES6 modules with tree shaking support
```

## Build Process

### Prerequisites
- Node.js 14+ 
- npm 7+

### Building the Package

```bash
# Install dependencies
npm install

# Build the UMD bundle
npm run build

# Run tests
npm test

# Prepare for publishing
npm run prepublishOnly
```

### Build Outputs

The build process creates:
1. **UMD Bundle**: `dist/assets/extract2md.umd.js` (5.69 MiB)
2. **Worker Files**: Required for PDF.js and Tesseract.js
3. **Source Maps**: For debugging

## Deployment Configurations

### 1. Web Application Deployment

For web applications using the library:

```javascript
// Webpack configuration example
module.exports = {
    resolve: {
        fallback: {
            "fs": false,
            "path": false
        }
    },
    // Copy worker files to your public directory
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'node_modules/extract2md/dist/pdf.worker.min.mjs', to: 'public/' },
                { from: 'node_modules/extract2md/dist/assets/tesseract-worker.min.js', to: 'public/' },
                { from: 'node_modules/extract2md/dist/assets/tesseract-core.wasm.js', to: 'public/' }
            ]
        })
    ]
};
```

### 2. Node.js Server Deployment

For server-side use (limited functionality due to browser dependencies):

```javascript
// Server-side usage (configuration validation only)
import { ConfigValidator } from 'extract2md/src/utils/ConfigValidator.js';

const validator = new ConfigValidator();
const isValid = validator.validate(config);
```

### 3. Static Site Deployment

For static sites or demos:

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://unpkg.com/extract2md@1.0.6/dist/assets/extract2md.umd.js"></script>
</head>
<body>
    <input type="file" id="pdfInput" accept=".pdf">
    <button onclick="convertPDF()">Convert</button>
    <div id="output"></div>

    <script>
        async function convertPDF() {
            const file = document.getElementById('pdfInput').files[0];
            if (!file) return;

            try {
                const result = await Extract2MD.Extract2MDConverter.quickConvertOnly(file, {
                    ocr: { language: 'eng', oem: 1, psm: 6 }
                });
                document.getElementById('output').innerHTML = `<pre>${result}</pre>`;
            } catch (error) {
                console.error('Conversion failed:', error);
            }
        }
    </script>
</body>
</html>
```

## Performance Considerations

### Bundle Size Optimization

The package includes large dependencies:
- **PDF.js**: ~951 KB (PDF processing)
- **Tesseract.js**: ~4.5 MB (OCR functionality)
- **WebLLM**: ~Variable (model-dependent)

#### Optimization Strategies:

1. **Lazy Loading**: Load only required modules
```javascript
// Load only when needed
const { Extract2MDConverter } = await import('extract2md');
```

2. **Code Splitting**: Separate scenarios into different chunks
```javascript
// Webpack code splitting
const quickConvert = () => import('extract2md').then(m => m.Extract2MDConverter.quickConvertOnly);
```

3. **CDN Caching**: Use CDN for static assets
```javascript
// Configure worker paths to use CDN
window.EXTRACT2MD_CONFIG = {
    workerPaths: {
        pdf: 'https://cdn.example.com/pdf.worker.min.mjs',
        tesseract: 'https://cdn.example.com/tesseract-worker.min.js'
    }
};
```

## Security Considerations

### Content Security Policy (CSP)

When deploying, configure CSP headers:

```
Content-Security-Policy: 
    script-src 'self' 'wasm-unsafe-eval';
    worker-src 'self' blob:;
    connect-src 'self' https://huggingface.co;
```

### File Processing Security

- Files are processed client-side only
- No data is sent to external servers (except WebLLM model downloads)
- Implement file size limits for production use

## Monitoring and Debugging

### Error Tracking

```javascript
try {
    const result = await Extract2MDConverter.quickConvertOnly(file, config);
} catch (error) {
    // Log error details for monitoring
    console.error('Extract2MD Error:', {
        type: error.name,
        message: error.message,
        scenario: 'quickConvertOnly',
        timestamp: new Date().toISOString()
    });
}
```

### Performance Monitoring

```javascript
const startTime = performance.now();
const result = await Extract2MDConverter.quickConvertOnly(file, config);
const duration = performance.now() - startTime;

console.log(`Conversion took ${duration}ms`);
```

## Version Management

### Semantic Versioning

The package follows semantic versioning:
- **Major**: Breaking API changes
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

### Upgrade Path

1. **v1.0.x**: Current stable release
2. **v1.1.x**: Planned features (streaming, progress callbacks)
3. **v2.0.x**: Planned breaking changes (remove legacy API)

## Integration Examples

### React Integration

```jsx
import React, { useState } from 'react';
import { Extract2MDConverter } from 'extract2md';

function PDFConverter() {
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConvert = async (file) => {
        setLoading(true);
        try {
            const markdown = await Extract2MDConverter.quickConvertOnly(file, {
                ocr: { language: 'eng', oem: 1, psm: 6 }
            });
            setResult(markdown);
        } catch (error) {
            console.error('Conversion failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <input 
                type="file" 
                accept=".pdf" 
                onChange={(e) => handleConvert(e.target.files[0])} 
            />
            {loading && <p>Converting...</p>}
            {result && <pre>{result}</pre>}
        </div>
    );
}
```

### Vue.js Integration

```vue
<template>
    <div>
        <input type="file" @change="convertPDF" accept=".pdf" />
        <div v-if="loading">Converting...</div>
        <pre v-if="result">{{ result }}</pre>
    </div>
</template>

<script>
import { Extract2MDConverter } from 'extract2md';

export default {
    data() {
        return {
            result: '',
            loading: false
        };
    },
    methods: {
        async convertPDF(event) {
            const file = event.target.files[0];
            if (!file) return;

            this.loading = true;
            try {
                this.result = await Extract2MDConverter.quickConvertOnly(file, {
                    ocr: { language: 'eng', oem: 1, psm: 6 }
                });
            } catch (error) {
                console.error('Conversion failed:', error);
            } finally {
                this.loading = false;
            }
        }
    }
};
</script>
```

## Support and Maintenance

### Documentation
- **API Documentation**: See `README.md`
- **Migration Guide**: See `MIGRATION.md`
- **Examples**: See `examples/` directory

### Community Support
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Stack Overflow for implementation help

### Commercial Support
Contact the maintainer for commercial support, custom integrations, or enterprise licensing.

## Licensing

The package is distributed under the MIT License, allowing for both commercial and non-commercial use. See `LICENSE` file for full details.

---

**Note**: This deployment guide is for Extract2MD v2.0.0. Check the latest documentation for updates and changes in newer versions.
