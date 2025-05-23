/**
 * Extract2MD - Enhanced PDF to Markdown conversion library
 * New API with scenario-specific methods for different use cases
 */

// Import new modular components
import Extract2MDConverter from './converters/Extract2MDConverter.js';
import WebLLMEngine from './engines/WebLLMEngine.js';
import OutputParser from './utils/OutputParser.js';
import SystemPrompts from './utils/SystemPrompts.js';
import ConfigValidator from './utils/ConfigValidator.js';

// Legacy imports for backwards compatibility
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import Tesseract from 'tesseract.js';
import { Chat as ImportedChat, CreateMLCEngine as ImportedCreateMLCEngine } from '@mlc-ai/web-llm';
import * as webllm from '@mlc-ai/web-llm';

const DEFAULT_PDFJS_WORKER_SRC = '../pdf.worker.min.mjs'; // Relative to dist/assets/
const DEFAULT_TESSERACT_WORKER_PATH = './tesseract-worker.min.js'; // Relative to dist/assets/
const DEFAULT_TESSERACT_CORE_PATH = './tesseract-core.wasm.js';   // Relative to dist/assets/
const DEFAULT_TESSERACT_LANG_PATH = './lang-data/';             // Relative to dist/assets/
const DEFAULT_LLM_MODEL = 'Qwen3-0.6B-q4f16_1-MLC'; // Updated to match available WASM
const DEFAULT_LLM_MODEL_LIB_URL = 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Qwen3-0.6B-q4f16_1-ctx4k_cs1k-webgpu.wasm';

// Legacy converter class for backwards compatibility
class LegacyExtract2MDConverter {
    constructor(options = {}) {
        this.pdfJsWorkerSrc = options.pdfJsWorkerSrc || DEFAULT_PDFJS_WORKER_SRC;
        const pdfjsSetupLib = (typeof pdfjsLib !== 'undefined' ? pdfjsLib : (typeof window !== 'undefined' ? window.pdfjsLib : null));
        if (pdfjsSetupLib && pdfjsSetupLib.GlobalWorkerOptions) {
            pdfjsSetupLib.GlobalWorkerOptions.workerSrc = this.pdfJsWorkerSrc;
        } else {
            console.warn('pdfjsLib or pdfjsLib.GlobalWorkerOptions is not defined. PDF.js worker may not load correctly if not already configured globally.');
        }

        this.tesseractOptions = { 
            workerPath: options.tesseractWorkerPath || DEFAULT_TESSERACT_WORKER_PATH,
            corePath: options.tesseractCorePath || DEFAULT_TESSERACT_CORE_PATH,
            langPath: options.tesseractLangPath || DEFAULT_TESSERACT_LANG_PATH,
            ...(options.tesseractOptions || {})
        };
        this.tesseractLanguage = options.tesseractLanguage || 'eng'; // Default to English
        this.splitPascalCase = options.splitPascalCase || false; 

        this.defaultPostProcessRules = [
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
            { find: /[\s\u00A0\u2000-\u200A\u202F\u205F\u3000]+/g, replace: ' ' }, 
        ];

        if (this.splitPascalCase) {
            this.defaultPostProcessRules.push(
                { find: /([A-Z][a-z]+)([A-Z][a-z]+)/g, replace: '$1 $2' },
                { find: /([a-z])([A-Z][a-z]+)/g, replace: '$1 $2' },
                { find: /([A-Z][a-z]+)([A-Z][a-z]+)/g, replace: '$1 $2' } 
            );
        }
        this.customPostProcessRules = options.postProcessRules || [];

        this.llmModel = options.llmModel || DEFAULT_LLM_MODEL;
        this.llmModelLibUrl = options.llmModelLibUrl || null; // New option for user-specified model_lib
        this.chatModule = null;
        this.llmInitialized = false;
        
        this.progressCallback = options.progressCallback || function(progress) { /* console.log(progress) */ };

        this.WebLLMChatConstructor = null; // For fallback
        this.WebLLMCreateEngine = null;
        this.webllmModule = null;

        // Try to get the full webllm module for modelLibURLPrefix and modelVersion
        if (typeof webllm !== 'undefined' && webllm.CreateMLCEngine) {
            this.webllmModule = webllm;
            this.WebLLMCreateEngine = webllm.CreateMLCEngine;
            this.WebLLMChatConstructor = webllm.Chat; // Also get Chat from the main module
        } else if (typeof window !== 'undefined' && window.webLLM && typeof window.webLLM.CreateMLCEngine === 'function') {
            this.webllmModule = window.webLLM;
            this.WebLLMCreateEngine = window.webLLM.CreateMLCEngine;
            this.WebLLMChatConstructor = window.webLLM.Chat;
        } else {
             // Fallback if full module import didn't work as expected, try individual imports
            console.warn('Extract2MD_Debug: Full webllm module not found, relying on individual imports/globals for CreateMLCEngine/Chat.');
            if (typeof ImportedCreateMLCEngine !== 'undefined') {
                this.WebLLMCreateEngine = ImportedCreateMLCEngine;
            } else if (typeof window !== 'undefined' && window.webLLM && typeof window.webLLM.CreateMLCEngine === 'function') { // Redundant but safe
                this.WebLLMCreateEngine = window.webLLM.CreateMLCEngine;
            }
            // Fallback for Chat constructor
            if (typeof ImportedChat !== 'undefined') {
                this.WebLLMChatConstructor = ImportedChat;
            } else if (typeof window !== 'undefined' && window.webLLM && typeof window.webLLM.Chat === 'function') { // Redundant
                this.WebLLMChatConstructor = window.webLLM.Chat;
            }
        }
    }

