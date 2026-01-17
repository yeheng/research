/**
 * Data Ingestion Tools (v4.0)
 *
 * Real-time data ingestion for streaming data processing.
 * Workers push data as they collect it, avoiding batch processing timeouts.
 */

import { getDB } from '../state/db.js';
import fs from 'fs';
import path from 'path';

// Tool definitions
export const dataIngestionTools = [
  {
    name: 'ingest_data',
    description: 'Ingest research data in real-time (v4.0 streaming)',
    inputSchema: {
      type: 'object',
      properties: {
        session_id: {
          type: 'string',
          description: 'Research session ID'
        },
        data: {
          type: 'object',
          description: 'Data to ingest (text, url, metadata)'
        },
        data_type: {
          type: 'string',
          enum: ['raw_text', 'web_page', 'document', 'fact', 'entity'],
          description: 'Type of data being ingested'
        },
        source_url: {
          type: 'string',
          description: 'Source URL (optional)'
        }
      },
      required: ['session_id', 'data', 'data_type']
    }
  }
];

/**
 * Ingest data into processing queue
 */
export async function ingestDataHandler(args: any) {
  const { session_id, data, data_type, source_url } = args;
  const db = getDB();

  try {
    // Create data entry with pending status
    const dataId = `data_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stmt = db.prepare(`
      INSERT INTO ingested_data (
        id, session_id, data_type, data, source_url, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      dataId,
      session_id,
      data_type,
      JSON.stringify(data),
      source_url || null,
      'pending'
    );

    return {
      success: true,
      data_id: dataId,
      status: 'pending',
      message: 'Data ingested, queued for processing'
    };
  } catch (error) {
    console.error('Error ingesting data:', error);
    throw error;
  }
}
