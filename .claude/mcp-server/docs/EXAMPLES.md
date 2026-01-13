# MCP Tools Usage Examples

## Example 1: Research Report Fact Extraction

Extract facts from a research report and validate sources.

```javascript
import { factExtract } from './dist/tools/fact-extract.js';
import { citationValidate } from './dist/tools/citation-validate.js';
import { sourceRate } from './dist/tools/source-rate.js';

// Sample research text
const researchText = `
The global AI market was valued at $136.55 billion in 2022 and is projected to
reach $1,811.75 billion by 2030, growing at a CAGR of 38.1%.

Key players include Microsoft, Google, and OpenAI. Microsoft has invested over
$10 billion in OpenAI to develop next-generation AI technologies.

The healthcare AI segment is expected to grow at 45% CAGR, driven by diagnostic
AI and drug discovery applications.
`;

// Step 1: Extract facts
const factResult = await factExtract({
  text: researchText,
  source_url: 'https://example.com/ai-market-report',
  source_metadata: {
    title: 'Global AI Market Report 2024',
    author: 'Research Analytics Inc',
    date: '2024-01'
  }
});

const facts = JSON.parse(factResult.content[0].text);
console.log('Extracted Facts:');
facts.facts.forEach(f => {
  console.log(`  - ${f.entity}: ${f.attribute} = ${f.value}`);
});

// Step 2: Rate the source
const rateResult = await sourceRate({
  source_url: 'https://example.com/ai-market-report',
  source_type: 'industry'
});

const rating = JSON.parse(rateResult.content[0].text);
console.log(`\nSource Rating: ${rating.quality_rating}`);
console.log(`Justification: ${rating.justification}`);

// Step 3: Prepare citations for validation
const citations = facts.facts.map(f => ({
  claim: `${f.entity} ${f.attribute}: ${f.value}`,
  author: f.source.author,
  date: f.source.date,
  url: f.source.url
}));

const validationResult = await citationValidate({ citations });
const validation = JSON.parse(validationResult.content[0].text);

console.log(`\nCitation Validation:`);
console.log(`  Complete: ${validation.complete_citations}/${validation.total_citations}`);
console.log(`  Issues: ${validation.issues.length}`);
```

---

## Example 2: Entity Knowledge Graph

Build a knowledge graph from business news.

```javascript
import { batchEntityExtract } from './dist/tools/batch-tools.js';

const newsArticles = [
  {
    text: `Microsoft invested $10 billion in OpenAI. CEO Satya Nadella
           announced the partnership will focus on Azure AI integration.`,
    extract_relations: true
  },
  {
    text: `Google launched Gemini to compete with ChatGPT. Sundar Pichai
           said Gemini represents Google's most capable AI model.`,
    extract_relations: true
  },
  {
    text: `Amazon Web Services expanded its AI services. Andy Jassy
           highlighted Bedrock as the foundation for enterprise AI.`,
    extract_relations: true
  }
];

const result = await batchEntityExtract({
  items: newsArticles,
  options: { maxConcurrency: 3 }
});

const parsed = JSON.parse(result.content[0].text);

// Aggregate entities across all articles
const allEntities = new Map();
const allRelationships = [];

parsed.results.forEach(r => {
  if (r.success) {
    r.data.entities.forEach(e => {
      if (!allEntities.has(e.name)) {
        allEntities.set(e.name, e);
      }
    });
    allRelationships.push(...r.data.edges);
  }
});

console.log('Knowledge Graph:');
console.log('\nEntities:');
allEntities.forEach((e, name) => {
  console.log(`  ${name} (${e.type})`);
});

console.log('\nRelationships:');
allRelationships.forEach(r => {
  console.log(`  ${r.source} --[${r.relation}]--> ${r.target}`);
});
```

---

## Example 3: Conflict Detection in Market Data

Detect contradictions between different market reports.

```javascript
import { conflictDetect } from './dist/tools/conflict-detect.js';

// Facts from different sources about the same metrics
const marketFacts = [
  // Source A - Optimistic Report
  { entity: 'AI Market', attribute: 'Size 2024', value: '200', value_type: 'currency', source: 'Gartner' },
  { entity: 'AI Market', attribute: 'CAGR', value: '42', value_type: 'percentage', source: 'Gartner' },
  { entity: 'Cloud AI', attribute: 'Market Share', value: '65', value_type: 'percentage', source: 'Gartner' },

  // Source B - Conservative Report
  { entity: 'AI Market', attribute: 'Size 2024', value: '150', value_type: 'currency', source: 'IDC' },
  { entity: 'AI Market', attribute: 'CAGR', value: '35', value_type: 'percentage', source: 'IDC' },
  { entity: 'Cloud AI', attribute: 'Market Share', value: '58', value_type: 'percentage', source: 'IDC' },

  // Source C - Middle Ground
  { entity: 'AI Market', attribute: 'Size 2024', value: '175', value_type: 'currency', source: 'Forrester' },
];

const result = await conflictDetect({
  facts: marketFacts,
  tolerance: { numerical_threshold: 0.15 } // 15% tolerance
});

const conflicts = JSON.parse(result.content[0].text);

console.log('Conflict Analysis:');
console.log(`Total Conflicts: ${conflicts.total_conflicts}`);
console.log('\nSeverity Summary:', conflicts.severity_summary);

