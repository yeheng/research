#!/usr/bin/env node

/**
 * Deep Research Framework - MCP Server v2.1
 *
 * Simplified tool structure with unified APIs and backward compatibility.
 *
 * NEW Unified Tools (6):
 * - extract: Unified fact + entity extraction (mode: 'fact' | 'entity' | 'all')
 * - validate: Unified citation + source validation (mode: 'citation' | 'source' | 'all')
 * - conflict-detect: Detect fact conflicts
 * - batch-extract: Batch extraction with mode support
 * - batch-validate: Batch validation with mode support
 * - batch-conflict-detect: Batch conflict detection
 *
 * Legacy Aliases (maintained for backward compatibility):
 * - fact-extract → extract({ mode: 'fact' })
 * - entity-extract → extract({ mode: 'entity' })
 * - citation-validate → validate({ mode: 'citation' })
 * - source-rate → validate({ mode: 'source' })
 * - batch-fact-extract, batch-entity-extract, etc.
 *
 * State Management (9 tools):
 * - create_research_session, update_session_status, get_session_info
 * - register_agent, update_agent_status, get_active_agents
 * - update_current_phase, get_current_phase, checkpoint_phase
 *
 * Logging & Utils (4 tools):
 * - log_activity, render_progress
 * - cache-stats, cache-clear
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Unified tools
import { extract, factExtract, entityExtract } from './tools/extract.js';
import { validate, citationValidate, sourceRate } from './tools/validate.js';
import { conflictDetect } from './tools/conflict-detect.js';

// Batch tools
import {
  batchExtract,
  batchValidate,
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

// GoT tools
import {
  gotTools,
  generatePathsHandler,
  scoreAndPruneHandler,
  aggregatePathsHandler
} from './tools/got-tools.js';

// Auto-process data tool
import {
  autoProcessDataTool,
  autoProcessDataHandler
} from './tools/auto-process-data.js';

// Create server instance
const server = new Server(
  {
    name: 'deep-research-mcp-server',
    version: '2.1.0',
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
    mode: {
      type: 'string',
      description: 'Processing mode (depends on tool)',
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
      // === NEW Unified Tools ===
      {
        name: 'extract',
        description: 'Unified extraction tool for facts and entities. Mode: "fact" for atomic facts, "entity" for named entities, "all" for both.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to analyze' },
            mode: {
              type: 'string',
              enum: ['fact', 'entity', 'all'],
              description: 'Extraction mode (default: all)',
            },
            source_url: { type: 'string', description: 'Source URL for facts' },
            source_metadata: { type: 'object', description: 'Source metadata' },
            entity_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Entity types to extract',
            },
            extract_relations: { type: 'boolean', description: 'Extract relationships (default: true)' },
          },
          required: ['text'],
        },
      },
      {
        name: 'validate',
        description: 'Unified validation tool for citations and sources. Mode: "citation" for completeness check, "source" for quality rating, "all" for both.',
        inputSchema: {
          type: 'object',
          properties: {
            mode: {
              type: 'string',
              enum: ['citation', 'source', 'all'],
              description: 'Validation mode (default: all)',
            },
            citations: { type: 'array', description: 'Array of citations to validate' },
            source_url: { type: 'string', description: 'Source URL to rate' },
            source_type: {
              type: 'string',
              enum: ['academic', 'industry', 'news', 'blog', 'official'],
              description: 'Type of source',
            },
            verify_urls: { type: 'boolean', description: 'Check URL accessibility' },
            check_accuracy: { type: 'boolean', description: 'Verify citation accuracy' },
          },
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
      // === NEW Unified Batch Tools ===
      {
        name: 'batch-extract',
        description: 'Batch extraction with mode support. Mode: "fact", "entity", or "all".',
        inputSchema: {
          ...batchInputSchema,
          properties: {
            ...batchInputSchema.properties,
            mode: {
              type: 'string',
              enum: ['fact', 'entity', 'all'],
              description: 'Extraction mode (default: all)',
            },
          },
        },
      },
      {
        name: 'batch-validate',
        description: 'Batch validation with mode support. Mode: "citation", "source", or "all".',
        inputSchema: {
          ...batchInputSchema,
          properties: {
            ...batchInputSchema.properties,
            mode: {
              type: 'string',
              enum: ['citation', 'source', 'all'],
              description: 'Validation mode (default: all)',
            },
          },
        },
      },
      {
        name: 'batch-conflict-detect',
        description: 'Detect conflicts in multiple fact sets in parallel',
        inputSchema: batchInputSchema,
      },
      // === Legacy Tools (Aliases - maintained for backward compatibility) ===
      {
        name: 'fact-extract',
        description: '[LEGACY] Extract atomic facts from text. Use extract({ mode: "fact" }) instead.',
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
        description: '[LEGACY] Extract named entities. Use extract({ mode: "entity" }) instead.',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to analyze' },
            entity_types: {
              type: 'array',
              items: { type: 'string' },
              description: 'Entity types to extract',
            },
            extract_relations: { type: 'boolean', description: 'Extract relationships' },
          },
          required: ['text'],
        },
      },
      {
        name: 'citation-validate',
        description: '[LEGACY] Validate citations. Use validate({ mode: "citation" }) instead.',
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
        description: '[LEGACY] Rate source quality. Use validate({ mode: "source" }) instead.',
        inputSchema: {
          type: 'object',
          properties: {
            source_url: { type: 'string', description: 'Source URL' },
            source_type: {
              type: 'string',
              enum: ['academic', 'industry', 'news', 'blog', 'official'],
              description: 'Type of source',
            },
            metadata: { type: 'object', description: 'Source metadata' },
          },
          required: ['source_url'],
        },
      },
      // === Legacy Batch Tools ===
      {
        name: 'batch-fact-extract',
        description: '[LEGACY] Process multiple texts for fact extraction. Use batch-extract({ mode: "fact" }) instead.',
        inputSchema: batchInputSchema,
      },
      {
        name: 'batch-entity-extract',
        description: '[LEGACY] Extract entities from multiple texts. Use batch-extract({ mode: "entity" }) instead.',
        inputSchema: batchInputSchema,
      },
      {
        name: 'batch-citation-validate',
        description: '[LEGACY] Validate multiple citations. Use batch-validate({ mode: "citation" }) instead.',
        inputSchema: batchInputSchema,
      },
      {
        name: 'batch-source-rate',
        description: '[LEGACY] Rate multiple sources. Use batch-validate({ mode: "source" }) instead.',
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

      // === State Management Tools ===
      ...stateTools,
      ...agentTools,
      ...phaseTools,
      ...loggingTools,
      ...renderingTools,

      // === GoT Tools ===
      ...gotTools,

      // === Auto-Process Data Tool (v3.1) ===
      autoProcessDataTool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // === NEW Unified Tools ===
      case 'extract':
        return await extract(args as any);

      case 'validate':
        return await validate(args as any);

      case 'conflict-detect':
        return await conflictDetect(args as any);

      // === NEW Unified Batch Tools ===
      case 'batch-extract':
        return await batchExtract(args as any);

      case 'batch-validate':
        return await batchValidate(args as any);

      case 'batch-conflict-detect':
        return await batchConflictDetect(args as any);

      // === Legacy Tools (Aliases) ===
      case 'fact-extract':
        return await factExtract(args as any);

      case 'entity-extract':
        return await entityExtract(args as any);

      case 'citation-validate':
        return await citationValidate(args as any);

      case 'source-rate':
        return await sourceRate(args as any);

      // === Legacy Batch Tools ===
      case 'batch-fact-extract':
        return await batchFactExtract(args as any);

      case 'batch-entity-extract':
        return await batchEntityExtract(args as any);

      case 'batch-citation-validate':
        return await batchCitationValidate(args as any);

      case 'batch-source-rate':
        return await batchSourceRate(args as any);

      // === State Management Tools ===
      case 'create_research_session':
        return {
          content: [{ type: 'text', text: JSON.stringify(createSessionHandler(args), null, 2) }],
        };

      case 'update_session_status':
        return {
          content: [{ type: 'text', text: JSON.stringify(updateSessionStatusHandler(args), null, 2) }],
        };

      case 'get_session_info':
        return {
          content: [{ type: 'text', text: JSON.stringify(getSessionInfoHandler(args), null, 2) }],
        };

      // === Agent Management Tools ===
      case 'register_agent':
        return {
          content: [{ type: 'text', text: JSON.stringify(registerAgentHandler(args), null, 2) }],
        };

      case 'update_agent_status':
        return {
          content: [{ type: 'text', text: JSON.stringify(updateAgentStatusHandler(args), null, 2) }],
        };

      case 'get_active_agents':
        return {
          content: [{ type: 'text', text: JSON.stringify(getActiveAgentsHandler(args), null, 2) }],
        };

      // === Phase Tracking Tools ===
      case 'update_current_phase':
        return {
          content: [{ type: 'text', text: JSON.stringify(updateCurrentPhaseHandler(args), null, 2) }],
        };

      case 'get_current_phase':
        return {
          content: [{ type: 'text', text: JSON.stringify(getCurrentPhaseHandler(args), null, 2) }],
        };

      case 'checkpoint_phase':
        return {
          content: [{ type: 'text', text: JSON.stringify(checkpointPhaseHandler(args), null, 2) }],
        };

      // === Logging Tools ===
      case 'log_activity':
        return {
          content: [{ type: 'text', text: JSON.stringify(await logActivityHandler(args), null, 2) }],
        };

      case 'render_progress':
        return {
          content: [{ type: 'text', text: JSON.stringify(renderProgressHandler(args), null, 2) }],
        };

      // === Cache Management ===
      case 'cache-stats':
        return await getCacheStats();

      case 'cache-clear':
        return await clearAllCaches();

      // === GoT Tools ===
      case 'generate_paths':
        return {
          content: [{ type: 'text', text: JSON.stringify(await generatePathsHandler(args), null, 2) }],
        };

      case 'score_and_prune':
        return {
          content: [{ type: 'text', text: JSON.stringify(await scoreAndPruneHandler(args), null, 2) }],
        };

      case 'aggregate_paths':
        return {
          content: [{ type: 'text', text: JSON.stringify(await aggregatePathsHandler(args), null, 2) }],
        };

      // === Auto-Process Data Tool (v3.1) ===
      case 'auto_process_data':
        return {
          content: [{ type: 'text', text: JSON.stringify(await autoProcessDataHandler(args as AutoProcessInput), null, 2) }],
        };

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
  console.error('Deep Research MCP Server v2.1.0 running on stdio');
  console.error('Tools: 6 unified + 10 legacy aliases + 9 state + 4 utils = 29 registered (12 unique)');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
