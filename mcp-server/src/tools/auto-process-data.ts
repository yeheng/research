/**
 * Auto Process Data Tool (v3.1)
 *
 * Server-side batch processing tool for Phase 4.
 * Replaces agent-side processing with deterministic server operations.
 *
 * Operations:
 * - fact_extraction: Extract atomic facts from all raw files
 * - entity_extraction: Extract named entities
 * - citation_validation: Verify citations
 * - conflict_detection: Find contradictions
 *
 * Benefits:
 * - No LLM context window pressure
 * - Deterministic and faster
 * - Agent issues one command instead of iterating files
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';
import { extract } from './extract.js';
import { conflictDetect } from './conflict-detect.js';

export interface AutoProcessInput {
  session_id: string;
  input_dir: string;
  output_dir: string;
  operations?: Array<'fact_extraction' | 'entity_extraction' | 'citation_validation' | 'conflict_detection'>;
  options?: {
    maxConcurrency?: number;
    continueOnError?: boolean;
  };
}

interface ProcessResult {
  operation: string;
  files_processed: number;
  output_file: string;
  stats: {
    total_facts?: number;
    total_entities?: number;
    citations_validated?: number;
    conflicts_found?: number;
  };
  errors: string[];
}

export const autoProcessDataTool = {
  name: 'auto_process_data',
  description: 'Server-side batch processing for Phase 4. Reads raw/ directory, processes all files, writes to processed/ directory.',
  inputSchema: {
    type: 'object',
    properties: {
      session_id: {
        type: 'string',
        description: 'Research session ID'
      },
      input_dir: {
        type: 'string',
        description: 'Path to raw data directory (e.g., RESEARCH/topic/data/raw/)'
      },
      output_dir: {
        type: 'string',
        description: 'Path to processed data directory (e.g., RESEARCH/topic/data/processed/)'
      },
      operations: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['fact_extraction', 'entity_extraction', 'citation_validation', 'conflict_detection']
        },
        description: 'Operations to perform (default: all)'
      },
      options: {
        type: 'object',
        properties: {
          maxConcurrency: {
            type: 'number',
            description: 'Max concurrent file operations (default: 5)'
          },
          continueOnError: {
            type: 'boolean',
            description: 'Continue processing even if some files fail (default: true)'
          }
        }
      }
    },
    required: ['session_id', 'input_dir', 'output_dir']
  }
};

/**
 * Main handler for auto_process_data tool
 */
