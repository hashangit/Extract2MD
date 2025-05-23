/**
 * Extract2MDConverter.js
 * Main converter class with scenario-specific methods
 */

import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import Tesseract from 'tesseract.js';
import WebLLMEngine from '../engines/WebLLMEngine.js';
import OutputParser from '../utils/OutputParser.js';
import SystemPrompts from '../utils/SystemPrompts.js';
import ConfigValidator from '../utils/ConfigValidator.js';

export class Extract2MDConverter {
    constructor(config = {}) {
        // Validate and normalize configuration
        this.config = ConfigValidator.validate(config);
        
        // Initialize components
        this.webllmEngine = null;
        this.outputParser = new OutputParser();
        
        // Setup PDF.js worker
        this.setupPdfJsWorker();
        
        // Progress callback
        this.progressCallback = this.config.progressCallback || ((progress) => {});
    }

    /**
     * Setup PDF.js worker
     */
    setupPdfJsWorker() {
        const pdfjsSetupLib = (typeof pdfjsLib !== 'undefined' ? pdfjsLib : 
                              (typeof window !== 'undefined' ? window.pdfjsLib : null));
        
        if (pdfjsSetupLib && pdfjsSetupLib.GlobalWorkerOptions) {
            pdfjsSetupLib.GlobalWorkerOptions.workerSrc = this.config.pdfJsWorkerSrc;
        } else {
            console.warn('pdfjsLib or pdfjsLib.GlobalWorkerOptions is not defined. PDF.js worker may not load correctly.');
        }
    }

    /**
     * Scenario 1: Quick convert only - returns MD output
     * @param {File} pdfFile - PDF file to convert
     * @param {Object} options - Optional configuration overrides
     * @returns {Promise<string>} Markdown output
     */
    static async quickConvertOnly(pdfFile, options = {}) {
        const converter = new Extract2MDConverter(options);
        return await converter._performQuickConvert(pdfFile);
    }

    /**
     * Scenario 2: High accuracy convert only - returns MD output
     * @param {File} pdfFile - PDF file to convert
     * @param {Object} options - Optional configuration overrides
     * @returns {Promise<string>} Markdown output
     */
    static async highAccuracyConvertOnly(pdfFile, options = {}) {
        const converter = new Extract2MDConverter(options);
        return await converter._performHighAccuracyConvert(pdfFile);
    }

    /**
     * Scenario 3: Quick convert + LLM rewrite - returns MD output
     * @param {File} pdfFile - PDF file to convert
     * @param {Object} options - Optional configuration overrides
     * @returns {Promise<string>} LLM-rewritten markdown output
     */
    static async quickConvertWithLLM(pdfFile, options = {}) {
        const converter = new Extract2MDConverter(options);
        
        try {
            // Step 1: Quick extraction
            converter.progressCallback({
                stage: 'scenario_3_start',
                message: 'Starting quick conversion with LLM rewrite...'
            });
            
            const extractedText = await converter._performQuickExtraction(pdfFile);
            
            // Step 2: LLM rewrite
            await converter._initializeWebLLM();
            const rewrittenMarkdown = await converter._performLLMRewrite(
                extractedText,
                'single',
                converter.config.systemPrompts.singleExtraction
            );
            
            converter.progressCallback({
                stage: 'scenario_3_complete',
                message: 'Quick conversion with LLM rewrite completed.'
            });
            
            return rewrittenMarkdown;
            
        } finally {
            await converter._cleanup();
        }
    }

    /**
     * Scenario 4: High accuracy convert + LLM rewrite - returns MD output
     * @param {File} pdfFile - PDF file to convert
     * @param {Object} options - Optional configuration overrides
     * @returns {Promise<string>} LLM-rewritten markdown output
     */
    static async highAccuracyConvertWithLLM(pdfFile, options = {}) {
        const converter = new Extract2MDConverter(options);
        
        try {
            // Step 1: High accuracy extraction
            converter.progressCallback({
                stage: 'scenario_4_start',
                message: 'Starting high accuracy conversion with LLM rewrite...'
            });
            
            const extractedText = await converter._performHighAccuracyExtraction(pdfFile);
            
            // Step 2: LLM rewrite
            await converter._initializeWebLLM();
            const rewrittenMarkdown = await converter._performLLMRewrite(
                extractedText,
                'single',
                converter.config.systemPrompts.singleExtraction
            );
            
            converter.progressCallback({
                stage: 'scenario_4_complete',
                message: 'High accuracy conversion with LLM rewrite completed.'
            });
            
            return rewrittenMarkdown;
            
        } finally {
            await converter._cleanup();
        }
    }

