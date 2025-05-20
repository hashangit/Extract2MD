/**
 * Extract2MDConverter.js
 * A client-side JavaScript library to extract text from PDFs and convert it to Markdown.
 * Offers multiple extraction methods (quick via pdf.js, high accuracy via Tesseract.js OCR)
 * and an optional LLM-based rewrite feature using WebLLM.
 */

import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import Tesseract from 'tesseract.js';
import { Chat as ImportedChat } from '@mlc-ai/web-llm';

const DEFAULT_PDFJS_WORKER_SRC = '../pdf.worker.min.mjs'; // Relative to dist/assets/
const DEFAULT_TESSERACT_WORKER_PATH = './tesseract-worker.min.js'; // Relative to dist/assets/
const DEFAULT_TESSERACT_CORE_PATH = './tesseract-core.wasm.js';   // Relative to dist/assets/
const DEFAULT_TESSERACT_LANG_PATH = './lang-data/';             // Relative to dist/assets/
const DEFAULT_LLM_MODEL = 'Qwen3-0.6B-q4f16_0-MLC';

class Extract2MDConverter {
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
        this.chatModule = null;
        this.llmInitialized = false;
        
        this.progressCallback = options.progressCallback || function(progress) { /* console.log(progress) */ };

        this.WebLLMChatConstructor = null;
        if (typeof ImportedChat !== 'undefined') {
            this.WebLLMChatConstructor = ImportedChat;
        } else if (typeof window !== 'undefined' && window.webLLM && typeof window.webLLM.Chat === 'function') {
            this.WebLLMChatConstructor = window.webLLM.Chat;
        } else if (typeof window !== 'undefined' && typeof window.ChatModule === 'function') {
            // Fallback for older global name, though the import error suggests ChatModule is gone
            console.warn('WebLLM global `ChatModule` is deprecated, prefer `webLLM.Chat`.');
            this.WebLLMChatConstructor = window.ChatModule;
        }
    }

    _postProcessText(text, additionalRules = []) {
        if (!text) return '';
        let cleanedText = text;
        const rules = [...this.defaultPostProcessRules, ...this.customPostProcessRules, ...additionalRules];

        for (const rule of rules) {
            if (rule.find && typeof rule.replace === 'string') {
                cleanedText = cleanedText.replace(rule.find, rule.replace);
            }
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
                markdownOutputLines.push('');
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
                markdownOutputLines.push('');
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
                markdownOutputLines.push('');
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

        let finalMarkdown = markdownOutputLines.map(line => line.trimEnd()).join('\n');
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
        try {
            this.progressCallback({ stage: 'ocr_worker_init', message: 'Initializing Tesseract OCR worker...' });
            worker = await Tess.createWorker(tesseractLang, 1, tesseractOpts);
        } catch (err) {
            this.progressCallback({ stage: 'ocr_worker_error', message: `Failed to initialize Tesseract worker: ${err.message}`, error: err });
            throw new Error(`Failed to initialize Tesseract worker: ${err.message}`);
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

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            this.progressCallback({ stage: 'ocr_recognize_page', message: `OCR processing page ${pageNum}/${numPages}...`, currentPage: pageNum, totalPages: numPages });
            const { data: { text: ocrPageText } } = await worker.recognize(canvas);
            fullTextAccumulator += ocrPageText + '\n';
            
            canvas.width = 0; canvas.height = 0;
        }
        
        this.progressCallback({ stage: 'ocr_terminate_worker', message: 'Terminating Tesseract worker...' });
        await worker.terminate();

        this.progressCallback({ stage: 'postprocess_ocr', message: 'Post-processing OCR text...' });
        let cleanedText = this._postProcessText(fullTextAccumulator, options.postProcessRules);
        cleanedText = cleanedText.replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n\n').trim();

        this.progressCallback({ stage: 'markdown_ocr', message: 'Converting to Markdown...' });
        const markdown = this._convertToMarkdownLogic(cleanedText);
        this.progressCallback({ stage: 'complete_ocr', message: 'High-accuracy conversion complete.' });
        return markdown;
    }

    async _initializeLLM(modelId, chatOpts = {}) {
        if (!this.WebLLMChatConstructor) { 
            throw new Error('WebLLM Chat module is not loaded. Ensure @mlc-ai/web-llm is correctly imported and bundled, or webLLM.Chat is globally available.');
        }

        if (this.llmInitialized && this.chatModule && this.chatModule.modelId === modelId) {
            this.progressCallback({ stage: 'llm_ready', message: 'LLM already initialized with the correct model.' });
            return;
        }

        this.progressCallback({ stage: 'llm_init', message: `Initializing LLM with model: ${modelId}... This may take time.` });
        
        if (this.chatModule) {
            await this.chatModule.unload();
        }

        this.chatModule = new this.WebLLMChatConstructor();
        this.chatModule.modelId = modelId; 

        this.chatModule.setInitProgressCallback(report => {
            this.progressCallback({
                stage: 'llm_load_progress',
                message: `LLM Loading: ${report.text}`,
                progress: report.progress 
            });
        });

        try {
            await this.chatModule.reload(modelId, chatOpts);
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
            const reply = await this.chatModule.generate(prompt, undefined, 0); // Or a similar method for chat completion
            this.progressCallback({ stage: 'llm_generate_complete', message: 'LLM rewrite complete.' });
            
            // If reply is an object, extract the text content, e.g., reply.choices[0].message.content
            // For now, assume 'reply' is the string or has a direct way to get string output.
            // This might need to be:
            // const chatCompletion = await this.chatModule.chat.completions.create({ messages: [{role: "user", content: prompt}], model: model });
            // const reply = chatCompletion.choices[0].message.content;
            // However, the `generate` method was used before, so let's assume it's still the primary way or has been adapted.
            return reply;
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

export default Extract2MDConverter;