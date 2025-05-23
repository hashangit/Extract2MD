/**
 * WebLLMEngine.js
 * Standalone WebLLM inference engine for Extract2MD
 * Handles model initialization, loading, and text generation
 */

import * as webllm from '@mlc-ai/web-llm';

export class WebLLMEngine {
    constructor(config = {}) {
        this.engine = null;
        this.isInitialized = false;
        this.currentModelId = null;
        this.progressCallback = config.progressCallback || ((progress) => {});
        this.defaultModel = config.defaultModel || 'Qwen3-0.6B-q4f16_1-MLC';
        this.customModelConfig = config.customModelConfig || null;
    }

    /**
     * Initialize the WebLLM engine with specified model
     * @param {string} modelId - Model identifier
     * @param {Object} modelConfig - Model configuration options
     */
    async initialize(modelId = null, modelConfig = {}) {
        const targetModelId = modelId || this.defaultModel;
        
        // Check if already initialized with the same model
        if (this.isInitialized && this.currentModelId === targetModelId) {
            this.progressCallback({
                stage: 'webllm_ready',
                message: 'WebLLM engine already initialized with the correct model.'
            });
            return;
        }

        try {
            this.progressCallback({
                stage: 'webllm_init_start',
                message: `Initializing WebLLM engine with model: ${targetModelId}...`
            });

            // Clean up existing engine if any
            if (this.engine) {
                await this.cleanup();
            }

            // Setup progress callback for model loading
            const initProgressCallback = (report) => {
                this.progressCallback({
                    stage: 'webllm_load_progress',
                    message: `Model Loading: ${report.text}`,
                    progress: report.progress
                });
            };

            // Configure model
            let appConfig = null;
            if (this.customModelConfig && this.customModelConfig.modelId === targetModelId) {
                // Use custom model configuration
                appConfig = {
                    model_list: [this.customModelConfig]
                };
            }

            const engineConfig = {
                initProgressCallback,
                appConfig,
                ...modelConfig
            };

            // Create and initialize engine
            this.engine = await webllm.CreateMLCEngine(targetModelId, engineConfig);
            this.isInitialized = true;
            this.currentModelId = targetModelId;

            this.progressCallback({
                stage: 'webllm_init_complete',
                message: 'WebLLM engine initialized successfully.'
            });

        } catch (error) {
            this.isInitialized = false;
            this.currentModelId = null;
            this.progressCallback({
                stage: 'webllm_init_error',
                message: `WebLLM initialization failed: ${error.message}`,
                error
            });
            throw new Error(`WebLLM initialization failed: ${error.message}`);
        }
    }

    /**
     * Generate text using the initialized model
     * @param {string} prompt - Input prompt
     * @param {Object} options - Generation options
     * @returns {Promise<string>} Generated text
     */
    async generate(prompt, options = {}) {
        if (!this.isInitialized || !this.engine) {
            throw new Error('WebLLM engine is not initialized. Call initialize() first.');
        }

        try {
            this.progressCallback({
                stage: 'webllm_generate_start',
                message: 'Generating response...'
            });

            const messages = [{ role: "user", content: prompt }];
            
            const requestOptions = {
                messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4096,
                ...options
            };

            const chatCompletion = await this.engine.chat.completions.create(requestOptions);
            
            if (chatCompletion.choices && chatCompletion.choices.length > 0) {
                const content = chatCompletion.choices[0].message.content || '';
                
                this.progressCallback({
                    stage: 'webllm_generate_complete',
                    message: 'Text generation completed.'
                });
                
                return content;
            } else {
                throw new Error('No response generated from the model.');
            }

        } catch (error) {
            this.progressCallback({
                stage: 'webllm_generate_error',
                message: `Text generation failed: ${error.message}`,
                error
            });
            throw new Error(`Text generation failed: ${error.message}`);
        }
    }

    /**
     * Generate text with streaming support
     * @param {string} prompt - Input prompt
     * @param {Object} options - Generation options
     * @param {Function} onChunk - Callback for each chunk
     * @returns {Promise<string>} Complete generated text
     */
    async generateStream(prompt, options = {}, onChunk = null) {
        if (!this.isInitialized || !this.engine) {
            throw new Error('WebLLM engine is not initialized. Call initialize() first.');
        }

        try {
            this.progressCallback({
                stage: 'webllm_stream_start',
                message: 'Starting streaming generation...'
            });

            const messages = [{ role: "user", content: prompt }];
            
            const requestOptions = {
                messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 4096,
                stream: true,
                stream_options: { include_usage: true },
                ...options
            };

            const chunks = await this.engine.chat.completions.create(requestOptions);
            let fullResponse = '';

            for await (const chunk of chunks) {
                const content = chunk.choices[0]?.delta?.content || '';
                fullResponse += content;
                
                if (onChunk && content) {
                    onChunk(content, fullResponse);
                }
                
                if (chunk.usage) {
                    this.progressCallback({
                        stage: 'webllm_stream_usage',
                        message: 'Stream completed',
                        usage: chunk.usage
                    });
                }
            }

            this.progressCallback({
                stage: 'webllm_stream_complete',
                message: 'Streaming generation completed.'
            });

            return fullResponse;

        } catch (error) {
            this.progressCallback({
                stage: 'webllm_stream_error',
                message: `Streaming generation failed: ${error.message}`,
                error
            });
            throw new Error(`Streaming generation failed: ${error.message}`);
        }
    }

    /**
     * Check if the engine is ready for use
     * @returns {boolean} Engine readiness status
     */
    isReady() {
        return this.isInitialized && this.engine !== null;
    }

    /**
     * Get current model information
     * @returns {Object} Model information
     */
    getModelInfo() {
        return {
            isInitialized: this.isInitialized,
            currentModelId: this.currentModelId,
            isReady: this.isReady()
        };
    }

    /**
     * Clean up the engine and free resources
     */
    async cleanup() {
        if (this.engine) {
            try {
                this.progressCallback({
                    stage: 'webllm_cleanup',
                    message: 'Cleaning up WebLLM engine...'
                });

                // Note: WebLLM's MLCEngine might not have a direct unload method
                // But we should clean up references
                this.engine = null;
                this.isInitialized = false;
                this.currentModelId = null;

                this.progressCallback({
                    stage: 'webllm_cleanup_complete',
                    message: 'WebLLM engine cleanup completed.'
                });
            } catch (error) {
                this.progressCallback({
                    stage: 'webllm_cleanup_error',
                    message: `WebLLM cleanup failed: ${error.message}`,
                    error
                });
            }
        }
    }
}

export default WebLLMEngine;