    _postProcessText(text, additionalRules = []) {
        if (!text) return '';
        let cleanedText = text;
        const allRules = [...this.defaultPostProcessRules, ...this.customPostProcessRules, ...additionalRules];

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

        return cleanedText.trim();
    }

    _convertToMarkdownLogic(rawText) {
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
                if (potentialTableBlockLines.length >= 2) { // Heuristic: at least 2 lines for a table/code block
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
            const isAllCapsLine = trimmedLine.length > 2 && trimmedLine.length < 80 && /^[A-Z\s\d\W]*[A-Z][A-Z\s\d\W]*$/.test(trimmedLine) && /[A-Z]/.test(trimmedLine) && !/^\d+$/.test(trimmedLine);
            const nextLineIsBlankOrEndOfFile = (i + 1 === inputLines.length || inputLines[i + 1].trim() === '');

            if (isAllCapsLine || (isShortLine && noPunctuationEnd && nextLineIsBlankOrEndOfFile && trimmedLine.length > 1)) {
                if (inPotentialTableBlock) flushPotentialTableBlock();
                flushCurrentParagraph();
                markdownOutputLines.push(`# ${trimmedLine}`);
                this._addSeparatorLine(markdownOutputLines);
                if (nextLineIsBlankOrEndOfFile && inputLines[i+1] && inputLines[i + 1].trim() === '') {
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

    async _extractTextWithPdfJs(fileArrayBuffer) {
        const pdfjs = (typeof pdfjsLib !== 'undefined' ? pdfjsLib : (typeof window !== 'undefined' ? window.pdfjsLib : null));
        if (!pdfjs || !pdfjs.getDocument) {
            throw new Error('pdf.js library (pdfjsLib) is not loaded or not fully initialized.');
        }

        this.progressCallback({ stage: 'pdfjs_load', message: 'Loading PDF with pdf.js...' });
        const pdfDoc = await pdfjs.getDocument({ data: fileArrayBuffer }).promise;
        let fullText = '';
        const numPages = pdfDoc.numPages;

        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            this.progressCallback({ stage: 'pdfjs_page', message: `Extracting text from page ${pageNum}/${numPages}...`, currentPage: pageNum, totalPages: numPages });
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
                        const nextItem = textContent.items[i+1];
                        if (item.str && !item.str.endsWith(' ') && nextItem.str && !nextItem.str.startsWith(' ') && Math.abs(item.transform[5] - nextItem.transform[5]) < (item.height * 0.5)) {
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
            if (pageTextBuffer.trim() !== '' && !pageTextBuffer.endsWith('\n')) fullText += '\n';
        }
        this.progressCallback({ stage: 'pdfjs_extract_complete', message: 'pdf.js text extraction complete.' });
        return fullText;
    }

    async quickConvert(pdfFile, options = {}) {
        if (!(pdfFile instanceof File)) throw new Error('Invalid input: pdfFile must be a File object.');
        this.progressCallback({ stage: 'start_quick', message: 'Starting quick conversion...' });
        const arrayBuffer = await pdfFile.arrayBuffer();
        let rawText = await this._extractTextWithPdfJs(arrayBuffer);
        
        this.progressCallback({ stage: 'postprocess_quick', message: 'Post-processing extracted text...' });
        let cleanedText = this._postProcessText(rawText, options.postProcessRules);
        cleanedText = cleanedText.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n\n').trim();
        
        this.progressCallback({ stage: 'markdown_quick', message: 'Converting to Markdown...' });
        const markdown = this._convertToMarkdownLogic(cleanedText);
        this.progressCallback({ stage: 'complete_quick', message: 'Quick conversion complete.' });
        return markdown;
    }

    async highAccuracyConvert(pdfFile, options = {}) {
        if (!(pdfFile instanceof File)) throw new Error('Invalid input: pdfFile must be a File object.');
        const pdfjs = (typeof pdfjsLib !== 'undefined' ? pdfjsLib : (typeof window !== 'undefined' ? window.pdfjsLib : null));
        if (!pdfjs || !pdfjs.getDocument) throw new Error('pdf.js library (pdfjsLib) is not loaded or not fully initialized.');
        const Tess = (typeof Tesseract !== 'undefined' ? Tesseract : (typeof window !== 'undefined' ? window.Tesseract : null));
        if (!Tess) throw new Error('Tesseract.js library is not loaded.');

        this.progressCallback({ stage: 'start_ocr', message: 'Starting high-accuracy OCR conversion...' });

        const tesseractLang = options.tesseractLanguage || this.tesseractLanguage;
        const tesseractOpts = { ...this.tesseractOptions, ...(options.tesseractOptions || {}) }; // Merge instance and call options
        const pdfRenderScale = options.pdfRenderScale || 2.5;

        let worker;
        let workerInitialized = false;
        
        try {
            this.progressCallback({ stage: 'ocr_worker_init', message: 'Initializing Tesseract OCR worker...' });
            
            try {
                // Set timeout for worker initialization
                const workerPromise = Tess.createWorker(tesseractLang, 1, tesseractOpts);

                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Worker initialization timed out after 30 seconds')), 30000);
                });

                worker = await Promise.race([workerPromise, timeoutPromise]);
                workerInitialized = true;

                this.progressCallback({ stage: 'ocr_worker_ready', message: 'OCR worker initialized successfully.' });
            } catch (err) {
                this.progressCallback({ stage: 'ocr_worker_error', message: `Failed to initialize Tesseract worker: ${err.message}`, error: err });
                throw new Error(`Failed to initialize Tesseract worker: ${err.message}. Check if Tesseract.js files are accessible and language data is available.`);
            }
            
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            let fullTextAccumulator = '';
            const numPages = pdfDoc.numPages;

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                this.progressCallback({ stage: 'ocr_render_page', message: `Rendering page ${pageNum}/${numPages} for OCR...`, currentPage: pageNum, totalPages: numPages });
                
                const page = await pdfDoc.getPage(pageNum);
                const viewport = page.getViewport({ scale: pdfRenderScale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                try {
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    this.progressCallback({ stage: 'ocr_recognize_page', message: `OCR processing page ${pageNum}/${numPages}...`, currentPage: pageNum, totalPages: numPages });
                    const recognition = await worker.recognize(canvas);
                    const ocrPageText = recognition.data?.text || '';
                    fullTextAccumulator += ocrPageText + '\n';
                    
                } catch (pageError) {
                    this.progressCallback({ stage: 'ocr_page_warning', message: `Warning: Failed to process page ${pageNum}: ${pageError.message}` });
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
                    this.progressCallback({ stage: 'ocr_terminate_worker', message: 'Terminating Tesseract worker...' });
                    
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

        this.progressCallback({ stage: 'postprocess_ocr', message: 'Post-processing OCR text...' });
        let cleanedText = this._postProcessText(fullTextAccumulator, options.postProcessRules);
        cleanedText = cleanedText.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n\n').trim();

        this.progressCallback({ stage: 'markdown_ocr', message: 'Converting to Markdown...' });
        const markdown = this._convertToMarkdownLogic(cleanedText);
        this.progressCallback({ stage: 'complete_ocr', message: 'High-accuracy conversion complete.' });
        return markdown;
    }

    async _initializeLLM(modelId, chatOpts = {}) {
        if (!this.WebLLMCreateEngine && !this.WebLLMChatConstructor) {
            throw new Error('WebLLM (CreateMLCEngine or Chat) module is not loaded. Ensure @mlc-ai/web-llm is correctly imported/bundled, or webLLM is globally available.');
        }

        // Check if LLM is already initialized with the same model.
        // For CreateMLCEngine, modelId is part of the engine. For Chat, we stored it.
        const currentModelId = this.chatModule ? (this.chatModule.modelId || (this.chatModule.config && this.chatModule.config.model_id)) : null;
        if (this.llmInitialized && this.chatModule && currentModelId === modelId) {
            this.progressCallback({ stage: 'llm_ready', message: 'LLM already initialized with the correct model.' });
            return;
        }

        this.progressCallback({ stage: 'llm_init', message: `Initializing LLM with model: ${modelId}... This may take time.` });
        
        if (this.chatModule && typeof this.chatModule.unload === 'function') {
            await this.chatModule.unload();
            this.chatModule = null; // Ensure it's cleared
        }
        this.llmInitialized = false;


        const llmInitProgressCallback = report => {
            this.progressCallback({
                stage: 'llm_load_progress',
                message: `LLM Loading: ${report.text}`,
                progress: report.progress
            });
        };

        try {
            if (this.WebLLMCreateEngine) {
                let modelLibToUse;

                if (this.llmModelLibUrl) {
                    // User provided a specific model_lib URL
                    modelLibToUse = this.llmModelLibUrl;
                } else if (modelId === DEFAULT_LLM_MODEL) {
                    // Use the hardcoded default model_lib URL for the default model
                    modelLibToUse = DEFAULT_LLM_MODEL_LIB_URL;
                } else {
                    // No specific URL provided by user, and it's not the default model with a known URL
                    throw new Error(
                        `Extract2MD Error: 'model_lib' URL not specified for model '${modelId}'. ` +
                        `Please provide it via the 'llmModelLibUrl' constructor option, ` +
                        `or use the default model ('${DEFAULT_LLM_MODEL}').`
                    );
                }
                
                const appConfig = {
                    model_list: [
                        {
                            "model": `https://huggingface.co/mlc-ai/${modelId}/resolve/main/`,
                            "model_id": modelId,
                            "model_lib": modelLibToUse,
                            "required_features": modelId.includes("f16") ? ["shader-f16"] : [],
                            "overrides": {
                                "conv_template": "qwen"
                            }
                        }
                    ]
                };

                const engineConfig = {
                    ...chatOpts,
                    initProgressCallback: llmInitProgressCallback,
                    appConfig: appConfig // Pass the constructed appConfig
                };
                this.chatModule = await this.WebLLMCreateEngine(modelId, engineConfig);
                // CreateMLCEngine loads the model, so no separate reload needed immediately.
                // We can store modelId if needed for future checks, though engine usually has it.
                if(this.chatModule) this.chatModule.modelId = modelId; // For consistency if checked later
            } else if (this.WebLLMChatConstructor) {
                // Fallback to Chat constructor - this is the path that had issues
                this.chatModule = new this.WebLLMChatConstructor();
                if(this.chatModule) this.chatModule.modelId = modelId; // Store modelId for Chat instances
                
                const finalChatOpts = {
                    ...chatOpts,
                    initProgressCallback: llmInitProgressCallback
                };
                if (typeof this.chatModule.reload !== 'function') {
                    throw new Error('this.chatModule.reload is not a function (Chat fallback path).');
                }
                await this.chatModule.reload(modelId, finalChatOpts);
            } else {
                 throw new Error('No valid WebLLM constructor found.');
            }
            
            this.llmInitialized = true;
            this.progressCallback({ stage: 'llm_init_complete', message: 'LLM initialized successfully.' });
        } catch (err) {
            this.llmInitialized = false;
            this.progressCallback({ stage: 'llm_init_error', message: `LLM initialization failed: ${err.message}`, error: err });
            throw new Error(`LLM initialization failed: ${err.message}`);
        }
    }

    async llmRewrite(textToRewrite, options = {}) {
        const model = options.llmModel || this.llmModel;
        const promptTemplate = options.llmPromptTemplate || 
            ((text) => `Please rewrite the following text, which was extracted from a PDF. Aim to improve its clarity, correct grammatical errors, and enhance its flow and professional tone, while preserving the original meaning, information, details, context and structure. Correct spelling errors in common words (do not change spelling in uncommon words like names, places, brands, etc.). Output only the rewritten text.\n\nOriginal Text:\n${text}\n\nRewritten Text:`);
        
        const chatOpts = options.chatOpts || {};

        await this._initializeLLM(model, chatOpts);
        if (!this.llmInitialized || !this.chatModule) {
            throw new Error('LLM could not be initialized or is not ready.');
        }

        const prompt = promptTemplate(textToRewrite);
        this.progressCallback({ stage: 'llm_generate_start', message: 'LLM generating rewritten text...' });
        
        try {
            // The generate method in newer web-llm might return a ChatCompletion object.
            // We need to access the message content.
            // For simplicity, assuming it's similar to the previous structure or a direct string.
            // If it returns a more complex object, this part might need adjustment based on the exact API of webLLM.Chat.
            let replyContent = '';
            if (this.WebLLMCreateEngine && this.chatModule && this.chatModule.chat && typeof this.chatModule.chat.completions.create === 'function') {
                // Using MLCEngine's OpenAI-compatible API
                const chatCompletion = await this.chatModule.chat.completions.create({
                    messages: [{ role: "user", content: prompt }],
                    model: model // Ensure 'model' here is the modelId used for the engine
                });
                if (chatCompletion.choices && chatCompletion.choices.length > 0 && chatCompletion.choices[0].message) {
                    replyContent = chatCompletion.choices[0].message.content || '';
                }
            } else if (this.chatModule && typeof this.chatModule.generate === 'function') {
                // Fallback or direct Chat.generate usage
                replyContent = await this.chatModule.generate(prompt, undefined, 0); // progressCb and streamInterval to undefined/0
            } else {
                throw new Error('LLM module does not support generate or chat.completions.create');
            }
            
            this.progressCallback({ stage: 'llm_generate_complete', message: 'LLM rewrite complete.' });
            return replyContent;
        } catch (err) {
            this.progressCallback({ stage: 'llm_generate_error', message: `LLM generation failed: ${err.message}`, error: err });
            throw new Error(`LLM generation failed: ${err.message}`);
        }
    }

    async unloadLLM() {
        if (this.chatModule) {
            this.progressCallback({ stage: 'llm_unload', message: 'Unloading LLM model...' });
            await this.chatModule.unload();
            this.chatModule = null;
            this.llmInitialized = false;
            this.progressCallback({ stage: 'llm_unload_complete', message: 'LLM unloaded.' });
        }
    }
}

// Export new API
export default Extract2MDConverter;

// Export individual components for advanced usage
export {
    Extract2MDConverter,
    WebLLMEngine,
    OutputParser,
    SystemPrompts,
    ConfigValidator,
    LegacyExtract2MDConverter
};

// Export legacy class as default for backwards compatibility
export { LegacyExtract2MDConverter as Extract2MDConverter_Legacy };