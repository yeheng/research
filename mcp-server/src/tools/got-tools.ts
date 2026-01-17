/**
 * Graph of Thoughts (GoT) Tools
 *
 * Tools for managing research paths using GoT operations:
 * - generate_paths: Generate k parallel research paths
 * - score_and_prune: Score paths and keep top N
 * - aggregate_paths: Merge multiple paths into synthesis
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
          enum: ['diverse', 'focused', 'exploratory'],
          description: 'Path generation strategy (default: diverse)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'score_and_prune',
    description: 'Score research paths and keep top N best paths',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          description: 'Array of research paths to score'
        },
        keepN: {
          type: 'number',
          description: 'Number of top paths to keep (default: 3)'
        }
      },
      required: ['paths']
    }
  },
  {
    name: 'aggregate_paths',
    description: 'Aggregate multiple research paths into a synthesis',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          type: 'array',
          description: 'Array of research paths to aggregate'
        }
      },
      required: ['paths']
    }
  }
];

// Handler functions
export async function generatePathsHandler(args: any) {
  const { query, k = 3, strategy = 'diverse' } = args;
  const controller = new GraphController();

  const paths = await controller.generatePaths(query, { k, strategy });

  return {
    success: true,
    paths,
    count: paths.length
  };
}

export async function scoreAndPruneHandler(args: any) {
  const { paths, keepN = 3 } = args;
  const controller = new GraphController();

  const prunedPaths = await controller.scoreAndPrune(paths, keepN);

  return {
    success: true,
    paths: prunedPaths,
    count: prunedPaths.length
  };
}

export async function aggregatePathsHandler(args: any) {
  const { paths } = args;
  const controller = new GraphController();

  const result = await controller.aggregatePaths(paths);

  return {
    success: true,
    synthesis: result.synthesizedContent,
    confidence: result.confidence,
    sources: result.sources,
    conflicts: result.conflicts
  };
}

