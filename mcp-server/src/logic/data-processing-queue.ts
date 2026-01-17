/**
 * Data Processing Queue (v4.0)
 *
 * Background processor that continuously processes ingested data.
 * Runs independently to avoid blocking the main research workflow.
 */

import { getDB } from '../state/db.js';
import { extract } from '../tools/extract.js';
import { validate } from '../tools/validate.js';

export class DataProcessingQueue {
  private isRunning: boolean = false;
  private processingInterval: number = 5000; // 5 seconds

  /**
   * Start the background processing queue
   */
  start() {
    if (this.isRunning) {
      console.log('Data processing queue already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting data processing queue...');
    this.processLoop();
  }

  /**
   * Stop the background processing queue
   */
  stop() {
    this.isRunning = false;
    console.log('Stopping data processing queue...');
  }

  /**
   * Main processing loop
   */
  private async processLoop() {
    while (this.isRunning) {
      try {
        await this.processPendingData();
        await this.sleep(this.processingInterval);
      } catch (error) {
        console.error('Error in processing loop:', error);
        await this.sleep(this.processingInterval);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process pending data from queue
   */
  private async processPendingData() {
    const db = getDB();

    // Get pending items
    const pending = db.prepare(`
      SELECT * FROM ingested_data
      WHERE status = 'pending'
      LIMIT 10
    `).all() as any[];

    if (pending.length === 0) {
      return; // Nothing to process
    }

    console.log(`Processing ${pending.length} pending items...`);

    for (const item of pending) {
      await this.processItem(item);
    }
  }

  /**
   * Process a single data item
   */
  private async processItem(item: any) {
    const db = getDB();

    try {
      // Mark as processing
      db.prepare(`
        UPDATE ingested_data SET status = 'processing' WHERE id = ?
      `).run(item.id);

      const data = JSON.parse(item.data);

      // Process based on type
      switch (item.data_type) {
        case 'raw_text':
        case 'web_page':
          await this.processTextData(item, data);
          break;
        case 'fact':
        case 'entity':
          // Already processed, just mark complete
          break;
      }

      // Mark as completed
      db.prepare(`
        UPDATE ingested_data
        SET status = 'completed', processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(item.id);

    } catch (error) {
      console.error(`Error processing item ${item.id}:`, error);
      db.prepare(`
        UPDATE ingested_data
        SET status = 'failed', error_message = ?
        WHERE id = ?
      `).run(String(error), item.id);
    }
  }

  /**
   * Process text data (extract facts and entities)
   */
  private async processTextData(item: any, data: any) {
    const text = data.text || data.content || '';

    if (!text) return;

    // Extract facts and entities
    const result = await extract({
      text: text,
      mode: 'all',
      source_url: item.source_url
    });

    // Store results (simplified - in production, save to files)
    console.log(`Processed ${item.id}: extracted ${result.facts?.length || 0} facts`);
  }
}

// Singleton instance
let queueInstance: DataProcessingQueue | null = null;

export function getProcessingQueue(): DataProcessingQueue {
  if (!queueInstance) {
    queueInstance = new DataProcessingQueue();
  }
  return queueInstance;
}