    /**
     * Scenario 5: Combined convert + LLM rewrite - returns comprehensive MD output
     * @param {File} pdfFile - PDF file to convert
     * @param {Object} options - Optional configuration overrides
     * @returns {Promise<string>} Comprehensive LLM-rewritten markdown output
     */
    static async combinedConvertWithLLM(pdfFile, options = {}) {
        const converter = new Extract2MDConverter(options);
        
        try {
            converter.progressCallback({
                stage: 'scenario_5_start',
                message: 'Starting combined conversion with LLM rewrite...'
            });
            
            // Step 1: Parallel extraction using both methods
            const [quickText, ocrText] = await Promise.all([
                converter._performQuickExtraction(pdfFile),
                converter._performHighAccuracyExtraction(pdfFile)
            ]);
            
            // Step 2: LLM rewrite with combined context
            await converter._initializeWebLLM();
            const rewrittenMarkdown = await converter._performCombinedLLMRewrite(
                quickText,
                ocrText,
                converter.config.systemPrompts.combinedExtraction
            );
            
            converter.progressCallback({
                stage: 'scenario_5_complete',
                message: 'Combined conversion with LLM rewrite completed.'
            });
            
            return rewrittenMarkdown;
            
        } finally {
            await converter._cleanup();
        }
    }

    // Internal methods for extraction and processing

    /**
     * Perform quick text extraction using PDF.js
     */
    async _performQuickExtraction(pdfFile) {
        // Enhanced input validation
        if (!(pdfFile instanceof File)) {
            throw new Error('Invalid input: pdfFile must be a File object.');
        }
        if (pdfFile.size === 0) {
            throw new Error('Invalid input: PDF file is empty.');
        }
        if (pdfFile.size > 100 * 1024 * 1024) { // 100MB limit
            throw new Error('Invalid input: PDF file is too large (max 100MB).');
        }
        if (!pdfFile.type || (!pdfFile.type.includes('pdf') && !pdfFile.name.toLowerCase().endsWith('.pdf'))) {
            throw new Error('Invalid input: File must be a PDF document.');
        }

        this.progressCallback({
            stage: 'quick_extraction_start',
            message: 'Starting quick PDF text extraction...'
        });

        const arrayBuffer = await pdfFile.arrayBuffer();
        const rawText = await this._extractTextWithPdfJs(arrayBuffer);
        const cleanedText = this._postProcessText(rawText);
        
        this.progressCallback({
            stage: 'quick_extraction_complete',
            message: 'Quick extraction completed.'
        });

        return cleanedText;
    }

    /**
     * Perform quick conversion (extraction + markdown formatting)
     */
    async _performQuickConvert(pdfFile) {
        const extractedText = await this._performQuickExtraction(pdfFile);
        
        this.progressCallback({
            stage: 'quick_markdown_start',
            message: 'Converting to Markdown...'
        });
        
        const markdown = this._convertToMarkdown(extractedText);
        
        this.progressCallback({
            stage: 'quick_markdown_complete',
            message: 'Quick conversion completed.'
        });
        
        return markdown;
    }

