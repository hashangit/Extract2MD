/**
 * Example usage of Extract2MD with all scenarios
 */

import Extract2MDConverter, { ConfigValidator } from '../src/index.js';

// Example configurations for different scenarios
const basicConfig = {
  progressCallback: (progress) => {
    console.log(`[${progress.stage}] ${progress.message}`);
    if (progress.currentPage && progress.totalPages) {
      console.log(`Progress: ${progress.currentPage}/${progress.totalPages}`);
    }
  }
};

const advancedConfig = {
  llm: {
    model: "Qwen3-0.6B-q4f16_1-MLC",
    options: {
      temperature: 0.7,
      maxTokens: 4096
    }
  },
  systemPrompts: {
    singleExtraction: "Focus on preserving technical accuracy and code examples.",
    combinedExtraction: "Create comprehensive documentation by leveraging both extraction methods."
  },
  processing: {
    splitPascalCase: false,
    pdfRenderScale: 2.5,
    postProcessRules: [
      { find: /\bAPI\b/g, replace: "API" },
      { find: /\bJSON\b/g, replace: "JSON" },
      { find: /\bHTML\b/g, replace: "HTML" }
    ]
  },
  progressCallback: (progress) => {
    console.log(`[${progress.stage}] ${progress.message}`);
    if (progress.progress !== undefined) {
      console.log(`Loading: ${Math.round(progress.progress * 100)}%`);
    }
    if (progress.error) {
      console.error('Error:', progress.error);
    }
  }
};

// Example: Using different scenarios
async function demonstrateScenarios(pdfFile) {
  console.log('=== Extract2MD Scenario Demonstrations ===\n');

  try {
    // Scenario 1: Quick Convert Only
    console.log('1. Quick Convert Only (Fast, basic formatting)');
    console.log('Use case: PDFs with selectable text, need quick results');
    const result1 = await Extract2MDConverter.quickConvertOnly(pdfFile, basicConfig);
    console.log('✅ Quick conversion completed');
    console.log(`Output length: ${result1.length} characters\n`);

    // Scenario 2: High Accuracy Convert Only  
    console.log('2. High Accuracy Convert Only (OCR, slower but comprehensive)');
    console.log('Use case: Scanned PDFs, images, complex layouts');
    const result2 = await Extract2MDConverter.highAccuracyConvertOnly(pdfFile, basicConfig);
    console.log('✅ High accuracy conversion completed');
    console.log(`Output length: ${result2.length} characters\n`);

    // Scenario 3: Quick Convert + LLM
    console.log('3. Quick Convert + LLM Enhancement');
    console.log('Use case: Fast extraction with AI enhancement');
    const result3 = await Extract2MDConverter.quickConvertWithLLM(pdfFile, advancedConfig);
    console.log('✅ Quick conversion with LLM completed');
    console.log(`Output length: ${result3.length} characters\n`);

    // Scenario 4: High Accuracy + LLM
    console.log('4. High Accuracy + LLM Enhancement');
    console.log('Use case: OCR extraction with AI enhancement');
    const result4 = await Extract2MDConverter.highAccuracyConvertWithLLM(pdfFile, advancedConfig);
    console.log('✅ High accuracy conversion with LLM completed');
    console.log(`Output length: ${result4.length} characters\n`);

    // Scenario 5: Combined + LLM (Recommended)
    console.log('5. Combined Convert + LLM Enhancement (RECOMMENDED)');
    console.log('Use case: Best possible results using both extraction methods');
    const result5 = await Extract2MDConverter.combinedConvertWithLLM(pdfFile, advancedConfig);
    console.log('✅ Combined conversion with LLM completed');
    console.log(`Output length: ${result5.length} characters\n`);

    return {
      quickOnly: result1,
      ocrOnly: result2,
      quickWithLLM: result3,
      ocrWithLLM: result4,
      combined: result5
    };

  } catch (error) {
    console.error('❌ Error during conversion:', error.message);
    throw error;
  }
}

// Example: Configuration validation
function demonstrateConfigValidation() {
  console.log('=== Configuration Validation Demo ===\n');

  // Valid configuration
  try {
    const validConfig = {
      llm: {
        model: "Qwen3-0.6B-q4f16_1-MLC",
        options: { temperature: 0.8 }
      },
      processing: {
        splitPascalCase: true,
        pdfRenderScale: 3.0
      }
    };
    
    const validated = ConfigValidator.validate(validConfig);
    console.log('✅ Configuration validation passed');
    console.log('Validated config keys:', Object.keys(validated));
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
  }

  // Invalid configuration example
  try {
    const invalidConfig = {
      llm: {
        options: { temperature: 5.0 } // Invalid: temperature > 2
      }
    };
    
    ConfigValidator.validate(invalidConfig);
  } catch (error) {
    console.log('✅ Invalid configuration correctly rejected:', error.message);
  }

  console.log('');
}

