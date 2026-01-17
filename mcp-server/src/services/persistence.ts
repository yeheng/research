/**
 * Incremental Persistence Handler
 * Saves phase outputs immediately after completion
 */

import * as fs from 'fs';
import * as path from 'path';
import { PhaseOutput, PersistenceOptions } from './persistence-types.js';

export class IncrementalPersistence {
  private outputDir: string;

  constructor(options: PersistenceOptions) {
    this.outputDir = options.outputDir;
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  public async savePhaseOutput(output: PhaseOutput): Promise<string> {
    const filename = `phase_${output.phase}_${output.phaseName}.md`;
    const filePath = path.join(this.outputDir, filename);

    const content = typeof output.content === 'string'
      ? output.content
      : JSON.stringify(output.content, null, 2);

    await this.atomicWrite(filePath, content);
    return filePath;
  }

  public async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, content, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  public async appendToFile(filename: string, content: string): Promise<void> {
    const filePath = path.join(this.outputDir, filename);
    fs.appendFileSync(filePath, content, 'utf-8');
  }
}
