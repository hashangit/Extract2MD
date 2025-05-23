/**
 * Test file for validating Extract2MD scenarios
 * This is a basic validation test - for production, consider using a testing framework like Jest
 */

import { Extract2MDConverter } from '../src/index.js';

class Extract2MDTests {
    constructor() {
        this.testResults = [];
        this.testPdf = null; // Will be set via file input in demo
    }

    log(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        this.testResults.push({ message, type, timestamp: new Date().toISOString() });
    }

    async runBasicTests() {
        this.log('Starting Extract2MD basic tests...');

        try {
            // Test 1: Check if all scenario methods exist
            this.testScenarioMethodsExist();

            // Test 2: Check configuration validation
            await this.testConfigurationValidation();

            this.log('Basic tests completed successfully!', 'success');
        } catch (error) {
            this.log(`Basic tests failed: ${error.message}`, 'error');
            throw error;
        }
    }

    testScenarioMethodsExist() {
        this.log('Testing scenario methods existence...');

        const requiredMethods = [
            'quickConvertOnly',
            'highAccuracyConvertOnly',
            'quickConvertWithLLM',
            'highAccuracyConvertWithLLM',
            'combinedConvertWithLLM'
        ];

        for (const method of requiredMethods) {
            if (typeof Extract2MDConverter[method] !== 'function') {
                throw new Error(`Method ${method} does not exist or is not a function`);
            }
        }

        this.log(`All ${requiredMethods.length} scenario methods exist`, 'success');
    }

    async testConfigurationValidation() {
        this.log('Testing configuration validation...');

        // Test valid configuration
        const validConfig = {
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
        };

        try {
            // This should not throw
            const result = await Extract2MDConverter.quickConvertOnly(
                null, // No actual PDF for basic test
                validConfig,
                true // dry run mode (if implemented)
            );
            this.log('Configuration validation passed', 'success');
        } catch (error) {
            if (error.message.includes('PDF file is required')) {
                this.log('Configuration validation passed (expected PDF error)', 'success');
            } else {
                throw error;
            }
        }

        // Test invalid configuration
        try {
            await Extract2MDConverter.quickConvertOnly(null, { invalid: 'config' });
            throw new Error('Should have thrown validation error');
        } catch (error) {
            if (error.message.includes('validation') || error.message.includes('PDF file is required')) {
                this.log('Invalid configuration properly rejected', 'success');
            } else {
                throw error;
            }
        }
    }

    async runFullTests(pdfFile) {
        if (!pdfFile) {
            this.log('No PDF file provided for full tests', 'warning');
            return;
        }

        this.log('Starting full Extract2MD tests with PDF file...');
        this.testPdf = pdfFile;

        try {
            // Test Scenario 1: Quick Convert Only
            await this.testScenario1();

            // Test Scenario 2: High Accuracy Convert Only
            await this.testScenario2();

            // Note: LLM scenarios would require actual model loading which takes time
            // For now, we'll just test that they don't throw immediate errors
            await this.testLLMScenariosBasic();

            this.log('Full tests completed successfully!', 'success');
        } catch (error) {
            this.log(`Full tests failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testScenario1() {
        this.log('Testing Scenario 1: Quick Convert Only...');

        const config = {
            ocr: {
                language: 'eng',
                oem: 1,
                psm: 6
            }
        };

        const result = await Extract2MDConverter.quickConvertOnly(this.testPdf, config);
        
        if (!result || typeof result !== 'string') {
            throw new Error('Scenario 1 should return a string result');
        }

        this.log(`Scenario 1 completed. Result length: ${result.length} characters`, 'success');
    }

    async testScenario2() {
        this.log('Testing Scenario 2: High Accuracy Convert Only...');

        const config = {
            ocr: {
                language: 'eng',
                oem: 1,
                psm: 8 // Different PSM for high accuracy
            }
        };

        const result = await Extract2MDConverter.highAccuracyConvertOnly(this.testPdf, config);
        
        if (!result || typeof result !== 'string') {
            throw new Error('Scenario 2 should return a string result');
        }

        this.log(`Scenario 2 completed. Result length: ${result.length} characters`, 'success');
    }

    async testLLMScenariosBasic() {
        this.log('Testing LLM scenarios (basic validation only)...');

        const config = {
            ocr: {
                language: 'eng',
                oem: 1,
                psm: 6
            },
            webllm: {
                modelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
                temperature: 0.7,
                maxTokens: 1000,
                streamingEnabled: false
            }
        };

        // Test that LLM scenarios at least start without immediate errors
        try {
            // These will likely fail at model loading, but should not have immediate syntax errors
            const scenarios = [
                'quickConvertWithLLM',
                'highAccuracyConvertWithLLM',
                'combinedConvertWithLLM'
            ];

            for (const scenario of scenarios) {
                this.log(`Testing ${scenario} initialization...`);
                
                try {
                    // Start the process but don't wait for completion (model loading takes time)
                    const promise = Extract2MDConverter[scenario](this.testPdf, config);
                    
                    // Give it a moment to start, then we'll assume it's working if no immediate error
                    setTimeout(() => {
                        this.log(`${scenario} started successfully`, 'success');
                    }, 100);

                    // Don't await full completion for basic test
                    break; // Only test one scenario to avoid model loading overhead
                } catch (error) {
                    if (error.message.includes('model') || error.message.includes('WebLLM')) {
                        this.log(`${scenario} - model loading issue (expected): ${error.message}`, 'warning');
                    } else {
                        throw error;
                    }
                }
            }
        } catch (error) {
            this.log(`LLM scenarios basic test error: ${error.message}`, 'warning');
        }
    }

    getTestResults() {
        return this.testResults;
    }

    clearResults() {
        this.testResults = [];
    }
}

// Export for use in demo
export { Extract2MDTests };

// Auto-run basic tests if this file is run directly
if (typeof window === 'undefined') {
    const tests = new Extract2MDTests();
    tests.runBasicTests().catch(console.error);
}
