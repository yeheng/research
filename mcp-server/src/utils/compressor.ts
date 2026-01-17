/**
 * Content Compressor
 *
 * Automatically compresses content to save tokens:
 * - HTML: Remove tags, keep text
 * - JSON: Remove whitespace, simplify structure
 * - Markdown: Preserve structure, compress content
 * - Text: Sentence-level summarization
 */

// Types
export interface CompressionOptions {
  maxSize?: number;           // Maximum output size in characters
  preserveStructure?: boolean; // Keep document structure
  preserveUrls?: boolean;      // Keep URLs intact
  strategy?: 'auto' | 'html' | 'json' | 'markdown' | 'text';
}

export interface CompressedResult {
  content: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  strategy: string;
  truncated: boolean;
}

/**
 * Content Compressor
 *
 * Intelligent content compression for token efficiency.
 */
export class ContentCompressor {
  private static instance: ContentCompressor;

  static getInstance(): ContentCompressor {
    if (!ContentCompressor.instance) {
      ContentCompressor.instance = new ContentCompressor();
    }
    return ContentCompressor.instance;
  }

  /**
   * Compress content using appropriate strategy
   */
  compress(content: string, options: CompressionOptions = {}): CompressedResult {
    const originalSize = content.length;
    const maxSize = options.maxSize || 5000;

    // If already small enough, return as-is
    if (originalSize <= maxSize && !this.containsHtml(content)) {
      return {
        content,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        strategy: 'none',
        truncated: false
      };
    }

    // Detect content type and select strategy
    const strategy = options.strategy === 'auto' || !options.strategy
      ? this.detectContentType(content)
      : options.strategy;

    let compressed: string;

    try {
      switch (strategy) {
        case 'html':
          compressed = this.compressHtml(content, options);
          break;
        case 'json':
          compressed = this.compressJson(content, options);
          break;
        case 'markdown':
          compressed = this.compressMarkdown(content, options);
          break;
        case 'text':
        default:
          compressed = this.compressText(content, options);
      }
    } catch (error) {
      // On error, fall back to simple truncation
      compressed = this.simpleTruncate(content, maxSize);
    }

    // Final size check
    let truncated = false;
    if (compressed.length > maxSize) {
      compressed = compressed.substring(0, maxSize);
      compressed += '\n\n[Content truncated to save tokens]';
      truncated = true;
    }

    const compressedSize = compressed.length;

    return {
      content: compressed,
      originalSize,
      compressedSize,
      compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
      strategy,
      truncated
    };
  }

  /**
   * Detect content type
   */
  private detectContentType(content: string): string {
    // Check for HTML
    if (this.containsHtml(content)) {
      return 'html';
    }

    // Check for JSON
    if (this.isJson(content)) {
      return 'json';
    }

    // Check for Markdown
    if (this.containsMarkdown(content)) {
      return 'markdown';
    }

    return 'text';
  }

  /**
   * Check if content contains HTML
   */
  private containsHtml(content: string): boolean {
    return /<\/?[a-z][\s\S]*>/i.test(content);
  }

  /**
   * Check if content is valid JSON
   */
  private isJson(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if content contains Markdown
   */
  private containsMarkdown(content: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s/m,        // Headers
      /\[.*?\]\(.*?\)/,    // Links
      /\*\*.*?\*\*/,       // Bold
      /^\s*[-*+]\s/m,      // Lists
      /^\s*\d+\.\s/m,      // Numbered lists
      /```[\s\S]*?```/     // Code blocks
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Compress HTML content
   */
  private compressHtml(content: string, options: CompressionOptions): string {
    // Remove script and style tags
    let cleaned = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');

    // Remove navigation, footer, aside
    cleaned = cleaned.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    cleaned = cleaned.replace(/<footer[\s\S]*?<\/footer>/gi, '');
    cleaned = cleaned.replace(/<aside[\s\S]*?<\/aside>/gi, '');
    cleaned = cleaned.replace(/<header[\s\S]*?<\/header>/gi, '');

    // Extract links if preserving URLs
    const links: string[] = [];
    if (options.preserveUrls) {
      const linkMatches = cleaned.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi);
      for (const match of linkMatches) {
        links.push(`[${this.stripTags(match[2])}](${match[1]})`);
      }
    }

    // Remove all HTML tags
    cleaned = this.stripTags(cleaned);

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove empty lines
    cleaned = cleaned.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // Add preserved links at the end
    if (links.length > 0) {
      cleaned += '\n\n## Links\n' + links.slice(0, 10).join('\n');
    }

    return cleaned;
  }

  /**
   * Strip HTML tags from content
   */
  private stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Compress JSON content
   */
  private compressJson(content: string, options: CompressionOptions): string {
    try {
      const obj = JSON.parse(content);

      // Remove null and undefined values
      const cleaned = this.removeEmptyValues(obj);

      // Stringify without whitespace
      let compressed = JSON.stringify(cleaned);

      // If still too large, truncate arrays
      if (compressed.length > (options.maxSize || 5000)) {
        const truncated = this.truncateArrays(cleaned, 5);
        compressed = JSON.stringify(truncated);
      }

      return compressed;
    } catch {
      return content;
    }
  }

  /**
   * Remove empty values from object
   */
  private removeEmptyValues(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeEmptyValues(item)).filter(item => item != null);
    }

