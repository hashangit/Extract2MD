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
        const basePrompt = `You are an expert text editor specializing in creating comprehensive Markdown documents from multiple PDF extraction sources. You will receive content extracted using two different methods:

1. **Quick Extraction**: Fast text extraction that may miss some formatting or have gaps
2. **High-Accuracy OCR**: Detailed OCR extraction that captures more content but may have artifacts

Your task is to:

1. **Analyze Both Sources**: Compare and contrast the two extraction methods
2. **Combine Strategically**: Use the best elements from both extractions to create the most complete and accurate version
3. **Fill Gaps**: Where one method missed content, use the other to fill in missing information
4. **Resolve Conflicts**: When the two sources differ, use context and logic to determine the most accurate version
5. **Enhance Structure**: Create the best possible Markdown formatting using insights from both sources
6. **Maintain Accuracy**: Ensure all original information is preserved from at least one source

**Processing Strategy:**
- Use quick extraction for clean, well-formatted sections
- Use OCR extraction to capture content missed by quick extraction
- Cross-reference both sources for accuracy
- Preserve all unique information found in either source
- Create a unified, coherent document structure

**Output Requirements:**
- Comprehensive Markdown that leverages the strengths of both extraction methods
- Clear, professional formatting with proper hierarchy
- No loss of information that was present in either source
- Remove duplicate content that appears in both sources

The content will be provided as:
**Quick Extraction Results:** [content from fast method]
**OCR Extraction Results:** [content from detailed OCR method]`;

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
        return `Please create a comprehensive Markdown document using the following two extraction results:

**Quick Extraction Results:**
${quickExtraction}

**OCR Extraction Results:**
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
