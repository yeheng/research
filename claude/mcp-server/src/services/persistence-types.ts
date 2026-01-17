/**
 * Incremental Persistence Types
 */

export interface PhaseOutput {
  phase: number;
  phaseName: string;
  content: any;
  timestamp: string;
  filePath?: string;
}

export interface PersistenceOptions {
  outputDir: string;
  atomic?: boolean;
  backup?: boolean;
}