    /**
     * Perform high accuracy text extraction using OCR
     */
    async _performHighAccuracyExtraction(pdfFile) {
        // Enhanced input validation
        if (!(pdfFile instanceof File)) {
            throw new Error('Invalid input: pdfFile must be a File object.');
        }
        if (pdfFile.size === 0) {
            throw new Error('Invalid input: PDF file is empty.');
        }
        if (pdfFile.size > 100 * 1024 * 1024) { // 100MB limit
            throw new Error('Invalid input: PDF file is too large (max 100MB).');
        }
        if (!pdfFile.type || (!pdfFile.type.includes('pdf') && !pdfFile.name.toLowerCase().endsWith('.pdf'))) {
            throw new Error('Invalid input: File must be a PDF document.');
        }

        this.progressCallback({
            stage: 'ocr_extraction_start',
            message: 'Starting OCR text extraction...'
        });

        const pdfjs = (typeof pdfjsLib !== 'undefined' ? pdfjsLib : 
                      (typeof window !== 'undefined' ? window.pdfjsLib : null));
        if (!pdfjs || !pdfjs.getDocument) {
            throw new Error('pdf.js library is not loaded or not fully initialized.');
        }

        const Tess = (typeof Tesseract !== 'undefined' ? Tesseract : 
                     (typeof window !== 'undefined' ? window.Tesseract : null));
        if (!Tess) {
            throw new Error('Tesseract.js library is not loaded.');
        }

        let worker;
        let workerInitialized = false;
        
        try {
            // Initialize Tesseract worker with enhanced error handling
            this.progressCallback({
                stage: 'ocr_worker_init',
                message: 'Initializing OCR worker...'
            });
            
            try {
                // Set timeout for worker initialization
                const workerPromise = Tess.createWorker(
                    this.config.tesseract.language,
                    1,
                    {
                        workerPath: this.config.tesseract.workerPath,
                        corePath: this.config.tesseract.corePath,
                        langPath: this.config.tesseract.langPath,
                        ...this.config.tesseract.options
                    }
                );

                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Worker initialization timed out after 30 seconds')), 30000);
                });

                worker = await Promise.race([workerPromise, timeoutPromise]);
                workerInitialized = true;

                this.progressCallback({
                    stage: 'ocr_worker_ready',
                    message: 'OCR worker initialized successfully.'
                });

            } catch (workerError) {
                throw new Error(`Failed to initialize Tesseract worker: ${workerError.message}. Check if Tesseract.js files are accessible and language data is available.`);
            }