// Example: Loading configuration from JSON
function demonstrateJSONConfig() {
  console.log('=== JSON Configuration Demo ===\n');

  const configJson = `{
    "llm": {
      "model": "Qwen3-0.6B-q4f16_1-MLC",
      "options": {
        "temperature": 0.7,
        "maxTokens": 2048
      }
    },
    "systemPrompts": {
      "singleExtraction": "Focus on technical accuracy.",
      "combinedExtraction": "Create comprehensive documentation."
    },
    "processing": {
      "splitPascalCase": false,
      "postProcessRules": [
        {"find": "\\\\bAPI\\\\b", "replace": "API"}
      ]
    }
  }`;

  try {
    const config = ConfigValidator.fromJSON(configJson);
    console.log('✅ JSON configuration loaded successfully');
    console.log('LLM model:', config.llm.model);
    console.log('Temperature:', config.llm.options.temperature);
    console.log('Custom single extraction prompt:', config.systemPrompts.singleExtraction);
    console.log('');
  } catch (error) {
    console.error('❌ JSON configuration failed:', error.message);
  }
}

// Example: Progress tracking
function createProgressTracker() {
  const startTime = Date.now();
  let lastStage = '';

  return (progress) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (progress.stage !== lastStage) {
      console.log(`\n[${elapsed}s] === ${progress.stage.toUpperCase()} ===`);
      lastStage = progress.stage;
    }
    
    console.log(`[${elapsed}s] ${progress.message}`);
    
    if (progress.currentPage && progress.totalPages) {
      const pageProgress = Math.round((progress.currentPage / progress.totalPages) * 100);
      console.log(`[${elapsed}s] Page Progress: ${pageProgress}% (${progress.currentPage}/${progress.totalPages})`);
    }
    
    if (progress.progress !== undefined) {
      const loadProgress = Math.round(progress.progress * 100);
      console.log(`[${elapsed}s] Loading Progress: ${loadProgress}%`);
    }
    
    if (progress.usage) {
      console.log(`[${elapsed}s] Token Usage:`, progress.usage);
    }
    
    if (progress.error) {
      console.error(`[${elapsed}s] ❌ Error:`, progress.error.message || progress.error);
    }
  };
}

// Main demo function
async function runDemo() {
  console.log('🚀 Extract2MD Enhanced API Demo\n');
  
  // Configuration demos
  demonstrateConfigValidation();
  demonstrateJSONConfig();
  
  // File input simulation (in real usage, this would come from user input)
  console.log('📄 To test with actual PDF files:');
  console.log('1. Use an HTML file input: <input type="file" accept=".pdf" />');
  console.log('2. Pass the File object to any scenario method');
  console.log('3. Monitor progress through the callback\n');
  
  console.log('Example usage:');
  console.log(`
// HTML
<input type="file" id="pdfInput" accept=".pdf" />
<button onclick="convertPDF()">Convert</button>
<div id="progress"></div>
<div id="output"></div>

// JavaScript
async function convertPDF() {
  const fileInput = document.getElementById('pdfInput');
  const pdfFile = fileInput.files[0];
  
  if (!pdfFile) {
    alert('Please select a PDF file');
    return;
  }
  
  const config = {
    progressCallback: (progress) => {
      document.getElementById('progress').textContent = progress.message;
    }
  };
  
  try {
    // Use the best scenario for comprehensive results
    const markdown = await Extract2MDConverter.combinedConvertWithLLM(pdfFile, config);
    document.getElementById('output').innerHTML = 
      '<pre>' + markdown.replace(/</g, '&lt;') + '</pre>';
  } catch (error) {
    console.error('Conversion failed:', error);
    alert('Conversion failed: ' + error.message);
  }
}
  `);
}

// Export for use in other examples
export {
  demonstrateScenarios,
  demonstrateConfigValidation,
  demonstrateJSONConfig,
  createProgressTracker,
  basicConfig,
  advancedConfig
};

// Run demo if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.Extract2MDDemo = {
    runDemo,
    demonstrateScenarios,
    createProgressTracker,
    basicConfig,
    advancedConfig
  };
} else {
  // Node.js environment
  runDemo();
}
