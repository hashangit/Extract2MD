/**
 * Simple test to validate package structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Extract2MD package structure...');

// Test 1: Check TypeScript definitions exist
const typesPath = path.resolve(__dirname, '../src/types/index.d.ts');
if (fs.existsSync(typesPath)) {
    console.log('✅ TypeScript definitions found');
} else {
    console.log('❌ TypeScript definitions missing');
    process.exit(1);
}

// Test 2: Check configuration example exists
const configPath = path.resolve(__dirname, '../config.example.json');
if (fs.existsSync(configPath)) {
    console.log('✅ Configuration example found');
} else {
    console.log('❌ Configuration example missing');
    process.exit(1);
}

// Test 3: Check core files exist
const coreFiles = [
    '../src/converters/Extract2MDConverter.js',
    '../src/engines/WebLLMEngine.js',
    '../src/utils/ConfigValidator.js',
    '../src/utils/OutputParser.js',
    '../src/utils/SystemPrompts.js'
];

for (const file of coreFiles) {
    const filePath = path.resolve(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file.split('/').pop()} found`);
    } else {
        console.log(`❌ ${file.split('/').pop()} missing`);
        process.exit(1);
    }
}

console.log('\n🎉 All basic structure tests passed!');
process.exit(0);
