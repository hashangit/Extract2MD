/**
 * SystemPrompts.js
 * System prompts for different LLM rewrite scenarios
 */

export class SystemPrompts {
    /**
     * Base system prompt for single extraction method scenarios (3 & 4)
     */
    static getSingleExtractionPrompt(customization = '') {
        const basePrompt = `You are an expert text editor specializing in converting extracted PDF content into clean, well-formatted Markdown. Your task is to:

1. **Preserve Original Content**: Maintain all original information, context, and meaning
2. **Improve Clarity**: Enhance readability and flow while keeping the professional tone
3. **Fix Errors**: Correct grammatical errors, spelling mistakes in common words (preserve proper nouns, names, places, brands)
4. **Structure Enhancement**: Organize content with appropriate Markdown formatting (headers, lists, emphasis, code blocks, etc.)
5. **Remove Artifacts**: Clean up PDF extraction artifacts like weird spacing, broken words, or formatting issues

**Important Guidelines:**
- Do not change technical terms, names, places, or brand names
- Maintain the original document structure and hierarchy
- Use proper Markdown syntax for formatting
- Do not add information that wasn't in the original text
- Output ONLY the improved Markdown content

The text you receive was extracted from a PDF and may contain formatting issues or extraction artifacts.`;

        return customization ? `${basePrompt}\n\n**Additional Instructions:**\n${customization}` : basePrompt;
    }

    /**
     * Specialized system prompt for combined extraction scenarios (scenario 5)
     */
    static getCombinedExtractionPrompt(customization = '') {
        const basePrompt = `You are an expert text editor specializing in creating a single, comprehensive Markdown document by intelligently combining content from two different PDF extraction sources. Your goal is to produce the most complete, accurate, and well-formatted Markdown output possible.

You will receive content extracted using two methods. Your task is to:

1.  **Synthesize Information**: Intelligently merge the content from both extraction sources. Prioritize completeness and accuracy, ensuring no critical information, context, or meaning is lost from either source.
2.  **Preserve Entities and Relationships**: Pay special attention to accurately retaining all names, places, dates, objects, technical terms, brand names, and the relationships between them.
3.  **Enhance Clarity and Structure**: Improve readability and flow. Organize the combined content with appropriate Markdown formatting (headers, lists, emphasis, code blocks, etc.) to create a unified and coherent document.
4.  **Correct Errors and Artifacts**: Fix grammatical errors and spelling mistakes in common words. Preserve proper nouns and specialized terms. Clean up PDF extraction artifacts (e.g., weird spacing, broken words, formatting issues) from both sources.
5.  **Avoid Over-Summarization**: The primary goal is comprehensive extraction and combination, not summarization. Retain all details unless they are clear duplicates.

**Important Guidelines:**
- Do not change technical terms, names, places, or brand names unless correcting an obvious extraction error.
- Create a single, unified Markdown document.
- Use proper Markdown syntax for all formatting.
- Do not add any information that was not present in the original texts.
- Output ONLY the combined and improved Markdown content. Do not include any explanations, categorizations, or section titles like "Combined Results" or similar.

The two sets of extracted text will be provided. Your task is to process them and return a single block of clean Markdown.`;

        return customization ? `${basePrompt}\n\n**Additional Instructions:**\n${customization}` : basePrompt;
    }

    /**
     * Get user prompt for single extraction scenarios
     */
    static getSingleExtractionUserPrompt(extractedText) {
        return `Please improve and format the following extracted PDF content into clean Markdown:

**Extracted Content:**
${extractedText}

**Improved Markdown:**`;
    }

    /**
     * Get user prompt for combined extraction scenarios
     */
    static getCombinedExtractionUserPrompt(quickExtraction, ocrExtraction) {
        return `Please combine, improve, and format the following two sets of extracted PDF content into a single, clean Markdown document:

**Source 1 Extracted Content:**
${quickExtraction}

**Source 2 Extracted Content:**
${ocrExtraction}

**Combined and Improved Markdown:**`;
    }

    /**
     * Build complete system prompt with customizations
     */
    static buildSystemPrompt(scenarioType, customization = '') {
        switch (scenarioType) {
            case 'single':
                return this.getSingleExtractionPrompt(customization);
            case 'combined':
                return this.getCombinedExtractionPrompt(customization);
            default:
                throw new Error(`Unknown scenario type: ${scenarioType}`);
        }
    }

    /**
     * Build complete user prompt based on scenario
     */
    static buildUserPrompt(scenarioType, ...extractionResults) {
        switch (scenarioType) {
            case 'single':
                if (extractionResults.length !== 1) {
                    throw new Error('Single extraction scenario requires exactly one extraction result');
                }
                return this.getSingleExtractionUserPrompt(extractionResults[0]);
            case 'combined':
                if (extractionResults.length !== 2) {
                    throw new Error('Combined extraction scenario requires exactly two extraction results');
                }
                return this.getCombinedExtractionUserPrompt(extractionResults[0], extractionResults[1]);
            default:
                throw new Error(`Unknown scenario type: ${scenarioType}`);
        }
    }

    /**
     * Get thinking-enabled prompt variations for models that support it
     */
    static getThinkingEnabledPrompt(basePrompt) {
        return `${basePrompt}

Take time to think through your approach before providing the final output. Consider the extraction quality, potential issues, and the best way to structure the content.`;
    }
}

export default SystemPrompts;