    if (obj && typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value != null && value !== '') {
          cleaned[key] = this.removeEmptyValues(value);
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Truncate arrays in object
   */
  private truncateArrays(obj: any, maxLength: number): any {
    if (Array.isArray(obj)) {
      const truncated = obj.slice(0, maxLength).map(item => this.truncateArrays(item, maxLength));
      if (obj.length > maxLength) {
        truncated.push({ _truncated: `${obj.length - maxLength} more items` });
      }
      return truncated;
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.truncateArrays(value, maxLength);
      }
      return result;
    }

    return obj;
  }

  /**
   * Compress Markdown content
   */
  private compressMarkdown(content: string, options: CompressionOptions): string {
    const lines = content.split('\n');
    const compressed: string[] = [];

    let inCodeBlock = false;
    let codeBlockLines = 0;

    for (const line of lines) {
      // Track code blocks
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          codeBlockLines = 0;
          compressed.push(line);
        } else {
          if (codeBlockLines > 10) {
            compressed.push('# ... code truncated ...');
          }
          compressed.push(line);
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines++;
        if (codeBlockLines <= 10) {
          compressed.push(line);
        }
        continue;
      }

      // Keep headers
      if (/^#{1,6}\s/.test(line)) {
        compressed.push(line);
        continue;
      }

      // Keep list items (summarized)
      if (/^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
        // Truncate long list items
        const truncatedLine = line.length > 100 ? line.substring(0, 100) + '...' : line;
        compressed.push(truncatedLine);
        continue;
      }

      // Keep links
      if (/\[.*?\]\(.*?\)/.test(line)) {
        compressed.push(line);
        continue;
      }

      // Summarize paragraphs
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        // Keep first sentence or first 100 chars
        const firstSentence = trimmed.match(/^[^.!?]+[.!?]/);
        if (firstSentence && firstSentence[0].length < trimmed.length) {
          compressed.push(firstSentence[0]);
        } else if (trimmed.length > 100) {
          compressed.push(trimmed.substring(0, 100) + '...');
        } else {
          compressed.push(trimmed);
        }
      }
    }

    return compressed.join('\n');
  }

  /**
   * Compress plain text
   */
  private compressText(content: string, options: CompressionOptions): string {
    // Split into sentences
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];

    // Take first N sentences
    const maxSentences = Math.min(20, Math.ceil((options.maxSize || 5000) / 200));
    const selected = sentences.slice(0, maxSentences);

    return selected.join(' ').trim();
  }

  /**
   * Simple truncation with ellipsis
   */
  private simpleTruncate(content: string, maxSize: number): string {
    if (content.length <= maxSize) {
      return content;
    }

    // Try to truncate at word boundary
    const truncated = content.substring(0, maxSize - 50);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxSize * 0.8) {
      return truncated.substring(0, lastSpace) + '\n\n[Content truncated]';
    }

    return truncated + '\n\n[Content truncated]';
  }
}

// Export singleton getter
export function getCompressor(): ContentCompressor {
  return ContentCompressor.getInstance();
}

/**
 * Convenience function for quick compression
 */
export function compress(content: string, maxSize: number = 5000): CompressedResult {
  return ContentCompressor.getInstance().compress(content, { maxSize });
}
