/**
 * ConfigValidator.js
 * Validates and normalizes configuration objects
 */

export class ConfigValidator {
    /**
     * Default configuration values
     */
    static getDefaultConfig() {
        return {
            // PDF.js configuration
            pdfJsWorkerSrc: '../pdf.worker.min.mjs',
            
            // Tesseract configuration
            tesseract: {
                workerPath: './tesseract-worker.min.js',
                corePath: './tesseract-core.wasm.js',
                langPath: './lang-data/',
                language: 'eng',
                options: {}
            },
            
            // LLM configuration
            llm: {
                model: 'Qwen3-0.6B-q4f16_1-MLC',
                customModel: null,
                options: {
                    temperature: 0.7,
                    maxTokens: 4096
                }
            },
            
            // System prompt customizations
            systemPrompts: {
                singleExtraction: '',
                combinedExtraction: ''
            },
            
            // Processing options
            processing: {
                splitPascalCase: false,
                pdfRenderScale: 2.5,
                postProcessRules: []
            },
            
            // Progress tracking
            progressCallback: null
        };
    }

    /**
     * Validate and normalize a configuration object
     * @param {Object} config - Configuration object to validate
     * @returns {Object} Validated and normalized configuration
     */
    static validate(config = {}) {
        const defaultConfig = this.getDefaultConfig();
        const normalizedConfig = this.deepMerge(defaultConfig, config);
        
        // Validate required types and values
        this.validateTesseractConfig(normalizedConfig.tesseract);
        this.validateLLMConfig(normalizedConfig.llm);
        this.validateProcessingConfig(normalizedConfig.processing);
        this.validateSystemPrompts(normalizedConfig.systemPrompts);
        
        return normalizedConfig;
    }

    /**
     * Validate Tesseract configuration
     * @param {Object} tesseractConfig - Tesseract configuration
     */
    static validateTesseractConfig(tesseractConfig) {
        if (!tesseractConfig) {
            throw new Error('Tesseract configuration is required');
        }

        // Validate language
        if (tesseractConfig.language && typeof tesseractConfig.language !== 'string') {
            throw new Error('Tesseract language must be a string');
        }

        // Validate paths
        const pathFields = ['workerPath', 'corePath', 'langPath'];
        for (const field of pathFields) {
            if (tesseractConfig[field] && typeof tesseractConfig[field] !== 'string') {
                throw new Error(`Tesseract ${field} must be a string`);
            }
        }

        // Validate options
        if (tesseractConfig.options && typeof tesseractConfig.options !== 'object') {
            throw new Error('Tesseract options must be an object');
        }
    }

    /**
     * Validate LLM configuration
     * @param {Object} llmConfig - LLM configuration
     */
    static validateLLMConfig(llmConfig) {
        if (!llmConfig) {
            throw new Error('LLM configuration is required');
        }

        // Validate model
        if (llmConfig.model && typeof llmConfig.model !== 'string') {
            throw new Error('LLM model must be a string');
        }

        // Validate custom model structure
        if (llmConfig.customModel) {
            this.validateCustomModel(llmConfig.customModel);
        }

        // Validate options
        if (llmConfig.options) {
            this.validateLLMOptions(llmConfig.options);
        }
    }

    /**
     * Validate custom model configuration
     * @param {Object} customModel - Custom model configuration
     */
    static validateCustomModel(customModel) {
        const requiredFields = ['model', 'model_id', 'model_lib'];
        
        for (const field of requiredFields) {
            if (!customModel[field] || typeof customModel[field] !== 'string') {
                throw new Error(`Custom model ${field} is required and must be a string`);
            }
        }

        // Validate optional fields
        if (customModel.required_features && !Array.isArray(customModel.required_features)) {
            throw new Error('Custom model required_features must be an array');
        }

        if (customModel.overrides && typeof customModel.overrides !== 'object') {
            throw new Error('Custom model overrides must be an object');
        }
    }

    /**
     * Validate LLM options
     * @param {Object} options - LLM options
     */
    static validateLLMOptions(options) {
        if (typeof options !== 'object') {
            throw new Error('LLM options must be an object');
        }

        // Validate temperature
        if (options.temperature !== undefined) {
            if (typeof options.temperature !== 'number' || options.temperature < 0 || options.temperature > 2) {
                throw new Error('LLM temperature must be a number between 0 and 2');
            }
        }

        // Validate maxTokens
        if (options.maxTokens !== undefined) {
            if (!Number.isInteger(options.maxTokens) || options.maxTokens < 1) {
                throw new Error('LLM maxTokens must be a positive integer');
            }
        }
    }

