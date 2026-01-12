#!/usr/bin/env node

/**
 * Test script for MCP tools
 * Tests basic functionality and batch processing
 */

import { factExtract } from './dist/tools/fact-extract.js';
import { entityExtract } from './dist/tools/entity-extract.js';
import { citationValidate } from './dist/tools/citation-validate.js';
import { sourceRate } from './dist/tools/source-rate.js';
import { conflictDetect } from './dist/tools/conflict-detect.js';
import {
  batchFactExtract,
  batchEntityExtract,
  batchSourceRate,
  getCacheStats,
  clearAllCaches,
} from './dist/tools/batch-tools.js';

console.log('Testing MCP Tools v2.0...\n');
console.log('=' .repeat(50));
console.log('PART 1: Core Tools');
console.log('=' .repeat(50));

// Test 1: Fact Extract
console.log('\n1. Testing fact-extract...');
try {
  const factResult = await factExtract({
    text: 'The AI market was valued at $22.4 billion in 2023.',
    source_url: 'https://example.com/report',
  });
  console.log('✓ fact-extract works');
  console.log('  Facts extracted:', JSON.parse(factResult.content[0].text).facts.length);
} catch (error) {
  console.error('✗ fact-extract failed:', error.message);
}

// Test 2: Entity Extract
console.log('\n2. Testing entity-extract...');
try {
  const entityResult = await entityExtract({
    text: 'Microsoft invested in OpenAI to develop AI technologies.',
    extract_relations: true,
  });
  console.log('✓ entity-extract works');
  const parsed = JSON.parse(entityResult.content[0].text);
  console.log('  Entities found:', parsed.metadata.total_entities);
  console.log('  Relationships found:', parsed.metadata.total_relationships);
} catch (error) {
  console.error('✗ entity-extract failed:', error.message);
}

// Test 3: Citation Validate
console.log('\n3. Testing citation-validate...');
try {
  const citationResult = await citationValidate({
    citations: [
      {
        claim: 'AI market is growing',
        author: 'John Doe',
        date: '2024',
        url: 'https://example.com',
      },
      {
        claim: 'Missing info citation',
      },
    ],
  });
  console.log('✓ citation-validate works');
  const parsed = JSON.parse(citationResult.content[0].text);
  console.log('  Total citations:', parsed.total_citations);
  console.log('  Complete citations:', parsed.complete_citations);
  console.log('  Issues found:', parsed.issues.length);
} catch (error) {
  console.error('✗ citation-validate failed:', error.message);
}

// Test 4: Source Rate
console.log('\n4. Testing source-rate...');
try {
  const rateResult = await sourceRate({
    source_url: 'https://scholar.google.com/paper',
    source_type: 'academic',
  });
  console.log('✓ source-rate works');
  const parsed = JSON.parse(rateResult.content[0].text);
  console.log('  Quality rating:', parsed.quality_rating);
  console.log('  Justification:', parsed.justification);
} catch (error) {
  console.error('✗ source-rate failed:', error.message);
}

// Test 5: Conflict Detect
console.log('\n5. Testing conflict-detect...');
try {
  const conflictResult = await conflictDetect({
    facts: [
      {
        entity: 'AI Market',
        attribute: 'Size 2024',
        value: '22.4',
        value_type: 'currency',
        source: 'Source A',
      },
      {
        entity: 'AI Market',
        attribute: 'Size 2024',
        value: '28.5',
        value_type: 'currency',
        source: 'Source B',
      },
    ],
  });
  console.log('✓ conflict-detect works');
  const parsed = JSON.parse(conflictResult.content[0].text);
  console.log('  Conflicts detected:', parsed.total_conflicts);
  if (parsed.total_conflicts > 0) {
    console.log('  Severity:', JSON.stringify(parsed.severity_summary));
  }
} catch (error) {
  console.error('✗ conflict-detect failed:', error.message);
}

console.log('\n' + '=' .repeat(50));
console.log('PART 2: Batch Processing Tools');
console.log('=' .repeat(50));