console.log('\nDetailed Conflicts:');
conflicts.conflicts.forEach((c, i) => {
  console.log(`\n${i + 1}. ${c.entity} - ${c.attribute}`);
  console.log(`   Type: ${c.type}, Severity: ${c.severity}`);
  console.log(`   Values: ${c.values.join(' vs ')}`);
  console.log(`   Sources: ${c.sources.join(' vs ')}`);
  console.log(`   Difference: ${c.difference_percentage?.toFixed(1)}%`);
});
```

---

## Example 4: Batch Source Quality Assessment

Rate multiple sources for a research project.

```javascript
import { batchSourceRate, getCacheStats } from './dist/tools/batch-tools.js';

const sources = [
  // Academic sources
  { source_url: 'https://arxiv.org/abs/2301.00001', source_type: 'academic' },
  { source_url: 'https://nature.com/articles/ai-research', source_type: 'academic' },

  // Industry sources
  { source_url: 'https://openai.com/blog/gpt-4', source_type: 'official' },
  { source_url: 'https://cloud.google.com/ai-platform', source_type: 'official' },

  // News sources
  { source_url: 'https://techcrunch.com/ai-news', source_type: 'news' },
  { source_url: 'https://wired.com/ai-feature', source_type: 'news' },

  // Blog sources
  { source_url: 'https://medium.com/@researcher/ai-thoughts', source_type: 'blog' },
];

const result = await batchSourceRate({
  items: sources,
  options: { useCache: true }
});

const parsed = JSON.parse(result.content[0].text);

// Group sources by rating
const byRating = { A: [], B: [], C: [], D: [], E: [] };

parsed.results.forEach(r => {
  if (r.success) {
    const rating = r.data.quality_rating;
    byRating[rating].push({
      url: sources[parseInt(r.id.split('_')[1])].source_url,
      justification: r.data.justification
    });
  }
});

console.log('Source Quality Assessment:\n');

Object.entries(byRating).forEach(([rating, sources]) => {
  if (sources.length > 0) {
    console.log(`Rating ${rating}:`);
    sources.forEach(s => {
      console.log(`  - ${s.url}`);
      console.log(`    ${s.justification}`);
    });
    console.log();
  }
});

// Check cache efficiency
const stats = await getCacheStats();
const cacheStats = JSON.parse(stats.content[0].text);
console.log('Cache Statistics:');
console.log(`  Source Rating Cache: ${cacheStats.sourceRatingCache.size} entries`);
console.log(`  Hit Rate: ${(cacheStats.sourceRatingCache.hitRate * 100).toFixed(1)}%`);
```

---

## Example 5: Full Research Pipeline

Complete pipeline from raw text to validated report.

```javascript
import { factExtract } from './dist/tools/fact-extract.js';
import { entityExtract } from './dist/tools/entity-extract.js';
import { citationValidate } from './dist/tools/citation-validate.js';
import { conflictDetect } from './dist/tools/conflict-detect.js';

async function processResearchDocument(text, sourceUrl, metadata) {
  console.log('=== Starting Research Pipeline ===\n');

  // Step 1: Extract Facts
  console.log('Step 1: Extracting facts...');
  const factResult = await factExtract({ text, source_url: sourceUrl, source_metadata: metadata });
  const facts = JSON.parse(factResult.content[0].text);
  console.log(`  Found ${facts.facts.length} facts`);
  console.log(`  Quality Score: ${facts.extraction_quality}/10`);

  // Step 2: Extract Entities
  console.log('\nStep 2: Extracting entities...');
  const entityResult = await entityExtract({ text, extract_relations: true });
  const entities = JSON.parse(entityResult.content[0].text);
  console.log(`  Found ${entities.metadata.total_entities} entities`);
  console.log(`  Found ${entities.metadata.total_relationships} relationships`);

  // Step 3: Check for Internal Conflicts
  console.log('\nStep 3: Checking for conflicts...');
  if (facts.facts.length > 1) {
    const conflictResult = await conflictDetect({ facts: facts.facts });
    const conflicts = JSON.parse(conflictResult.content[0].text);
    console.log(`  Conflicts found: ${conflicts.total_conflicts}`);
    if (conflicts.total_conflicts > 0) {
      console.log(`  Severity: ${JSON.stringify(conflicts.severity_summary)}`);
    }
  }

  // Step 4: Validate Citations
  console.log('\nStep 4: Validating citations...');
  const citations = facts.facts.map(f => ({
    claim: `${f.entity}: ${f.value}`,
    author: metadata.author,
    date: metadata.date,
    url: sourceUrl
  }));

  const validResult = await citationValidate({ citations });
  const validation = JSON.parse(validResult.content[0].text);
  console.log(`  Complete citations: ${validation.complete_citations}/${validation.total_citations}`);
  console.log(`  Issues: ${validation.issues.length}`);

  console.log('\n=== Pipeline Complete ===');

  return {
    facts: facts.facts,
    entities: entities.entities,
    relationships: entities.edges,
    validation: validation,
    quality: facts.extraction_quality
  };
}

// Usage
const report = await processResearchDocument(
  `The AI market reached $150 billion in 2023. Microsoft and Google
   are the leading players. Growth rate is projected at 40% annually.`,
  'https://example.com/report',
  { author: 'AI Research Team', date: '2024-01', title: 'AI Market Analysis' }
);
```