    /**
     * Validate processing configuration
     * @param {Object} processingConfig - Processing configuration
     */
    static validateProcessingConfig(processingConfig) {
        if (!processingConfig) {
            throw new Error('Processing configuration is required');
        }

        // Validate splitPascalCase
        if (processingConfig.splitPascalCase !== undefined && typeof processingConfig.splitPascalCase !== 'boolean') {
            throw new Error('splitPascalCase must be a boolean');
        }

        // Validate pdfRenderScale
        if (processingConfig.pdfRenderScale !== undefined) {
            if (typeof processingConfig.pdfRenderScale !== 'number' || processingConfig.pdfRenderScale <= 0) {
                throw new Error('pdfRenderScale must be a positive number');
            }
        }

        // Validate postProcessRules
        if (processingConfig.postProcessRules && !Array.isArray(processingConfig.postProcessRules)) {
            throw new Error('postProcessRules must be an array');
        }

        if (processingConfig.postProcessRules) {
            for (const rule of processingConfig.postProcessRules) {
                if (!rule.find || typeof rule.replace !== 'string') {
                    throw new Error('Each postProcessRule must have a "find" property and a "replace" string');
                }
            }
        }
    }

    /**
     * Validate system prompts configuration
     * @param {Object} systemPrompts - System prompts configuration
     */
    static validateSystemPrompts(systemPrompts) {
        if (!systemPrompts) {
            throw new Error('System prompts configuration is required');
        }

        const promptTypes = ['singleExtraction', 'combinedExtraction'];
        for (const promptType of promptTypes) {
            if (systemPrompts[promptType] !== undefined && typeof systemPrompts[promptType] !== 'string') {
                throw new Error(`System prompt ${promptType} must be a string`);
            }
        }
    }

    /**
     * Deep merge two objects
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    static deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (this.isObject(source[key]) && this.isObject(target[key])) {
                    result[key] = this.deepMerge(target[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * Check if value is a plain object
     * @param {*} value - Value to check
     * @returns {boolean} Whether value is a plain object
     */
    static isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * Create a configuration object from a JSON string or file content
     * @param {string} jsonString - JSON configuration string
     * @returns {Object} Parsed and validated configuration
     */
    static fromJSON(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            return this.validate(config);
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON configuration: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Get configuration schema for documentation
     * @returns {Object} Configuration schema
     */
    static getSchema() {
        return {
            type: 'object',
            properties: {
                pdfJsWorkerSrc: {
                    type: 'string',
                    description: 'Path to PDF.js worker file'
                },
                tesseract: {
                    type: 'object',
                    properties: {
                        workerPath: { type: 'string', description: 'Path to Tesseract worker' },
                        corePath: { type: 'string', description: 'Path to Tesseract core WASM' },
                        langPath: { type: 'string', description: 'Path to language data directory' },
                        language: { type: 'string', description: 'OCR language code' },
                        options: { type: 'object', description: 'Additional Tesseract options' }
                    }
                },
                llm: {
                    type: 'object',
                    properties: {
                        model: { type: 'string', description: 'Model identifier' },
                        customModel: {
                            type: 'object',
                            description: 'Custom model configuration',
                            properties: {
                                model: { type: 'string', description: 'Model URL' },
                                model_id: { type: 'string', description: 'Model identifier' },
                                model_lib: { type: 'string', description: 'Model library URL' },
                                required_features: { type: 'array', description: 'Required GPU features' },
                                overrides: { type: 'object', description: 'Model override settings' }
                            }
                        },
                        options: {
                            type: 'object',
                            properties: {
                                temperature: { type: 'number', minimum: 0, maximum: 2 },
                                maxTokens: { type: 'integer', minimum: 1 }
                            }
                        }
                    }
                },
                systemPrompts: {
                    type: 'object',
                    properties: {
                        singleExtraction: { type: 'string', description: 'Custom prompt for single extraction scenarios' },
                        combinedExtraction: { type: 'string', description: 'Custom prompt for combined extraction scenario' }
                    }
                },
                processing: {
                    type: 'object',
                    properties: {
                        splitPascalCase: { type: 'boolean', description: 'Split PascalCase words' },
                        pdfRenderScale: { type: 'number', minimum: 0, description: 'PDF rendering scale for OCR' },
                        postProcessRules: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    find: { description: 'RegExp or string to find' },
                                    replace: { type: 'string', description: 'Replacement string' }
                                },
                                required: ['find', 'replace']
                            }
                        }
                    }
                },
                progressCallback: { description: 'Function to handle progress updates' }
            }
        };
    }
}

export default ConfigValidator;
