/**
 * Resilience Handler
 * Implements retry logic, fallback mechanisms, and timeout control
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export class ResilienceHandler {
  /**
   * Retry with exponential backoff
   */
  public async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelayMs = 1000,
      maxDelayMs = 10000,
      backoffMultiplier = 2
    } = options;

    let lastError: Error | undefined;
    let delayMs = initialDelayMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          await this.sleep(delayMs);
          delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} retries: ${lastError?.message}`);
  }

  /**
   * Execute with timeout
   */
  public async withTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      this.createTimeoutPromise<T>(timeoutMs)
    ]);
  }

  /**
   * Fetch with fallback to Wayback Machine
   */
  public async fetchWithFallback(url: string): Promise<string> {
    try {
      // Try direct fetch first
      const response = await fetch(url);
      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`Direct fetch failed for ${url}, trying Wayback Machine...`);
    }

    // Fallback to Wayback Machine
    const waybackUrl = `https://web.archive.org/web/${url}`;
    const response = await fetch(waybackUrl);
    return await response.text();
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Helper: Create timeout promise
   */
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
    });
  }
}