export async function autoProcessDataHandler(input: AutoProcessInput): Promise<any> {
  const {
    session_id,
    input_dir,
    output_dir,
    operations = ['fact_extraction', 'entity_extraction', 'citation_validation', 'conflict_detection'],
    options = {}
  } = input;

  logger.info('Starting auto_process_data', {
    session_id,
    input_dir,
    output_dir,
    operations,
    options
  });

  // Validate input directory
  const inputPath = path.resolve(input_dir);
  try {
    const stat = await fs.stat(inputPath);
    if (!stat.isDirectory()) {
      throw new ValidationError(`Input path is not a directory: ${input_dir}`);
    }
  } catch (error) {
    throw new ValidationError(`Input directory not accessible: ${input_dir}`);
  }

  // Create output directory
  const outputPath = path.resolve(output_dir);
  await fs.mkdir(outputPath, { recursive: true });

  // Read all markdown files from input directory
  const files = await fs.readdir(inputPath);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  if (mdFiles.length === 0) {
    logger.warn('No markdown files found in input directory', { input_dir });
    return {
      success: true,
      message: 'No files to process',
      results: []
    };
  }

  logger.info('Found files to process', { count: mdFiles.length, files: mdFiles });

  const results: ProcessResult[] = [];
  const allFacts: any[] = [];
  const allEntities: any[] = [];
  const allCitations: any[] = [];
  const skippedOperations: string[] = [];

  // Process each file
  for (const file of mdFiles) {
    const filePath = path.join(inputPath, file);
    logger.info('Processing file', { file });

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Extract facts
      if (operations.includes('fact_extraction')) {
        const factResult = await extract({
          text: content,
          mode: 'fact',
          source_url: `file://${file}`
        });
        const facts = JSON.parse(factResult.content[0].text);
        allFacts.push(...(facts.facts || []));
      }

      // Extract entities
      if (operations.includes('entity_extraction')) {
        const entityResult = await extract({
          text: content,
          mode: 'entity',
          source_url: `file://${file}`
        });
        const entities = JSON.parse(entityResult.content[0].text);
        allEntities.push(...(entities.entities || []));
      }

      // Validate citations
      // NOTE: Citation validation requires citation extraction implementation first.
      // This feature is not yet implemented in v4.0.
      if (operations.includes('citation_validation')) {
        const warningMsg = 'Citation validation not yet implemented - requires citation extraction from text';
        logger.warn(warningMsg, { file });

        // Track skipped operation (only add once)
        if (!skippedOperations.includes('citation_validation')) {
          skippedOperations.push('citation_validation');
        }
      }

    } catch (error) {
      const errorMsg = `Failed to process ${file}: ${error}`;
      logger.error(errorMsg);

      if (!options.continueOnError) {
        throw new Error(errorMsg);
      }
    }
  }

  // Detect conflicts across all facts
  let conflictsFound = 0;
  if (operations.includes('conflict_detection') && allFacts.length > 0) {
    const conflictResult = await conflictDetect({
      facts: allFacts
    });
    const conflicts = JSON.parse(conflictResult.content[0].text);
    conflictsFound = conflicts.conflicts?.length || 0;

    // Save conflict report
    await fs.writeFile(
      path.join(outputPath, 'conflict_report.md'),
      `# Conflict Detection Report\n\n${JSON.stringify(conflicts, null, 2)}`
    );
  }

  // Save fact ledger
  if (operations.includes('fact_extraction')) {
    await fs.writeFile(
      path.join(outputPath, 'fact_ledger.md'),
      `# Fact Ledger\n\nExtracted ${allFacts.length} facts from ${mdFiles.length} files.\n\n## Facts\n\n${JSON.stringify(allFacts, null, 2)}`
    );
  }

  // Save entity graph
  if (operations.includes('entity_extraction')) {
    await fs.writeFile(
      path.join(outputPath, 'entity_graph.md'),
      `# Entity Graph\n\nExtracted ${allEntities.length} entities from ${mdFiles.length} files.\n\n## Entities\n\n${JSON.stringify(allEntities, null, 2)}`
    );
  }

  // Save citation validation report
  if (operations.includes('citation_validation')) {
    await fs.writeFile(
      path.join(outputPath, 'citation_validation.md'),
      `# Citation Validation Report\n\nValidated ${allCitations.length} citations from ${mdFiles.length} files.\n\n## Citations\n\n${JSON.stringify(allCitations, null, 2)}`
    );
  }

  // Compile result
  const summary: ProcessResult = {
    operation: 'auto_process_data',
    files_processed: mdFiles.length,
    output_file: outputPath,
    stats: {
      total_facts: operations.includes('fact_extraction') ? allFacts.length : undefined,
      total_entities: operations.includes('entity_extraction') ? allEntities.length : undefined,
      citations_validated: operations.includes('citation_validation') ? allCitations.length : undefined,
      conflicts_found: operations.includes('conflict_detection') ? conflictsFound : undefined
    },
    errors: []
  };

  results.push(summary);

  logger.info('Auto-process completed', {
    files_processed: mdFiles.length,
    stats: summary.stats
  });

  // Build final response with warnings
  const response: any = {
    success: true,
    session_id,
    results,
    summary: {
      total_files: mdFiles.length,
      operations_completed: operations.filter(op => !skippedOperations.includes(op)),
      operations_skipped: skippedOperations.length > 0 ? skippedOperations : undefined,
      output_directory: outputPath,
      stats: summary.stats
    }
  };

  // Add warnings if any operations were skipped
  if (skippedOperations.length > 0) {
    response.warnings = skippedOperations.map(op => {
      if (op === 'citation_validation') {
        return 'Citation validation is not yet implemented in v4.0 - requires citation extraction from text first';
      }
      return `Operation '${op}' was skipped`;
    });
  }

  return response;
}
