/**
 * Graph of Thoughts (GoT) Tools (v4.0)
 *
 * Complete tool set for Graph of Thoughts operations:
 * - generate_paths: Generate k parallel research paths
 * - refine_path: Refine an existing path with deeper exploration (NEW)
 * - score_and_prune: Score paths and keep top N
 * - aggregate_paths: Merge multiple paths into synthesis
 * - export_state: Export graph state to JSON (NEW)
 * - import_state: Import graph state from JSON (NEW)
 * - export_visualization: Export graph for visualization (NEW)
 */

import { GraphController } from '../logic/graph-controller.js';

// Tool definitions
export const gotTools = [
  {
    name: 'generate_paths',
    description: 'Generate k parallel research paths using Graph of Thoughts',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID for state persistence (optional, generates new if not provided)'
        },
        query: {
          type: 'string',
          description: 'Research query or topic'
        },
        k: {
          type: 'number',
          description: 'Number of paths to generate (default: 3)'
        },
        strategy: {
          type: 'string',
          enum: ['diverse', 'focused', 'exploratory', 'orthogonal'],
          description: 'Path generation strategy (default: diverse)'
        },
        max_depth: {
          type: 'number',
          description: 'Maximum refinement depth (default: 5)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'refine_path',
    description: 'Refine an existing research path with deeper exploration or feedback (NEW)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID containing the path'
        },
        path_id: {
          type: 'string',
          description: 'ID of the path to refine'
        },
        feedback: {
          type: 'string',
          description: 'Optional feedback to guide refinement (e.g., "focus on performance aspects")'
        },
        depth: {
          type: 'number',
          description: 'How many levels deeper to explore (default: 1)'
        }
      },
      required: ['path_id']
    }
  },
  {
    name: 'score_and_prune',
    description: 'Score research paths and keep top N best paths',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID containing the paths'
        },
        paths: {
          type: 'array',
          description: 'Array of research paths to score (use session_id instead to load from DB)'
        },
        keepN: {
          type: 'number',
          description: 'Number of top paths to keep (default: 3)'
        },
        scoring_criteria: {
          type: 'object',
          description: 'Optional scoring criteria weights',
          properties: {
            citation_quality: { type: 'number' },
            completeness: { type: 'number' },
            relevance: { type: 'number' }
          }
        }
      },
      required: ['keepN']
    }
  },
  {
    name: 'aggregate_paths',
    description: 'Aggregate multiple research paths into a synthesis',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID containing the paths'
        },
        paths: {
          type: 'array',
          description: 'Array of research paths to aggregate'
        },
        strategy: {
          type: 'string',
          enum: ['synthesis', 'voting', 'consensus', 'thematic', 'chronological'],
          description: 'Aggregation strategy (default: synthesis)'
        }
      },
      required: []
    }
  },
  {
    name: 'export_state',
    description: 'Export graph state to JSON for backup or analysis (NEW)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to export'
        },
        file_path: {
          type: 'string',
          description: 'Optional file path to save export (if not provided, returns JSON)'
        }
      },
      required: ['session_id']
    }
  },
  {
    name: 'import_state',
    description: 'Import graph state from JSON to restore session (NEW)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Target session ID (if different from imported)'
        },
        json_data: {
          type: 'string',
          description: 'JSON data to import (use file_path instead)'
        },
        file_path: {
          type: 'string',
          description: 'Path to JSON file to import'
        }
      },
      required: []
    }
  },
  {
    name: 'export_visualization',
    description: 'Export graph for visualization (supports DOT format for GraphViz) (NEW)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to visualize'
        },
        format: {
          type: 'string',
          enum: ['json', 'dot'],
          description: 'Output format (default: json)'
        },
        file_path: {
          type: 'string',
          description: 'Optional file path to save visualization'
        }
      },
      required: ['session_id']
    }
  },
  {
    name: 'get_graph_state',
    description: 'Get current graph state including paths, history, and statistics',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Session ID to query'
        }
      },
      required: ['session_id']
    }
  }
];

// ============================================================================
// Handler Functions
// ============================================================================

/**
 * Generate paths handler
 */
export async function generatePathsHandler(args: any) {
  const {
    session_id,
    query,
    k = 3,
    strategy = 'diverse',
    max_depth = 5
  } = args;

  const controller = new GraphController(session_id);

  const paths = await controller.generatePaths(query, {
    k,
    strategy,
    maxDepth: max_depth
  });

  return {
    success: true,
    session_id: controller.getSessionId(),
    paths,
    count: paths.length
  };
}

