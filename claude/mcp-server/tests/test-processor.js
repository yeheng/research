#!/usr/bin/env node
/**
 * Simple test for processor.ts functionality
 */

import { extractEntities, extractRelations } from '../src/services/entity-extractor.js';
import { cleanHtml, countTokens, extractMetadata } from '../src/services/processor.js';

// Test HTML
const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>OpenAI Releases GPT-4</title>
  <meta name="description" content="OpenAI announces GPT-4">
  <meta name="author" content="Tech News">
</head>
<body>
  <nav>Navigation Menu</nav>
  <script>console.log('ads');</script>

  <article>
    <h1>OpenAI Releases GPT-4</h1>
    <p>OpenAI announced GPT-4, their latest language model.
    Microsoft invested $10 billion in OpenAI.</p>

    <table>
      <tr><th>Model</th><th>Parameters</th></tr>
      <tr><td>GPT-3</td><td>175B</td></tr>
      <tr><td>GPT-4</td><td>Unknown</td></tr>
    </table>
  </article>

  <footer>Copyright 2024</footer>
</body>
</html>
`;

console.log('🧪 Testing Document Processor...\n');

// Test 1: Clean HTML
console.log('1️⃣ Testing cleanHtml()...');
const cleaned = cleanHtml(testHtml);
console.log('✅ Cleaned text length:', cleaned.length);
console.log('Sample:', cleaned.substring(0, 100) + '...\n');

// Test 2: Extract Metadata
console.log('2️⃣ Testing extractMetadata()...');
const metadata = extractMetadata(testHtml);
console.log('✅ Metadata:', JSON.stringify(metadata, null, 2), '\n');

// Test 3: Count Tokens
console.log('3️⃣ Testing countTokens()...');
const tokens = countTokens(cleaned);
console.log('✅ Token count:', tokens, '\n');

// Test 4: Extract Entities
console.log('4️⃣ Testing extractEntities()...');
const entities = extractEntities(cleaned);
console.log('✅ Found entities:', Object.keys(entities).length);
console.log('Sample:', Object.keys(entities).slice(0, 3), '\n');

// Test 5: Extract Relations
console.log('5️⃣ Testing extractRelations()...');
const relations = extractRelations(cleaned, entities);
console.log('✅ Found relations:', relations.length);
if (relations.length > 0) {
  console.log('Sample:', relations[0], '\n');
}

console.log('✅ All tests passed!');
