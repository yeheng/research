/**
 * SimHash Implementation for Document Deduplication
 * Detects near-duplicate content using locality-sensitive hashing
 */

import * as crypto from 'crypto';

export class SimHash {
  private hashBits: number;

  constructor(hashBits: number = 64) {
    this.hashBits = hashBits;
  }

  private tokenize(text: string): string[] {
    const normalized = text.toLowerCase();
    const tokens = normalized.match(/\w+/g) || [];
    return tokens;
  }

  private hashToken(token: string): bigint {
    const hash = crypto.createHash('md5').update(token).digest('hex');
    return BigInt('0x' + hash);
  }

  public compute(text: string): bigint {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) return BigInt(0);

    const v = new Array(this.hashBits).fill(0);

    for (const token of tokens) {
      const tokenHash = this.hashToken(token);
      for (let i = 0; i < this.hashBits; i++) {
        if ((tokenHash & (BigInt(1) << BigInt(i))) !== BigInt(0)) {
          v[i] += 1;
        } else {
          v[i] -= 1;
        }
      }
    }

    let fingerprint = BigInt(0);
    for (let i = 0; i < this.hashBits; i++) {
      if (v[i] > 0) {
        fingerprint |= BigInt(1) << BigInt(i);
      }
    }

    return fingerprint;
  }

  public hammingDistance(hash1: bigint, hash2: bigint): number {
    let x = hash1 ^ hash2;
    let distance = 0;
    while (x !== BigInt(0)) {
      distance++;
      x &= x - BigInt(1);
    }
    return distance;
  }
}

export class DuplicationDetector {
  private threshold: number;
  private simhash: SimHash;
  private fingerprints: Map<string, bigint>;

  constructor(threshold: number = 3) {
    this.threshold = threshold;
    this.simhash = new SimHash();
    this.fingerprints = new Map();
  }

  public addDocument(docId: string, text: string): boolean {
    const fingerprint = this.simhash.compute(text);

    for (const [, existingFingerprint] of this.fingerprints) {
      const distance = this.simhash.hammingDistance(fingerprint, existingFingerprint);
      if (distance <= this.threshold) {
        return false;
      }
    }

    this.fingerprints.set(docId, fingerprint);
    return true;
  }

  public isDuplicate(text: string): { isDuplicate: boolean; originalId?: string } {
    const fingerprint = this.simhash.compute(text);

    for (const [docId, existingFingerprint] of this.fingerprints) {
      const distance = this.simhash.hammingDistance(fingerprint, existingFingerprint);
      if (distance <= this.threshold) {
        return { isDuplicate: true, originalId: docId };
      }
    }

    return { isDuplicate: false };
  }
}
