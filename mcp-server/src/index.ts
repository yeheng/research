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
import { conflictDetect } from './tools/conflict-detect.js';
import { extract } from './tools/extract.js';
import { validate } from './tools/validate.js';
import { processSources } from './tools/process-sources.js';

// Batch tools
import {
  batchConflictDetect,
  batchExtract,
  batchValidate,
  clearAllCaches,
  getCacheStats,
} from './tools/batch-tools.js';

// State management tools
import {
  createSessionHandler,
  getSessionInfoHandler,
  stateTools,
  updateSessionStatusHandler,
} from './tools/state-tools.js';

// Agent management tools
import {
  agentTools,
  getActiveAgentsHandler,
  registerAgentHandler,
  updateAgentStatusHandler,
} from './tools/agent-tools.js';

// Logging tools
import { logActivityHandler, loggingTools } from './tools/activity-logger.js';
import { renderingTools, renderProgressHandler } from './tools/progress-renderer.js';

// GoT tools
import {
  aggregatePathsHandler,
  exportStateHandler,
  exportVisualizationHandler,
  generatePathsHandler,
  getGraphStateHandler,
  gotTools,
  importStateHandler,
  refinePathHandler,
  scoreAndPruneHandler
} from './tools/got-tools.js';

// Auto-process data tool
import {
  autoProcessDataHandler,
  autoProcessDataTool,
  AutoProcessInput
} from './tools/auto-process-data.js';

// State machine tools (v4.0)
import {
  getNextActionHandler,
  stateMachineTools
} from './tools/state-machine-tools.js';

// Data ingestion tools (v4.0)
import {
  dataIngestionTools,
  ingestDataHandler
} from './tools/data-ingestion.js';

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
      {
        name: 'process_sources',
        description: 'High-level tool to process multiple sources with combined operations (extract facts, entities, validate citations, rate quality)',
        inputSchema: {
          type: 'object',
          properties: {
            sources: {
              type: 'array',
              description: 'Array of source documents to process',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string', description: 'Source URL' },
                  content: { type: 'string', description: 'Source content text' },
                  type: {
                    type: 'string',
                    enum: ['academic', 'industry', 'news', 'blog', 'official'],
                    description: 'Type of source'
                  },
                  metadata: { type: 'object', description: 'Additional metadata' }
                },
                required: ['url', 'content', 'type']
              }
            },
            operations: {
              type: 'array',
              description: 'Operations to perform',
              items: {
                type: 'string',
                enum: ['extract_facts', 'extract_entities', 'validate_citations', 'rate_quality']
              }
            },
            options: {
              type: 'object',
              properties: {
                batchSize: { type: 'number', description: 'Batch size for processing' },
                parallel: { type: 'boolean', description: 'Process in parallel (default: true)' }
              }
            }
          },
          required: ['sources', 'operations'],
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

      // === GoT Tools ===
      ...gotTools,

      // === State Machine Tools (v4.0) ===
      ...stateMachineTools,

      // === Data Ingestion Tools (v4.0) ===
      ...dataIngestionTools,

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

      case 'process_sources':
        return {
          content: [{ type: 'text', text: JSON.stringify(await processSources(args as any), null, 2) }],
        };

      // === NEW Unified Batch Tools ===
      case 'batch-extract':
        return await batchExtract(args as any);

      case 'batch-validate':
        return await batchValidate(args as any);

      case 'batch-conflict-detect':
        return await batchConflictDetect(args as any);

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

      case 'refine_path':
        return {
          content: [{ type: 'text', text: JSON.stringify(await refinePathHandler(args), null, 2) }],
        };

      case 'score_and_prune':
        return {
          content: [{ type: 'text', text: JSON.stringify(await scoreAndPruneHandler(args), null, 2) }],
        };

      case 'aggregate_paths':
        return {
          content: [{ type: 'text', text: JSON.stringify(await aggregatePathsHandler(args), null, 2) }],
        };

      case 'export_state':
        return {
          content: [{ type: 'text', text: JSON.stringify(await exportStateHandler(args), null, 2) }],
        };

      case 'import_state':
        return {
          content: [{ type: 'text', text: JSON.stringify(await importStateHandler(args), null, 2) }],
        };

      case 'export_visualization':
        return {
          content: [{ type: 'text', text: JSON.stringify(await exportVisualizationHandler(args), null, 2) }],
        };

      case 'get_graph_state':
        return {
          content: [{ type: 'text', text: JSON.stringify(await getGraphStateHandler(args), null, 2) }],
        };

      // === State Machine Tools (v4.0) ===
      case 'get_next_action':
        return {
          content: [{ type: 'text', text: JSON.stringify(getNextActionHandler(args), null, 2) }],
        };

      // === Data Ingestion Tools (v4.0) ===
      case 'ingest_data':
        return {
          content: [{ type: 'text', text: JSON.stringify(await ingestDataHandler(args), null, 2) }],
        };

      // === Auto-Process Data Tool (v3.1) ===
      case 'auto_process_data':
        return {
          content: [{ type: 'text', text: JSON.stringify(await autoProcessDataHandler(args as unknown as AutoProcessInput), null, 2) }],
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
  console.error('Deep Research MCP Server v4.0 running on stdio');
  console.error('Tools: 6 unified + 10 legacy aliases + 9 state + 4 utils + 8 GoT = 33 registered (20 unique)');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
