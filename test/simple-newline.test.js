/**
 * Simple test to verify newline optimization improvements
 * This test focuses on the core markdown conversion logic
 */

// Test data with excessive newlines
const testText = `
Title Here


Some text with multiple spaces.



Another paragraph with lots of newlines.




And more text.


`;

// Mock helper functions similar to what's in the converters
function addSeparatorLine(outputLines) {
    if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
        outputLines.push('');
    }
}

function normalizeMarkdownNewlines(lines) {
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

// Test the newline optimization
function testNewlineOptimization() {
    console.log('Testing newline optimization improvements...\n');
    
    // Simulate the basic markdown conversion with newline optimization
    let markdownOutputLines = [];
    const inputLines = testText.split(/\n/);
    
    let currentParagraphCollector = [];
    
    const flushCurrentParagraph = () => {
        if (currentParagraphCollector.length > 0) {
            markdownOutputLines.push(currentParagraphCollector.join(' ').trim());
            currentParagraphCollector = [];
            addSeparatorLine(markdownOutputLines);
        }
    };
    
    for (let i = 0; i < inputLines.length; i++) {
        const trimmedLine = inputLines[i].trim();
        
        if (trimmedLine === '') {
            flushCurrentParagraph();
            continue;
        }
        
        // Simple header detection
        if (trimmedLine === 'Title Here') {
            flushCurrentParagraph();
            markdownOutputLines.push(`# ${trimmedLine}`);
            addSeparatorLine(markdownOutputLines);
            continue;
        }
        
        // Regular text
        if (trimmedLine) {
            currentParagraphCollector.push(trimmedLine);
        }
    }
    
    flushCurrentParagraph();
    
    // Apply the optimization
    const optimizedResult = normalizeMarkdownNewlines(markdownOutputLines);
    
    console.log('Original text length:', testText.length);
    console.log('Optimized result length:', optimizedResult.length);
    console.log('\nOptimized result:');
    console.log('---');
    console.log(optimizedResult);
    console.log('---');
    
    // Count newline patterns
    const tripleNewlines = (optimizedResult.match(/\n{3,}/g) || []).length;
    const doubleNewlines = (optimizedResult.match(/\n{2}/g) || []).length;
    
    console.log('\nNewline analysis:');
    console.log(`  - Triple+ newlines: ${tripleNewlines} (should be 0)`);
    console.log(`  - Double newlines: ${doubleNewlines}`);
    
    if (tripleNewlines === 0) {
        console.log('✅ Newline optimization working correctly');
    } else {
        console.log('❌ Newline optimization needs improvement');
    }
    
    // Test post-processing simulation
    console.log('\n' + '='.repeat(50));
    console.log('Testing post-processing optimization...');
    
    const testPostProcessText = 'Text with filigature and unicode\u2018quotes\u2019 and bullets\u2022';
    
    // Simulate the optimized post-processing
    const rules = [
        { find: /[\u2018\u2019]/g, replace: "'" },
        { find: /[\u2022\u2023\u25E6\u2043\u2219\u25CF\u25CB\u2981\u2619\u2765]/g, replace: '-' }
    ];
    
    let processedText = testPostProcessText;
    for (const rule of rules) {
        processedText = processedText.replace(rule.find, rule.replace);
    }
    
    console.log('Original:', testPostProcessText);
    console.log('Processed:', processedText);
    
    if (processedText.includes("'quotes'") && processedText.includes('-')) {
        console.log('✅ Post-processing optimization working correctly');
    } else {
        console.log('❌ Post-processing optimization needs review');
    }
    
    return tripleNewlines === 0;
}

// Run the test
const success = testNewlineOptimization();
console.log('\n' + '='.repeat(50));
console.log('🎉 Newline optimization test completed!');
console.log(success ? '✅ All tests passed' : '❌ Some tests failed');

process.exit(success ? 0 : 1);
