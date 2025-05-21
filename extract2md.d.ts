declare module 'extract2md' {
  interface PostProcessRule {
    find: RegExp | string;
    replace: string;
  }

  interface ProgressReport {
    stage: string;
    message: string;
    currentPage?: number;
    totalPages?: number;
    progress?: number;
    error?: any;
  }

  interface Extract2MDOptions {
    pdfJsWorkerSrc?: string;
    tesseractWorkerPath?: string;
    tesseractCorePath?: string;
    tesseractLangPath?: string;
    tesseractOptions?: any; // Consider defining a more specific type if known
    tesseractLanguage?: string;
    splitPascalCase?: boolean;
    postProcessRules?: PostProcessRule[];
    llmModel?: string;
    progressCallback?: (report: ProgressReport) => void;
  }

  interface ConvertOptions {
    postProcessRules?: PostProcessRule[];
  }

  interface HighAccuracyConvertOptions extends ConvertOptions {
    tesseractLanguage?: string;
    tesseractOptions?: any; // Consider defining a more specific type if known
    pdfRenderScale?: number;
  }

  interface LLMRewriteOptions {
    llmModel?: string;
    llmPromptTemplate?: (text: string) => string;
    chatOpts?: any; // Consider defining a more specific type if known
  }

  class Extract2MDConverter {
    constructor(options?: Extract2MDOptions);

    quickConvert(pdfFile: File, options?: ConvertOptions): Promise<string>;
    highAccuracyConvert(pdfFile: File, options?: HighAccuracyConvertOptions): Promise<string>;
    llmRewrite(textToRewrite: string, options?: LLMRewriteOptions): Promise<string>;
    unloadLLM(): Promise<void>;
  }

  export default Extract2MDConverter;
}