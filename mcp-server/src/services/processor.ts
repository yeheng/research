/**
 * Document Processor Service
 *
 * Migrated from Python's preprocess_document.py
 * Provides HTML cleaning, content extraction, and token estimation
 */

import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import { encoding_for_model } from 'tiktoken';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DocumentMetadata {
  title: string;
  description: string;
  author: string;
  date: string;
}

export interface ProcessingResult {
  status: 'success' | 'failed' | 'duplicate';
  inputPath?: string;
  outputPath?: string | null;
  originalTokens: number;
  cleanedTokens: number;
  savedTokens: number;
  savingsPercent: number;
  docType: 'html' | 'pdf' | 'text';
  contentHash?: string | null;
  error?: string;
  duplicateOf?: string;
}

export interface CleanHtmlOptions {
  preserveTables?: boolean;
  removeAds?: boolean;
  useReadability?: boolean;
}

// ============================================================================
// HTML Cleaning Functions
// ============================================================================

/**
 * Convert HTML table to Markdown format
 */
function convertTableToMarkdown($: cheerio.CheerioAPI, table: any): string {
  const rows = $(table).find('tr');
  if (rows.length === 0) return '';

  const markdownRows: string[] = [];
  let headerProcessed = false;

  rows.each((_, row) => {
    const cells = $(row).find('th, td');
    if (cells.length === 0) return;

    const cellTexts: string[] = [];
    cells.each((_, cell) => {
      let text = $(cell).text().trim().replace(/\|/g, '\\|');
      text = text.replace(/\s+/g, ' ');
      cellTexts.push(text);
    });

    const rowText = '| ' + cellTexts.join(' | ') + ' |';
    markdownRows.push(rowText);

    // Add separator after header row
    if ($(row).find('th').length > 0 || !headerProcessed) {
      const separator = '| ' + Array(cellTexts.length).fill('---').join(' | ') + ' |';
      markdownRows.push(separator);
      headerProcessed = true;
    }
  });

  return markdownRows.join('\n');
}

/**
 * Extract all tables from HTML and convert to Markdown
 */
function extractTables($: cheerio.CheerioAPI): string[] {
  const tables: string[] = [];

  $('table').each((_, table) => {
    const mdTable = convertTableToMarkdown($, table);
    if (mdTable && mdTable.length > 20) {
      tables.push(mdTable);
    }
    $(table).remove();
  });

  return tables;
}

/**
 * Clean HTML content by removing scripts, styles, navigation, ads
 * Preserves tables by converting them to Markdown
 */
export function cleanHtml(rawHtml: string, options: CleanHtmlOptions = {}): string {
  const {
    preserveTables = true,
    removeAds = true,
    useReadability = false,
  } = options;

  // Try Readability first for better content extraction
  if (useReadability) {
    try {
      const dom = new JSDOM(rawHtml);
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (article && article.textContent) {
        return article.textContent;
      }
    } catch (error) {
      // Fall through to cheerio-based cleaning
      console.error('Readability parsing failed:', error);
    }
  }

  // Load HTML with cheerio
  const $ = cheerio.load(rawHtml);

  // Extract tables FIRST before removing other elements
  const extractedTables = preserveTables ? extractTables($) : [];

  // Remove interference elements
  const tagsToRemove = [
    'script', 'style', 'nav', 'footer', 'header', 'aside',
    'iframe', 'noscript', 'form', 'button', 'input', 'select',
    'textarea', 'svg', 'canvas', 'advertisement', 'ad', 'banner',
    'popup', 'modal',
  ];

  tagsToRemove.forEach(tag => {
    $(tag).remove();
  });

  // Remove elements by common ad/nav class names and IDs
  if (removeAds) {
    const adPatterns = [
      'ad', 'ads', 'advertisement', 'banner', 'sidebar',
      'nav', 'navigation', 'menu', 'footer', 'header',
      'popup', 'modal', 'overlay', 'cookie', 'newsletter',
      'social', 'share', 'comment', 'related', 'recommended',
    ];

    adPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'i');
      $(`[class*="${pattern}"], [id*="${pattern}"]`).each((_, elem) => {
        const classAttr = $(elem).attr('class') || '';
        const idAttr = $(elem).attr('id') || '';
        if (regex.test(classAttr) || regex.test(idAttr)) {
          $(elem).remove();
        }
      });
    });
  }

  // Convert to Markdown using Turndown
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // Configure Turndown
  turndownService.keep(['table']); // Keep tables if not already extracted
  turndownService.remove(['script', 'style', 'noscript']);

  let text = turndownService.turndown($.html());

  // Clean whitespace
  const lines = text.split('\n').map(line => line.trim());
  const chunks = lines.flatMap(line => line.split('  ').map(chunk => chunk.trim()));
  text = chunks.filter(chunk => chunk).join('\n');

  // Remove excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  // Append extracted tables at the end
  if (extractedTables.length > 0) {
    text += '\n\n## Extracted Data Tables\n\n';
    text += extractedTables.join('\n\n---\n\n');
  }

  return text.trim();
}

