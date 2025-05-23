#!/usr/bin/env node

/**
 * Deployment validation script for Extract2MD
 * This script validates the package is ready for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DeploymentValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.success = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
        console.log(`${prefix} [${timestamp}] ${message}`);
        
        if (type === 'error') this.errors.push(message);
        else if (type === 'warning') this.warnings.push(message);
        else this.success.push(message);
    }

    async validate() {
        console.log('🚀 Starting Extract2MD Deployment Validation...\n');

        // Check package structure
        this.validatePackageStructure();
        
        // Check build outputs
        this.validateBuildOutputs();
        
        // Check documentation
        this.validateDocumentation();
        
        // Check configuration files
        this.validateConfiguration();
        
        // Check TypeScript definitions
        this.validateTypeDefinitions();

        // Summary
        this.printSummary();
        
        return this.errors.length === 0;
    }

    validatePackageStructure() {
        this.log('Validating package structure...');

        const requiredFiles = [
            'package.json',
            'src/index.js',
            'src/types/index.d.ts',
            'dist/assets/extract2md.umd.js',
            'README_NEW.md',
            'MIGRATION.md',
            'DEPLOYMENT.md',
            'config.example.json'
        ];

        const requiredDirs = [
            'src/converters',
            'src/engines', 
            'src/utils',
            'examples',
            'test'
        ];

        for (const file of requiredFiles) {
            const filePath = path.resolve(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                this.log(`Required file found: ${file}`);
            } else {
                this.log(`Missing required file: ${file}`, 'error');
            }
        }

        for (const dir of requiredDirs) {
            const dirPath = path.resolve(__dirname, '..', dir);
            if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
                this.log(`Required directory found: ${dir}`);
            } else {
                this.log(`Missing required directory: ${dir}`, 'error');
            }
        }
    }

    validateBuildOutputs() {
        this.log('Validating build outputs...');

        const buildFiles = [
            'dist/assets/extract2md.umd.js',
            'dist/assets/tesseract-worker.min.js',
            'dist/assets/tesseract-core.wasm.js',
            'dist/pdf.worker.min.mjs'
        ];

        for (const file of buildFiles) {
            const filePath = path.resolve(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
                this.log(`Build file found: ${file} (${sizeInMB} MB)`);
                
                if (stats.size === 0) {
                    this.log(`Build file is empty: ${file}`, 'error');
                }
            } else {
                this.log(`Missing build file: ${file}`, 'error');
            }
        }
    }

    validateDocumentation() {
        this.log('Validating documentation...');

        const docFiles = {
            'README_NEW.md': ['Installation', 'Scenarios', 'Configuration'],
            'MIGRATION.md': ['Legacy API', 'Migration', 'Backwards Compatibility'],
            'DEPLOYMENT.md': ['Distribution', 'Performance', 'Security']
        };

        for (const [file, keywords] of Object.entries(docFiles)) {
            const filePath = path.resolve(__dirname, '..', file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                for (const keyword of keywords) {
                    if (content.toLowerCase().includes(keyword.toLowerCase())) {
                        this.log(`Documentation section found in ${file}: ${keyword}`);
                    } else {
                        this.log(`Missing documentation section in ${file}: ${keyword}`, 'warning');
                    }
                }
            } else {
                this.log(`Missing documentation file: ${file}`, 'error');
            }
        }
    }

    validateConfiguration() {
        this.log('Validating configuration files...');

        // Check package.json
        const packagePath = path.resolve(__dirname, '..', 'package.json');
        if (fs.existsSync(packagePath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                
                const requiredFields = ['name', 'version', 'main', 'module', 'types'];
                for (const field of requiredFields) {
                    if (pkg[field]) {
                        this.log(`package.json has required field: ${field}`);
                    } else {
                        this.log(`package.json missing field: ${field}`, 'error');
                    }
                }

                // Check if main file exists
                if (pkg.main && fs.existsSync(path.resolve(__dirname, '..', pkg.main))) {
                    this.log(`Main entry point exists: ${pkg.main}`);
                } else {
                    this.log(`Main entry point missing: ${pkg.main}`, 'error');
                }

            } catch (error) {
                this.log(`Invalid JSON in package.json: ${error.message}`, 'error');
            }
        }

        // Check example config
        const configPath = path.resolve(__dirname, '..', 'config.example.json');
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.ocr && config.webllm) {
                    this.log('Example configuration is valid');
                } else {
                    this.log('Example configuration missing required sections', 'warning');
                }
            } catch (error) {
                this.log(`Invalid example configuration: ${error.message}`, 'error');
            }
        }
    }

    validateTypeDefinitions() {
        this.log('Validating TypeScript definitions...');

        const typesPath = path.resolve(__dirname, '..', 'src/types/index.d.ts');
        if (fs.existsSync(typesPath)) {
            const content = fs.readFileSync(typesPath, 'utf8');
            
            const requiredInterfaces = [
                'OCRConfig',
                'WebLLMConfig', 
                'Extract2MDConfig',
                'Extract2MDConverter'
            ];

            for (const interfaceName of requiredInterfaces) {
                if (content.includes(`interface ${interfaceName}`) || 
                    content.includes(`declare class ${interfaceName}`) ||
                    content.includes(`export class ${interfaceName}`)) {
                    this.log(`TypeScript interface found: ${interfaceName}`);
                } else {
                    this.log(`Missing TypeScript interface: ${interfaceName}`, 'error');
                }
            }
        } else {
            this.log('TypeScript definitions file not found', 'error');
        }
    }

    printSummary() {
        console.log('\n📊 Deployment Validation Summary');
        console.log('=====================================');
        console.log(`✅ Successful checks: ${this.success.length}`);
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);

        if (this.errors.length > 0) {
            console.log('\n🚨 Critical Issues Found:');
            this.errors.forEach(error => console.log(`  - ${error}`));
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.warnings.forEach(warning => console.log(`  - ${warning}`));
        }

        console.log('\n' + (this.errors.length === 0 ? '🎉 Package is ready for deployment!' : '🔧 Please fix the errors before deployment.'));
    }
}

// Run validation
const validator = new DeploymentValidator();
validator.validate().then(isValid => {
    process.exit(isValid ? 0 : 1);
}).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
});