/**
 * Refine path handler (NEW)
 */
export async function refinePathHandler(args: any) {
  const {
    session_id,
    path_id,
    feedback,
    depth = 1
  } = args;

  const controller = new GraphController(session_id);

  const refinedPath = await controller.refinePath(path_id, feedback, depth);

  return {
    success: true,
    path: refinedPath,
    session_id: controller.getSessionId()
  };
}

/**
 * Score and prune handler
 */
export async function scoreAndPruneHandler(args: any) {
  const {
    session_id,
    paths,
    keepN = 3,
    scoring_criteria
  } = args;

  const controller = new GraphController(session_id);

  // Load paths from session if not provided
  let pathsToScore = paths;
  if (!pathsToScore && session_id) {
    pathsToScore = controller.getPaths();
  }

  if (!pathsToScore || pathsToScore.length === 0) {
    throw new Error('No paths to score. Provide paths array or ensure session has paths.');
  }

  const scoredPaths = await controller.scoreAndPrune(pathsToScore, keepN, { scoring_criteria });

  return {
    success: true,
    results: scoredPaths,
    kept_count: scoredPaths.filter(p => p.kept).length,
    pruned_count: scoredPaths.filter(p => !p.kept).length
  };
}

/**
 * Aggregate paths handler
 */
export async function aggregatePathsHandler(args: any) {
  const {
    session_id,
    paths,
    strategy = 'synthesis'
  } = args;

  const controller = new GraphController(session_id);

  // Load paths from session if not provided
  let pathsToAggregate = paths;
  if (!pathsToAggregate && session_id) {
    pathsToAggregate = controller.getPaths();
  }

  if (!pathsToAggregate || pathsToAggregate.length === 0) {
    throw new Error('No paths to aggregate. Provide paths array or ensure session has paths.');
  }

  const result = await controller.aggregatePaths(pathsToAggregate, strategy);

  return {
    success: true,
    synthesis: result.synthesizedContent,
    confidence: result.confidence,
    sources: result.sources,
    conflicts: result.conflicts,
    fact_count: result.fact_count
  };
}

/**
 * Export state handler (NEW)
 */
export async function exportStateHandler(args: any) {
  const { session_id, file_path } = args;

  const controller = new GraphController(session_id);

  if (file_path) {
    controller.exportToFile(file_path);
    return {
      success: true,
      message: `State exported to ${file_path}`,
      file_path
    };
  }

  const json = controller.exportState();
  return {
    success: true,
    state: JSON.parse(json),
    json: json
  };
}

/**
 * Import state handler (NEW)
 */
export async function importStateHandler(args: any) {
  const { session_id, json_data, file_path } = args;

  const controller = new GraphController(session_id);

  if (file_path) {
    controller.importFromFile(file_path);
  } else if (json_data) {
    controller.importState(json_data);
  } else {
    throw new Error('Either json_data or file_path must be provided');
  }

  return {
    success: true,
    session_id: controller.getSessionId(),
    paths_count: controller.getPaths().length,
    message: 'State imported successfully'
  };
}

/**
 * Export visualization handler (NEW)
 */
export async function exportVisualizationHandler(args: any): Promise<{ success: boolean; format: string; file_path?: string; message?: string; visualization?: any }> {
  const { session_id, format = 'json', file_path } = args;

  const controller = new GraphController(session_id);

  if (format === 'dot') {
    const dotFile = file_path || `graph_${session_id}.dot`;
    controller.exportVisualizationToDot(dotFile);
    return {
      success: true,
      format: 'dot',
      file_path: dotFile,
      message: `GraphViz DOT file exported to ${dotFile}`
    };
  }

  const viz = controller.exportVisualization();

  if (file_path) {
    const fs = require('fs');
    fs.writeFileSync(file_path, JSON.stringify(viz, null, 2), 'utf-8');
    return {
      success: true,
      format: 'json',
      file_path,
      message: `Visualization exported to ${file_path}`
    };
  }

  return {
    success: true,
    format: 'json',
    visualization: viz
  };
}

/**
 * Get graph state handler
 */
export async function getGraphStateHandler(args: any) {
  const { session_id } = args;

  const controller = new GraphController(session_id);
  const state = controller.getGraphState();

  return {
    success: true,
    state
  };
}
