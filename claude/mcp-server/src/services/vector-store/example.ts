/**
 * SQLite Vector Store Example Usage
 * Demonstrates how to use the new SQLite-based vector store
 */

import { SQLiteVectorStore } from './sqlite-vector-store.js';
import * as fs from 'fs';
import * as path from 'path';

async function basicExample() {
  console.log('=== SQLite Vector Store Basic Example ===\n');

  // 1. Initialize the store
  const store = new SQLiteVectorStore({
    storePath: './data/vector-store',
    embedding: {
      provider: 'mock', // Use 'openai' for production
      dimension: 128,
    },
    enableCache: true,
  });

  try {
    // 2. Create a sample document
    const sampleDocPath = './data/sample-document.txt';
    const sampleContent = `
      Machine learning is a subset of artificial intelligence that focuses on algorithms.
      Deep learning uses neural networks with multiple layers to learn patterns.
      Natural language processing enables computers to understand human language.
      Computer vision allows machines to interpret and make decisions based on visual data.
      Reinforcement learning trains agents through reward-based systems.
    `;

    // Ensure data directory exists
    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync(sampleDocPath, sampleContent.trim());

    // 3. Add document to the store
    console.log('Adding document...');
    const chunksAdded = await store.addDocument(sampleDocPath, {
      chunkSize: 50,
      overlap: 10,
      generateEmbeddings: true,
    });
    console.log(`✅ Added ${chunksAdded} chunks\n`);

    // 4. Query the store (vector search)
    console.log('Vector Search Query: "machine learning algorithms"');
    const vectorResults = await store.query('machine learning algorithms', {
      topK: 3,
      minScore: 0.1,
      useVectorSearch: true,
    });

    console.log(`Found ${vectorResults.length} results:`);
    vectorResults.forEach((result, i) => {
      console.log(`\n${i + 1}. Score: ${result.score.toFixed(3)}`);
      console.log(`   Content: ${result.chunk.content.substring(0, 100)}...`);
    });

    // 5. Query the store (keyword search)
    console.log('\n\nKeyword Search Query: "neural networks"');
    const keywordResults = await store.query('neural networks', {
      topK: 3,
      minScore: 0.1,
      useVectorSearch: false,
    });

    console.log(`Found ${keywordResults.length} results:`);
    keywordResults.forEach((result, i) => {
      console.log(`\n${i + 1}. Score: ${result.score.toFixed(3)}`);
      console.log(`   Content: ${result.chunk.content.substring(0, 100)}...`);
    });

    // 6. Get statistics
    console.log('\n\nStore Statistics:');
    const stats = store.getStats();
    console.log(`  Total Documents: ${stats.totalDocuments}`);
    console.log(`  Total Chunks: ${stats.totalChunks}`);
    console.log(`  Total Tokens: ${stats.totalTokens}`);
    console.log(`  Index Size: ${(stats.indexSize / 1024).toFixed(2)} KB`);
    console.log(`  Last Updated: ${stats.lastUpdated}`);

    // 7. List documents
    console.log('\nDocuments in store:');
    const documents = store.listDocuments();
    documents.forEach(doc => console.log(`  - ${doc}`));

  } finally {
    // Clean up
    store.close();
    console.log('\n✅ Example completed');
  }
}

async function migrationExample() {
  console.log('\n\n=== Migration Example ===\n');
  console.log('To migrate from SimpleStore to SQLiteVectorStore:');
  console.log(`
1. Backup existing data:
   cp -r ./data/vector-store ./data/vector-store.backup

2. Initialize new store:
   const newStore = new SQLiteVectorStore({
     storePath: './data/vector-store-v2',
     embedding: { provider: 'mock', dimension: 128 }
   });

3. Migrate documents:
   const oldStore = new SimpleVectorStore('./data/vector-store');
   for (const doc of oldStore.listDocuments()) {
     await newStore.addDocument(doc, { generateEmbeddings: true });
   }

4. Verify and switch over
  `);
}

async function advancedExample() {
  console.log('\n\n=== Advanced Usage Example ===\n');

  const store = new SQLiteVectorStore({
    storePath: './data/vector-store-advanced',
    embedding: {
      provider: 'mock',
      dimension: 256, // Larger dimension for better accuracy
    },
    enableCache: true,
    cacheSize: 20000,
  });

  try {
    // Filtered query
    const docPath = './data/advanced-doc.txt';
    fs.mkdirSync('./data', { recursive: true });
    fs.writeFileSync(docPath, 'Sample advanced content for filtering');

    await store.addDocument(docPath, {
      chunkSize: 100,
      overlap: 20,
    });

    // Query with filter
    const results = await store.query('sample', {
      topK: 5,
      filter: {
        sourceFile: docPath,
      },
    });

    console.log(`Filtered query results: ${results.length}`);

    // Access embedding service directly
    const embeddingService = store.getEmbeddingService();
    const { embedding, dimension } = await embeddingService.generateEmbedding('test query');
    console.log(`\nEmbedding dimension: ${dimension}`);
    console.log(`Embedding sample (first 5): [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);

    // Cache management
    console.log(`\nCache size: ${embeddingService.getCacheSize()}`);
    embeddingService.clearCache();
    console.log('Cache cleared');

  } finally {
    store.close();
  }
}

// Run examples
async function main() {
  try {
    await basicExample();
    await migrationExample();
    await advancedExample();
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run
// main();
