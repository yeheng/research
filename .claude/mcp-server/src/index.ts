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
 *
 * Batch processing tools (Phase 3B):
 * - batch-fact-extract: Process multiple texts in parallel
 * - batch-entity-extract: Extract from multiple texts
 * - batch-citation-validate: Validate multiple citations
 * - batch-source-rate: Rate multiple sources
 * - batch-conflict-detect: Detect conflicts in batches
 *
 * Cache management:
 * - cache-stats: Get cache statistics
 * - cache-clear: Clear all caches
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

// Batch tools
import {
  batchFactExtract,
  batchEntityExtract,
  batchCitationValidate,
  batchSourceRate,
  batchConflictDetect,
  getCacheStats,
  clearAllCaches,
} from './tools/batch-tools.js';

// State management tools
import {
  stateTools,
  createSessionHandler,
  updateSessionStatusHandler,
  getSessionInfoHandler,
} from './tools/state-tools.js';

// Agent management tools
import {
  agentTools,
  registerAgentHandler,
  updateAgentStatusHandler,
  getActiveAgentsHandler,
} from './tools/agent-tools.js';

// Phase tracking tools
import {
  phaseTools,
  updateCurrentPhaseHandler,
  getCurrentPhaseHandler,
  checkpointPhaseHandler,
} from './tools/phase-tools.js';

// Logging tools
import { loggingTools, logActivityHandler } from './tools/activity-logger.js';
import { renderingTools, renderProgressHandler } from './tools/progress-renderer.js';

// Create server instance
const server = new Server(
  {
    name: 'deep-research-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Batch input schema (shared)
const batchInputSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      description: 'Array of items to process',
    },
    options: {
      type: 'object',
      properties: {
        maxConcurrency: {
          type: 'number',
          description: 'Maximum parallel operations (default: 5)',
        },
        useCache: {
          type: 'boolean',
          description: 'Use caching to skip duplicates (default: true)',
        },
        stopOnError: {
          type: 'boolean',
          description: 'Stop on first error (default: false)',
        },
      },
    },
  },
  required: ['items'],
};

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // === Core Tools ===
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
      // === Batch Processing Tools ===
      {
        name: 'batch-fact-extract',
        description: 'Process multiple texts for fact extraction in parallel with caching',
        inputSchema: batchInputSchema,
      },
      {
        name: 'batch-entity-extract',
        description: 'Extract entities from multiple texts in parallel with caching',
        inputSchema: batchInputSchema,
      },
      {
        name: 'batch-citation-validate',
        description: 'Validate multiple citations in parallel with caching',
        inputSchema: batchInputSchema,
      },
      {
        name: 'batch-source-rate',
        description: 'Rate multiple sources in parallel with caching',
        inputSchema: batchInputSchema,
      },
      {
        name: 'batch-conflict-detect',
        description: 'Detect conflicts in multiple fact sets in parallel',
        inputSchema: batchInputSchema,
      },
      // === State Management Tools ===
      ...stateTools,
      ...agentTools,
      ...phaseTools,
      // === Logging Tools ===
      ...loggingTools,
      ...renderingTools,
      // === Cache Management Tools ===
      {
        name: 'cache-stats',
        description: 'Get cache statistics (hits, misses, hit rate) for all tool caches',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'cache-clear',
        description: 'Clear all tool caches',
        inputSchema: {
          type: 'object',
          properties: {},
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
      // Core tools
      case 'fact-extract':
        return await factExtract(args as any);

      case 'entity-extract':
        return await entityExtract(args as any);

      case 'citation-validate':
        return await citationValidate(args as any);

      case 'source-rate':
        return await sourceRate(args as any);

      case 'conflict-detect':
        return await conflictDetect(args as any);

      // Batch tools
      case 'batch-fact-extract':
        return await batchFactExtract(args as any);

      case 'batch-entity-extract':
        return await batchEntityExtract(args as any);

      case 'batch-citation-validate':
        return await batchCitationValidate(args as any);

      case 'batch-source-rate':
        return await batchSourceRate(args as any);

      case 'batch-conflict-detect':
        return await batchConflictDetect(args as any);

      // State management tools
      case 'create_research_session':
        return {
          content: [{ type: 'text', text: JSON.stringify(createSessionHandler(args), null, 2) }]
        };

      case 'update_session_status':
        return {
          content: [{ type: 'text', text: JSON.stringify(updateSessionStatusHandler(args), null, 2) }]
        };

      case 'get_session_info':
        return {
          content: [{ type: 'text', text: JSON.stringify(getSessionInfoHandler(args), null, 2) }]
        };

      // Agent management tools
      case 'register_agent':
        return {
          content: [{ type: 'text', text: JSON.stringify(registerAgentHandler(args), null, 2) }]
        };

      case 'update_agent_status':
        return {
          content: [{ type: 'text', text: JSON.stringify(updateAgentStatusHandler(args), null, 2) }]
        };

      case 'get_active_agents':
        return {
          content: [{ type: 'text', text: JSON.stringify(getActiveAgentsHandler(args), null, 2) }]
        };

      // Phase tracking tools
      case 'update_current_phase':
        return {
          content: [{ type: 'text', text: JSON.stringify(updateCurrentPhaseHandler(args), null, 2) }]
        };

      case 'get_current_phase':
        return {
          content: [{ type: 'text', text: JSON.stringify(getCurrentPhaseHandler(args), null, 2) }]
        };

      case 'checkpoint_phase':
        return {
          content: [{ type: 'text', text: JSON.stringify(checkpointPhaseHandler(args), null, 2) }]
        };

      // Logging tools
      case 'log_activity':
        return {
          content: [{ type: 'text', text: JSON.stringify(await logActivityHandler(args), null, 2) }]
        };

      case 'render_progress':
        return {
          content: [{ type: 'text', text: JSON.stringify(renderProgressHandler(args), null, 2) }]
        };

      // Cache management
      case 'cache-stats':
        return await getCacheStats();

      case 'cache-clear':
        return await clearAllCaches();

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
  console.error('Deep Research MCP Server v2.0.0 running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