/**
 * Extract metadata from HTML document
 */
export function extractMetadata(html: string): DocumentMetadata {
  const $ = cheerio.load(html);

  const metadata: DocumentMetadata = {
    title: '',
    description: '',
    author: '',
    date: '',
  };

  // Extract title
  const titleTag = $('title').first();
  if (titleTag.length > 0) {
    metadata.title = titleTag.text().trim();
  }

  // Extract meta description
  const descMeta = $('meta[name="description"]').first();
  if (descMeta.length > 0) {
    metadata.description = descMeta.attr('content') || '';
  }

  // Extract author
  const authorMeta = $('meta[name="author"]').first();
  if (authorMeta.length > 0) {
    metadata.author = authorMeta.attr('content') || '';
  }

  // Extract date
  const dateMeta = $('meta[name*="date"], meta[name*="published"]').first();
  if (dateMeta.length > 0) {
    metadata.date = dateMeta.attr('content') || '';
  }

  return metadata;
}

// ============================================================================
// Token Counting Functions
// ============================================================================

let tokenEncoder: ReturnType<typeof encoding_for_model> | null = null;

/**
 * Initialize token encoder (lazy loading)
 */
function getTokenEncoder() {
  if (!tokenEncoder) {
    try {
      tokenEncoder = encoding_for_model('gpt-4');
    } catch (error) {
      console.error('Failed to initialize tiktoken encoder:', error);
      // Fallback to character-based estimation
      return null;
    }
  }
  return tokenEncoder;
}

/**
 * Count tokens in text using tiktoken
 * Falls back to character-based estimation if tiktoken fails
 */
export function countTokens(text: string): number {
  const encoder = getTokenEncoder();

  if (encoder) {
    try {
      const tokens = encoder.encode(text);
      return tokens.length;
    } catch (error) {
      console.error('Token encoding failed:', error);
    }
  }

  // Fallback: rough approximation (1 token ≈ 4 characters for English)
  return Math.floor(text.length / 4);
}

/**
 * Estimate token count (simple character-based approximation)
 */
export function estimateTokens(text: string): number {
  return Math.floor(text.length / 4);
}

// ============================================================================
// Content to Markdown Conversion
// ============================================================================

/**
 * Convert HTML content to clean Markdown
 */
export function contentToMarkdown(html: string, options: CleanHtmlOptions = {}): string {
  return cleanHtml(html, options);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Detect document type from content or file extension
 */
export function detectDocumentType(content: string, filename?: string): 'html' | 'pdf' | 'text' {
  if (filename) {
    const ext = filename.toLowerCase();
    if (ext.endsWith('.html') || ext.endsWith('.htm')) return 'html';
    if (ext.endsWith('.pdf')) return 'pdf';
  }

  // Check content
  if (content.substring(0, 500).toLowerCase().includes('<html')) {
    return 'html';
  }

  if (content.substring(0, 10).includes('%PDF')) {
    return 'pdf';
  }

  return 'text';
}

/**
 * Clean up token encoder resources
 */
export function cleanup() {
  if (tokenEncoder) {
    tokenEncoder.free();
    tokenEncoder = null;
  }
}
