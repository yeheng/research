#!/usr/bin/env node

/**
 * Deep Research Framework - MCP Server
 *
 * Provides standardized data processing tools for research:
 * - fact-extract: Extract atomic facts from text
 * - entity-extract: Extract entities and relationships
 * - citation-validate: Validate citations
 * - source-rate: Rate source quality
 * - conflict-detect: Detect fact conflicts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Tool implementations
import { factExtract } from './tools/fact-extract.js';
import { entityExtract } from './tools/entity-extract.js';
import { citationValidate } from './tools/citation-validate.js';
import { sourceRate } from './tools/source-rate.js';
import { conflictDetect } from './tools/conflict-detect.js';

// Create server instance
const server = new Server(
  {
    name: 'deep-research-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'fact-extract',
        description: 'Extract atomic facts from text with source attribution',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Raw research content' },
            source_url: { type: 'string', description: 'Source URL' },
            source_metadata: { type: 'object', description: 'Source metadata' },
          },
          required: ['text'],
        },
      },
      {
        name: 'entity-extract',
        description: 'Extract named entities and relationships from text',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to analyze' },
            entity_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Entity types to extract'
            },
            extract_relations: { type: 'boolean', description: 'Extract relationships' },
          },
          required: ['text'],
        },
      },
      {
        name: 'citation-validate',
        description: 'Validate citations for completeness, accuracy, and quality',
        inputSchema: {
          type: 'object',
          properties: {
            citations: { type: 'array', description: 'Array of citations to validate' },
            verify_urls: { type: 'boolean', description: 'Check URL accessibility' },
            check_accuracy: { type: 'boolean', description: 'Verify citation accuracy' },
          },
          required: ['citations'],
        },
      },
      {
        name: 'source-rate',
        description: 'Rate source quality on A-E scale',
        inputSchema: {
          type: 'object',
          properties: {
            source_url: { type: 'string', description: 'Source URL' },
            source_type: {
              type: 'string',
              enum: ['academic', 'industry', 'news', 'blog', 'official'],
              description: 'Type of source'
            },
            metadata: { type: 'object', description: 'Source metadata' },
          },
          required: ['source_url'],
        },
      },
      {
        name: 'conflict-detect',
        description: 'Detect conflicts between facts',
        inputSchema: {
          type: 'object',
          properties: {
            facts: { type: 'array', description: 'Array of facts to compare' },
            tolerance: { type: 'object', description: 'Conflict tolerance settings' },
          },
          required: ['facts'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'fact-extract':
        return await factExtract(args);

      case 'entity-extract':
        return await entityExtract(args);

      case 'citation-validate':
        return await citationValidate(args);

      case 'source-rate':
        return await sourceRate(args);

      case 'conflict-detect':
        return await conflictDetect(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Deep Research MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