            // Process PDF
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            const numPages = pdfDoc.numPages;

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                this.progressCallback({
                    stage: 'ocr_page_process',
                    message: `Processing page ${pageNum}/${numPages}...`,
                    currentPage: pageNum,
                    totalPages: numPages
                });

                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: this.config.processing.pdfRenderScale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                try {
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    // OCR recognition with error handling
                    const recognition = await worker.recognize(canvas);
                    const ocrPageText = recognition.data?.text || '';
                    fullText += ocrPageText + '\n';
                    
                } catch (pageError) {
                    this.progressCallback({
                        stage: 'ocr_page_warning',
                        message: `Warning: Failed to process page ${pageNum}: ${pageError.message}`
                    });
                    console.warn(`OCR processing failed for page ${pageNum}:`, pageError);
                    // Continue with other pages instead of failing completely
                } finally {
                    // Clean up canvas resources
                    canvas.width = 0;
                    canvas.height = 0;
                }
            }

            // Safely terminate worker
            if (workerInitialized && worker) {
                try {
                    this.progressCallback({
                        stage: 'ocr_worker_terminate',
                        message: 'Terminating OCR worker...'
                    });
                    
                    await Promise.race([
                        worker.terminate(),
                        new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Worker termination timed out')), 10000);
                        })
                    ]);
                } catch (terminateError) {
                    console.warn('Warning: Failed to properly terminate Tesseract worker:', terminateError);
                    // Don't throw error for termination issues
                }
            }
            
            const cleanedText = this._postProcessText(fullText);
            
            this.progressCallback({
                stage: 'ocr_extraction_complete',
                message: 'OCR extraction completed.'
            });

            return cleanedText;

        } catch (error) {
            // Enhanced cleanup on error
            if (workerInitialized && worker) {
                try {
                    await Promise.race([
                        worker.terminate(),
                        new Promise((resolve) => setTimeout(resolve, 5000)) // Give up after 5 seconds
                    ]);
                } catch (cleanupError) {
                    console.warn('Failed to cleanup worker after error:', cleanupError);
                }
            }
            throw error;
        }
    }

    /**
     * Perform high accuracy conversion (OCR + markdown formatting)
     */
    async _performHighAccuracyConvert(pdfFile) {
        const extractedText = await this._performHighAccuracyExtraction(pdfFile);
        
        this.progressCallback({
            stage: 'ocr_markdown_start',
            message: 'Converting OCR results to Markdown...'
        });
        
        const markdown = this._convertToMarkdown(extractedText);
        
        this.progressCallback({
            stage: 'ocr_markdown_complete',
            message: 'High accuracy conversion completed.'
        });
        
        return markdown;
    }

    /**
     * Check WebGPU capability and browser support
     * @returns {Promise<Object>} WebGPU capability information
     */
    static async checkWebGPUCapability() {
        const result = {
            isSupported: false,
            hasShaderF16: false,
            error: null,
            details: {}
        };

        try {
            // Check if WebGPU is available
            if (!navigator.gpu) {
                result.error = 'WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.';
                return result;
            }

            // Request WebGPU adapter
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                result.error = 'No WebGPU adapter found. WebGPU may not be supported on this device.';
                return result;
            }

            // Get adapter features
            const features = Array.from(adapter.features);
            result.hasShaderF16 = features.includes('shader-f16');
            result.isSupported = true;
            result.details = {
                features,
                limits: adapter.limits,
                info: adapter.info
            };

            return result;

        } catch (error) {
            result.error = `WebGPU capability check failed: ${error.message}`;
            return result;
        }
    }

    /**
     * Initialize WebLLM engine with WebGPU capability checks
     */
    async _initializeWebLLM() {
        // Check WebGPU capability before initializing LLM
        this.progressCallback({
            stage: 'webgpu_check_start',
            message: 'Checking WebGPU capability for LLM processing...'
        });

        const webgpuCapability = await Extract2MDConverter.checkWebGPUCapability();
        
        if (!webgpuCapability.isSupported) {
            const errorMessage = `WebGPU capability check failed: ${webgpuCapability.error}`;
            this.progressCallback({
                stage: 'webgpu_check_failed',
                message: errorMessage,
                error: webgpuCapability.error
            });
            throw new Error(errorMessage);
        }

        this.progressCallback({
            stage: 'webgpu_check_success',
            message: `WebGPU is supported. Shader F16: ${webgpuCapability.hasShaderF16 ? 'Yes' : 'No'}`
        });

        // Validate model requirements against WebGPU capabilities
        const modelRequiresF16 = this.config.webllm.model && this.config.webllm.model.includes('f16');
        if (modelRequiresF16 && !webgpuCapability.hasShaderF16) {
            const warningMessage = `Warning: Model "${this.config.webllm.model}" requires shader-f16 support, but your device doesn't support it. Performance may be reduced.`;
            this.progressCallback({
                stage: 'webgpu_compatibility_warning',
                message: warningMessage
            });
        }

        if (!this.webllmEngine) {
            this.webllmEngine = new WebLLMEngine({
                progressCallback: this.progressCallback,
                defaultModel: this.config.webllm.model,
                customModelConfig: this.config.webllm.customModel
            });
        }

        const modelToUse = this.config.webllm.customModel ? 
                          this.config.webllm.customModel.model_id : 
                          this.config.webllm.model;

        await this.webllmEngine.initialize(modelToUse, this.config.webllm.options);
    }

    /**
     * Perform LLM rewrite for single extraction
     */
    async _performLLMRewrite(extractedText, scenarioType, customPrompt) {
        const systemPrompt = SystemPrompts.buildSystemPrompt(scenarioType, customPrompt);
        const userPrompt = SystemPrompts.buildUserPrompt(scenarioType, extractedText);
        
        // For models that support thinking, we could enable it
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        
        const rawOutput = await this.webllmEngine.generate(fullPrompt, this.config.webllm.options);
        const cleanedOutput = this.outputParser.parse(rawOutput);
        
        return cleanedOutput;
    }

    /**
     * Perform combined LLM rewrite
     */
    async _performCombinedLLMRewrite(quickText, ocrText, customPrompt) {
        const systemPrompt = SystemPrompts.buildSystemPrompt('combined', customPrompt);
        const userPrompt = SystemPrompts.buildUserPrompt('combined', quickText, ocrText);
        
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        
        const rawOutput = await this.webllmEngine.generate(fullPrompt, this.config.webllm.options);
        const cleanedOutput = this.outputParser.parse(rawOutput);
        
        return cleanedOutput;
    }

    /**
     * Extract text using PDF.js
     */
    async _extractTextWithPdfJs(fileArrayBuffer) {
        const pdfjs = (typeof pdfjsLib !== 'undefined' ? pdfjsLib : 
                      (typeof window !== 'undefined' ? window.pdfjsLib : null));
        
        if (!pdfjs || !pdfjs.getDocument) {
            throw new Error('pdf.js library is not loaded or not fully initialized.');
        }

        this.progressCallback({
            stage: 'pdfjs_load',
            message: 'Loading PDF with pdf.js...'
        });

        const pdfDoc = await pdfjs.getDocument({ data: fileArrayBuffer }).promise;
        let fullText = '';
        const numPages = pdfDoc.numPages;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            this.progressCallback({
                stage: 'pdfjs_page',
                message: `Extracting text from page ${pageNum}/${numPages}...`,
                currentPage: pageNum,
                totalPages: numPages
            });

            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent({
                normalizeWhitespace: false,
                disableCombineTextItems: true
            });

            let pageTextBuffer = '';
            if (textContent.items && textContent.items.length > 0) {
                for (let i = 0; i < textContent.items.length; i++) {
                    const item = textContent.items[i];
                    pageTextBuffer += item.str;
                    
                    if (item.hasEOL) {
                        if (!pageTextBuffer.endsWith('\n')) pageTextBuffer += '\n';
                    } else if (i < textContent.items.length - 1) {
                        const nextItem = textContent.items[i + 1];
                        if (item.str && !item.str.endsWith(' ') && 
                            nextItem.str && !nextItem.str.startsWith(' ') && 
                            Math.abs(item.transform[5] - nextItem.transform[5]) < (item.height * 0.5)) {
                            
                            const currentItemEndX = item.transform[4] + item.width;
                            const nextItemStartX = nextItem.transform[4];
                            if (nextItemStartX - currentItemEndX > -0.5) {
                                pageTextBuffer += ' ';
                            }
                        }
                    }
                }
            }
            
            fullText += pageTextBuffer;
            if (pageTextBuffer.trim() !== '' && !pageTextBuffer.endsWith('\n')) {
                fullText += '\n';
            }
        }

        this.progressCallback({
            stage: 'pdfjs_extract_complete',
            message: 'PDF.js text extraction complete.'
        });

        return fullText;
    }

    /**
     * Post-process extracted text with optimized rule application
     */
    _postProcessText(text) {
        if (!text) return '';
        
        let cleanedText = text;
        
        // Apply default rules
        const defaultRules = [
            { find: /\uFB00/g, replace: 'ff' },
            { find: /\uFB01/g, replace: 'fi' },
            { find: /\uFB02/g, replace: 'fl' },
            { find: /\uFB03/g, replace: 'ffi' },
            { find: /\uFB04/g, replace: 'ffl' },
            { find: /[\u2018\u2019]/g, replace: "'" },
            { find: /[\u201C\u201D]/g, replace: '"' },
            { find: /[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25CB\u2981\u2619\u2765]/g, replace: '-' },
            { find: /[\u2013\u2014]/g, replace: '-' },
            { find: /\u00AD/g, replace: '' },
            { find: /[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+/g, replace: ' ' }
        ];

        // Add PascalCase rules if enabled
        if (this.config.processing.splitPascalCase) {
            defaultRules.push(
                { find: /([A-Z][a-z]+)([A-Z][a-z]+)/g, replace: '$1 $2' },
                { find: /([a-z])([A-Z][a-z]+)/g, replace: '$1 $2' }
            );
        }

        // Combine all rules for efficient processing
        const allRules = [...defaultRules, ...this.config.processing.postProcessRules];
        
        // Optimized rule application - batch similar operations
        const unicodeReplacements = [];
        const regexReplacements = [];
        
        for (const rule of allRules) {
            if (rule.find && typeof rule.replace === 'string') {
                if (rule.find instanceof RegExp) {
                    regexReplacements.push(rule);
                } else {
                    unicodeReplacements.push(rule);
                }
            }
        }
        
        // Apply unicode replacements first (typically simpler)
        for (const rule of unicodeReplacements) {
            cleanedText = cleanedText.replace(rule.find, rule.replace);
        }
        
        // Apply regex replacements
        for (const rule of regexReplacements) {
            cleanedText = cleanedText.replace(rule.find, rule.replace);
        }

        // Final normalization - combine line break handling with newline normalization
        return cleanedText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    }

    /**
     * Convert text to markdown with optimized newline handling
     */
    _convertToMarkdown(rawText) {
        // Implementation of markdown conversion logic with optimized newline handling
        let markdownOutputLines = [];
        const inputLines = rawText.split(/\n/);

        let currentParagraphCollector = [];
        let inPotentialTableBlock = false;
        let potentialTableBlockLines = [];

        const flushCurrentParagraph = () => {
            if (currentParagraphCollector.length > 0) {
                markdownOutputLines.push(currentParagraphCollector.join(' ').trim());
                currentParagraphCollector = [];
                // Only add empty line if the next content isn't a heading or table block
                this._addSeparatorLine(markdownOutputLines);
            }
        };

        const flushPotentialTableBlock = () => {
            if (potentialTableBlockLines.length > 0) {
                if (potentialTableBlockLines.length >= 2) {
                    markdownOutputLines.push('```');
                    markdownOutputLines.push(...potentialTableBlockLines.map(l => l.trimEnd()));
                    markdownOutputLines.push('```');
                } else {
                    markdownOutputLines.push(potentialTableBlockLines.join(' ').trim());
                }
                potentialTableBlockLines = [];
                this._addSeparatorLine(markdownOutputLines);
            }
            inPotentialTableBlock = false;
        };

        for (let i = 0; i < inputLines.length; i++) {
            const originalLine = inputLines[i];
            const trimmedLine = originalLine.trim();

            if (trimmedLine === '') {
                if (inPotentialTableBlock) flushPotentialTableBlock();
                flushCurrentParagraph();
                continue;
            }
            
            const isShortLine = trimmedLine.length > 0 && trimmedLine.length < 80;
            const noPunctuationEnd = isShortLine && !/[.,;:!?]$/.test(trimmedLine);
            const isAllCapsLine = trimmedLine.length > 2 && trimmedLine.length < 80 && 
                                  /^[A-Z\s\d\W]*[A-Z][A-Z\s\d\W]*$/.test(trimmedLine) && 
                                  /[A-Z]/.test(trimmedLine) && !/^\d+$/.test(trimmedLine);
            const nextLineIsBlankOrEndOfFile = (i + 1 === inputLines.length || 
                                               inputLines[i + 1].trim() === '');

            if (isAllCapsLine || (isShortLine && noPunctuationEnd && nextLineIsBlankOrEndOfFile && trimmedLine.length > 1)) {
                if (inPotentialTableBlock) flushPotentialTableBlock();
                flushCurrentParagraph();
                markdownOutputLines.push(`# ${trimmedLine}`);
                this._addSeparatorLine(markdownOutputLines);
                if (nextLineIsBlankOrEndOfFile && inputLines[i + 1] && inputLines[i + 1].trim() === '') {
                    i++;
                }
                continue;
            }

            const hasMultipleSpacesBetweenWords = /\S\s{2,}\S/.test(originalLine);
            const hasMultipleColumnsBySpaces = originalLine.split(/\s{2,}/).length > 2 && originalLine.length > 10;

            if (hasMultipleSpacesBetweenWords || hasMultipleColumnsBySpaces) {
                flushCurrentParagraph();
                if (!inPotentialTableBlock) inPotentialTableBlock = true;
                potentialTableBlockLines.push(originalLine);
            } else {
                if (inPotentialTableBlock) flushPotentialTableBlock();
                if (trimmedLine) currentParagraphCollector.push(trimmedLine);
            }
        }

        if (inPotentialTableBlock) flushPotentialTableBlock();
        flushCurrentParagraph();

        // Optimized final cleanup - single pass to normalize excessive newlines
        return this._normalizeMarkdownNewlines(markdownOutputLines);
    }

    /**
     * Helper method to add separator lines only when needed
     */
    _addSeparatorLine(outputLines) {
        // Only add empty line if the last line isn't already empty
        if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
            outputLines.push('');
        }
    }

    /**
     * Normalize newlines in the final markdown output
     */
    _normalizeMarkdownNewlines(lines) {
        // Filter out excessive empty lines while preserving structure
        const normalizedLines = [];
        let consecutiveEmptyLines = 0;
        
        for (const line of lines) {
            if (line.trim() === '') {
                consecutiveEmptyLines++;
                // Allow maximum of 1 consecutive empty line
                if (consecutiveEmptyLines <= 1) {
                    normalizedLines.push('');
                }
            } else {
                consecutiveEmptyLines = 0;
                normalizedLines.push(line.trimEnd());
            }
        }
        
        // Join and do final cleanup
        let finalMarkdown = normalizedLines.join('\n');
        // Remove any remaining triple+ newlines and trim
        finalMarkdown = finalMarkdown.replace(/\n{3,}/g, '\n\n').trim();
        return finalMarkdown;
    }

    /**
     * Cleanup resources with proper error handling
     */
    async _cleanup() {
        try {
            if (this.webllmEngine) {
                this.progressCallback({
                    stage: 'cleanup_webllm',
                    message: 'Cleaning up WebLLM engine...'
                });
                await this.webllmEngine.cleanup();
                this.webllmEngine = null;
            }
            
            this.progressCallback({
                stage: 'cleanup_complete',
                message: 'Resource cleanup completed successfully.'
            });
        } catch (error) {
            console.warn('Warning: Error during resource cleanup:', error.message);
            this.progressCallback({
                stage: 'cleanup_error',
                message: `Resource cleanup warning: ${error.message}`,
                error: error
            });
            // Don't throw - cleanup errors shouldn't break the application
        }
    }
}

export default Extract2MDConverter;