// Test 6: Batch Fact Extract
console.log('\n6. Testing batch-fact-extract...');
try {
  const batchFactResult = await batchFactExtract({
    items: [
      { text: 'Apple revenue was $394 billion in 2022.', source_url: 'https://apple.com' },
      { text: 'Google revenue reached $280 billion in 2022.', source_url: 'https://google.com' },
      { text: 'Microsoft revenue was $198 billion in 2022.', source_url: 'https://microsoft.com' },
    ],
    options: { maxConcurrency: 3, useCache: true },
  });
  console.log('✓ batch-fact-extract works');
  const parsed = JSON.parse(batchFactResult.content[0].text);
  console.log('  Items processed:', parsed.summary.total);
  console.log('  Successful:', parsed.summary.successful);
  console.log('  Failed:', parsed.summary.failed);
  console.log('  Total time:', parsed.summary.totalTimeMs + 'ms');
  console.log('  Avg time per item:', parsed.summary.avgTimeMs + 'ms');
} catch (error) {
  console.error('✗ batch-fact-extract failed:', error.message);
}

// Test 7: Batch Entity Extract
console.log('\n7. Testing batch-entity-extract...');
try {
  const batchEntityResult = await batchEntityExtract({
    items: [
      { text: 'Tesla CEO Elon Musk announced new AI features.', extract_relations: true },
      { text: 'Amazon acquired Whole Foods for $13.7 billion.', extract_relations: true },
    ],
    options: { maxConcurrency: 2 },
  });
  console.log('✓ batch-entity-extract works');
  const parsed = JSON.parse(batchEntityResult.content[0].text);
  console.log('  Items processed:', parsed.summary.total);
  console.log('  Successful:', parsed.summary.successful);
} catch (error) {
  console.error('✗ batch-entity-extract failed:', error.message);
}

// Test 8: Batch Source Rate
console.log('\n8. Testing batch-source-rate...');
try {
  const batchSourceResult = await batchSourceRate({
    items: [
      { source_url: 'https://nature.com/article', source_type: 'academic' },
      { source_url: 'https://techcrunch.com/news', source_type: 'news' },
      { source_url: 'https://random-blog.com/post', source_type: 'blog' },
    ],
    options: { useCache: true },
  });
  console.log('✓ batch-source-rate works');
  const parsed = JSON.parse(batchSourceResult.content[0].text);
  console.log('  Items processed:', parsed.summary.total);
  console.log('  Successful:', parsed.summary.successful);

  // Show ratings
  const ratings = parsed.results.filter(r => r.success).map(r => r.data.quality_rating);
  console.log('  Ratings:', ratings.join(', '));
} catch (error) {
  console.error('✗ batch-source-rate failed:', error.message);
}

console.log('\n' + '=' .repeat(50));
console.log('PART 3: Cache Management');
console.log('=' .repeat(50));

// Test 9: Cache Stats
console.log('\n9. Testing cache-stats...');
try {
  const statsResult = await getCacheStats();
  console.log('✓ cache-stats works');
  const parsed = JSON.parse(statsResult.content[0].text);
  console.log('  Fact cache size:', parsed.factCache.size);
  console.log('  Fact cache hits:', parsed.factCache.hits);
  console.log('  Source rating cache size:', parsed.sourceRatingCache.size);
} catch (error) {
  console.error('✗ cache-stats failed:', error.message);
}

// Test 10: Cache Clear
console.log('\n10. Testing cache-clear...');
try {
  const clearResult = await clearAllCaches();
  console.log('✓ cache-clear works');
  const parsed = JSON.parse(clearResult.content[0].text);
  console.log('  Message:', parsed.message);

  // Verify cache is cleared
  const statsAfter = await getCacheStats();
  const parsedStats = JSON.parse(statsAfter.content[0].text);
  console.log('  Fact cache size after clear:', parsedStats.factCache.size);
} catch (error) {
  console.error('✗ cache-clear failed:', error.message);
}

console.log('\n' + '=' .repeat(50));
console.log('✅ All tests completed!');
console.log('=' .repeat(50));
