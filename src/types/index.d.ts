/**
 * TypeScript definitions for Extract2MD
 */

// Core configuration interfaces
export interface OCRConfig {
  language?: string;
  oem?: number;
  psm?: number;
  workerPath?: string;
  corePath?: string;
  langPath?: string;
  options?: any;
}

export interface WebLLMConfig {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  streamingEnabled?: boolean;
  customModel?: CustomModelConfig;
  options?: any;
}

export interface PostProcessRule {
  find: RegExp | string;
  replace: string;
}

export interface ProgressReport {
  stage: string;
  message: string;
  currentPage?: number;
  totalPages?: number;
  progress?: number;
  usage?: any;
  error?: any;
}

export interface TesseractConfig {
  workerPath?: string;
  corePath?: string;
  langPath?: string;
  language?: string;
  options?: any;
}

export interface CustomModelConfig {
  model: string;
  model_id: string;
  model_lib: string;
  required_features?: string[];
  overrides?: any;
}

export interface LLMConfig {
  model?: string;
  customModel?: CustomModelConfig;
  options?: {
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
}

export interface SystemPromptsConfig {
  singleExtraction?: string;
  combinedExtraction?: string;
}

export interface ProcessingConfig {
  splitPascalCase?: boolean;
  pdfRenderScale?: number;
  postProcessRules?: PostProcessRule[];
}

export interface Extract2MDConfig {
  pdfJsWorkerSrc?: string;
  tesseract?: TesseractConfig;
  llm?: LLMConfig;
  systemPrompts?: SystemPromptsConfig;
  processing?: ProcessingConfig;
  progressCallback?: (report: ProgressReport) => void;
}

export interface WebLLMEngineConfig {
  progressCallback?: (report: ProgressReport) => void;
  defaultModel?: string;
  customModelConfig?: CustomModelConfig;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  [key: string]: any;
}

export interface ModelInfo {
  isInitialized: boolean;
  currentModelId: string | null;
  isReady: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

export class WebLLMEngine {
  constructor(config?: WebLLMEngineConfig);
  
  initialize(modelId?: string | null, modelConfig?: any): Promise<void>;
  generate(prompt: string, options?: GenerationOptions): Promise<string>;
  generateStream(
    prompt: string, 
    options?: GenerationOptions, 
    onChunk?: (chunk: string, fullResponse: string) => void
  ): Promise<string>;
  isReady(): boolean;
  getModelInfo(): ModelInfo;
  cleanup(): Promise<void>;
}

export class OutputParser {
  constructor();
  
  parse(rawOutput: string): string;
  removeThinkingBlocks(text: string): string;
  applyCleanupPatterns(text: string): string;
  ensureMarkdownStructure(text: string): string;
  extractMarkdownContent(text: string): string;
  validateMarkdown(text: string): ValidationResult;
  applyCustomRules(text: string, customRules?: PostProcessRule[]): string;
}

export class SystemPrompts {
  static getSingleExtractionPrompt(customization?: string): string;
  static getCombinedExtractionPrompt(customization?: string): string;
  static getSingleExtractionUserPrompt(extractedText: string): string;
  static getCombinedExtractionUserPrompt(quickExtraction: string, ocrExtraction: string): string;
  static buildSystemPrompt(scenarioType: 'single' | 'combined', customization?: string): string;
  static buildUserPrompt(scenarioType: 'single' | 'combined', ...extractionResults: string[]): string;
  static getThinkingEnabledPrompt(basePrompt: string): string;
}

export class ConfigValidator {
  static getDefaultConfig(): Extract2MDConfig;
  static validate(config?: any): Extract2MDConfig;
  static validateTesseractConfig(tesseractConfig: any): void;
  static validateLLMConfig(llmConfig: any): void;
  static validateCustomModel(customModel: any): void;
  static validateLLMOptions(options: any): void;
  static validateProcessingConfig(processingConfig: any): void;
  static validateSystemPrompts(systemPrompts: any): void;
  static deepMerge(target: any, source: any): any;
  static isObject(value: any): boolean;
  static fromJSON(jsonString: string): Extract2MDConfig;
  static getSchema(): any;
}

export class Extract2MDConverter {
  constructor(config?: Extract2MDConfig);
  
  // Scenario-specific static methods
  static quickConvertOnly(pdfFile: File, options?: Extract2MDConfig): Promise<string>;
  static highAccuracyConvertOnly(pdfFile: File, options?: Extract2MDConfig): Promise<string>;
  static quickConvertWithLLM(pdfFile: File, options?: Extract2MDConfig): Promise<string>;
  static highAccuracyConvertWithLLM(pdfFile: File, options?: Extract2MDConfig): Promise<string>;
  static combinedConvertWithLLM(pdfFile: File, options?: Extract2MDConfig): Promise<string>;
}

// Legacy support - keeping the old interface available
export interface Extract2MDOptions extends Extract2MDConfig {}

export interface ConvertOptions {
  postProcessRules?: PostProcessRule[];
}

export interface HighAccuracyConvertOptions extends ConvertOptions {
  tesseractLanguage?: string;
  tesseractOptions?: any;
  pdfRenderScale?: number;
}

export interface LLMRewriteOptions {
  llmModel?: string;
  llmPromptTemplate?: (text: string) => string;
  chatOpts?: any;
}

// Legacy class for backwards compatibility
export class LegacyExtract2MDConverter {
  constructor(options?: Extract2MDOptions);
  
  quickConvert(pdfFile: File, options?: ConvertOptions): Promise<string>;
  highAccuracyConvert(pdfFile: File, options?: HighAccuracyConvertOptions): Promise<string>;
  llmRewrite(textToRewrite: string, options?: LLMRewriteOptions): Promise<string>;
  unloadLLM(): Promise<void>;
}

// Default export
export default Extract2MDConverter;
