/**
 * Test script to verify newline optimization improvements
 */

// Import the converter classes
import { Extract2MDConverter } from '../src/converters/Extract2MDConverter.js';
import { LegacyExtract2MDConverter } from '../src/index.js';

// Test data with excessive newlines
const testText = `
Title Here


Some text with multiple spaces.



Another paragraph with lots of newlines.




And more text.


`;

// Mock progress callback
const mockProgressCallback = () => {};

console.log('Testing newline optimization improvements...\n');

// Test new converter
console.log('Testing new Extract2MDConverter...');
try {
    const newConverter = new Extract2MDConverter({ progressCallback: mockProgressCallback });
    const newResult = newConverter._convertToMarkdown(testText);
    
    console.log('✅ New converter executed successfully');
    console.log('Result length:', newResult.length);
    console.log('Number of consecutive newlines (should be minimal):');
    
    const tripleNewlines = (newResult.match(/\n{3,}/g) || []).length;
    const doubleNewlines = (newResult.match(/\n{2}/g) || []).length;
    
    console.log(`  - Triple+ newlines: ${tripleNewlines} (should be 0)`);
    console.log(`  - Double newlines: ${doubleNewlines}`);
    
    if (tripleNewlines === 0) {
        console.log('✅ Newline optimization working correctly for new converter');
    } else {
        console.log('❌ Newline optimization needs improvement for new converter');
    }
} catch (error) {
    console.log('❌ New converter failed:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test legacy converter
console.log('Testing legacy LegacyExtract2MDConverter...');
try {
    const legacyConverter = new LegacyExtract2MDConverter({ progressCallback: mockProgressCallback });
    const legacyResult = legacyConverter._convertToMarkdownLogic(testText);
    
    console.log('✅ Legacy converter executed successfully');
    console.log('Result length:', legacyResult.length);
    console.log('Number of consecutive newlines (should be minimal):');
    
    const tripleNewlines = (legacyResult.match(/\n{3,}/g) || []).length;
    const doubleNewlines = (legacyResult.match(/\n{2}/g) || []).length;
    
    console.log(`  - Triple+ newlines: ${tripleNewlines} (should be 0)`);
    console.log(`  - Double newlines: ${doubleNewlines}`);
    
    if (tripleNewlines === 0) {
        console.log('✅ Newline optimization working correctly for legacy converter');
    } else {
        console.log('❌ Newline optimization needs improvement for legacy converter');
    }
} catch (error) {
    console.log('❌ Legacy converter failed:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test post-processing optimization
console.log('Testing post-processing optimization...');
try {
    const newConverter = new Extract2MDConverter({ progressCallback: mockProgressCallback });
    const testPostProcessText = 'Text with filigature and unicode\u2018quotes\u2019 and bullets\u2022';
    
    const processedText = newConverter._postProcessText(testPostProcessText);
    console.log('Original:', testPostProcessText);
    console.log('Processed:', processedText);
    
    if (processedText.includes('filigature') && processedText.includes("'quotes'") && processedText.includes('-')) {
        console.log('✅ Post-processing optimization working correctly');
    } else {
        console.log('❌ Post-processing optimization needs review');
    }
} catch (error) {
    console.log('❌ Post-processing test failed:', error.message);
}

console.log('\n🎉 Newline optimization test completed!');
