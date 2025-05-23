/**
 * OutputParser.js
 * Utility for parsing and cleaning LLM output
 * Removes thinking tags and ensures proper markdown formatting
 */

export class OutputParser {
    constructor() {
        // Regex pattern to match <think>...</think> blocks with optional line breaks
        this.thinkRegex = /<think>.*?<\/think>\n?\n?/gs;
        
        // Patterns for cleaning up common LLM output issues
        this.cleanupPatterns = [
            // Remove excessive whitespace
            { find: /\n{3,}/g, replace: '\n\n' },
            // Fix spacing around headers
            { find: /^(#{1,6})\s*(.+)$/gm, replace: '$1 $2' },
            // Ensure proper list formatting
            { find: /^(\s*[-*+])\s+/gm, replace: '$1 ' },
            // Clean up numbered lists
            { find: /^(\s*\d+\.)\s+/gm, replace: '$1 ' },
            // Remove trailing spaces
            { find: /[ \t]+$/gm, replace: '' },
            // Normalize line endings
            { find: /\r\n/g, replace: '\n' },
            // Clean up code block formatting
            { find: /```\s*\n\s*\n/g, replace: '```\n' },
            { find: /\n\s*\n\s*```/g, replace: '\n```' }
        ];
    }

    /**
     * Parse LLM output by removing thinking blocks and cleaning formatting
     * @param {string} rawOutput - Raw output from LLM
     * @returns {string} Cleaned and formatted output
     */
    parse(rawOutput) {
        if (!rawOutput || typeof rawOutput !== 'string') {
            return '';
        }

        let cleanedOutput = rawOutput;

        // Step 1: Remove <think>...</think> blocks
        cleanedOutput = this.removeThinkingBlocks(cleanedOutput);

        // Step 2: Apply general cleanup patterns
        cleanedOutput = this.applyCleanupPatterns(cleanedOutput);

        // Step 3: Ensure proper markdown structure
        cleanedOutput = this.ensureMarkdownStructure(cleanedOutput);

        return cleanedOutput.trim();
    }

    /**
     * Remove <think>...</think> blocks from the output
     * @param {string} text - Input text
     * @returns {string} Text with thinking blocks removed
     */
    removeThinkingBlocks(text) {
        // Remove all <think>...</think> blocks including optional line breaks after
        let cleaned = text.replace(this.thinkRegex, '');
        
        // Clean up any remaining empty lines at the start
        cleaned = cleaned.replace(/^\s*\n+/, '');
        
        return cleaned;
    }

    /**
     * Apply general cleanup patterns to improve formatting
     * @param {string} text - Input text
     * @returns {string} Cleaned text
     */
    applyCleanupPatterns(text) {
        let cleaned = text;
        
        for (const pattern of this.cleanupPatterns) {
            cleaned = cleaned.replace(pattern.find, pattern.replace);
        }
        
        return cleaned;
    }

    /**
     * Ensure proper markdown structure and formatting
     * @param {string} text - Input text
     * @returns {string} Properly structured markdown
     */
    ensureMarkdownStructure(text) {
        let structured = text;
        
        // Ensure headers have proper spacing
        structured = structured.replace(/^(#{1,6}\s.+)$/gm, (match, header) => {
            return `\n${header}\n`;
        });
        
        // Ensure code blocks have proper spacing
        structured = structured.replace(/^```/gm, '\n```');
        structured = structured.replace(/```$/gm, '```\n');
        
        // Ensure lists have proper spacing
        structured = structured.replace(/^(\s*[-*+]\s.+)$/gm, (match, listItem, offset, string) => {
            const prevChar = string[offset - 1];
            return prevChar && prevChar !== '\n' ? `\n${listItem}` : listItem;
        });
        
        // Final cleanup of excessive line breaks
        structured = structured.replace(/\n{3,}/g, '\n\n');
        
        return structured;
    }

    /**
     * Extract only the markdown content, removing any prefacing text
     * @param {string} text - Input text
     * @returns {string} Pure markdown content
     */
    extractMarkdownContent(text) {
        // Look for common LLM response patterns and extract just the markdown
        const patterns = [
            // "Here's the rewritten text:" followed by content
            /(?:here'?s?\s+(?:the\s+)?(?:rewritten|improved|cleaned|formatted)\s+(?:text|content|version)[:.]?\s*\n)(.*)/is,
            // "Rewritten text:" followed by content
            /(?:rewritten\s+text[:.]?\s*\n)(.*)/is,
            // Just return the whole thing if no pattern matches
            /(.*)/s
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        return text.trim();
    }

    /**
     * Validate if the output is properly formatted markdown
     * @param {string} text - Text to validate
     * @returns {Object} Validation result with status and issues
     */
    validateMarkdown(text) {
        const issues = [];
        
        // Check for common markdown issues
        if (text.includes('<think>')) {
            issues.push('Contains thinking blocks that should be removed');
        }
        
        // Check for malformed headers
        const malformedHeaders = text.match(/^#{7,}/gm);
        if (malformedHeaders) {
            issues.push('Contains headers with too many # symbols');
        }
        
        // Check for unclosed code blocks
        const codeBlockCount = (text.match(/```/g) || []).length;
        if (codeBlockCount % 2 !== 0) {
            issues.push('Contains unclosed code blocks');
        }
        
        // Check for excessive line breaks
        if (text.includes('\n\n\n\n')) {
            issues.push('Contains excessive line breaks');
        }
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Apply custom parsing rules
     * @param {string} text - Input text
     * @param {Array} customRules - Array of custom parsing rules
     * @returns {string} Text with custom rules applied
     */
    applyCustomRules(text, customRules = []) {
        if (!Array.isArray(customRules) || customRules.length === 0) {
            return text;
        }
        
        let processed = text;
        
        for (const rule of customRules) {
            if (rule.find && typeof rule.replace === 'string') {
                processed = processed.replace(rule.find, rule.replace);
            }
        }
        
        return processed;
    }
}

export default OutputParser;
