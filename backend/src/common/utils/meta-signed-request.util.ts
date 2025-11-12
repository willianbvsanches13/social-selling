import { createHmac, timingSafeEqual } from 'crypto';
import { UnauthorizedException, Logger } from '@nestjs/common';

export interface SignedRequestPayload {
  algorithm: string;
  issued_at: number;
  user_id?: string;
  [key: string]: any;
}

export interface ParsedSignedRequest {
  signature: Buffer;
  payload: SignedRequestPayload;
  rawPayload: string;
}

export class MetaSignedRequestUtil {
  private static readonly logger = new Logger(MetaSignedRequestUtil.name);
  private static readonly ALGORITHM = 'HMAC-SHA256';
  private static readonly MAX_TIMESTAMP_DIFF_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Validates a Meta signed request using HMAC-SHA256
   * Format: base64url(signature).base64url(payload)
   */
  static validateSignedRequest(
    signedRequest: string,
    appSecret: string,
  ): SignedRequestPayload {
    try {
      const parsed = this.parseSignedRequest(signedRequest);
      this.verifySignature(parsed, appSecret);
      this.validateTimestamp(parsed.payload);
      return parsed.payload;
    } catch (error) {
      this.logger.error('Failed to validate signed request:', error);
      throw new UnauthorizedException('Invalid signed request');
    }
  }

  /**
   * Parses a signed request into signature and payload components
   */
  static parseSignedRequest(signedRequest: string): ParsedSignedRequest {
    if (!signedRequest || typeof signedRequest !== 'string') {
      throw new Error('Signed request must be a non-empty string');
    }
    const parts = signedRequest.split('.');
    if (parts.length !== 2) {
      throw new Error('Invalid signed request format');
    }
    const [encodedSignature, encodedPayload] = parts;
    if (!encodedSignature || !encodedPayload) {
      throw new Error('Signature or payload is empty');
    }
    const signature = this.base64UrlDecodeToBuffer(encodedSignature);
    const rawPayload = this.base64UrlDecode(encodedPayload);
    let payload: SignedRequestPayload;
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      throw new Error('Failed to parse payload JSON');
    }
    if (!payload.algorithm) {
      throw new Error('Missing algorithm in payload');
    }
    if (payload.algorithm.toUpperCase() !== this.ALGORITHM) {
      throw new Error(
        `Unsupported algorithm: ${payload.algorithm}. Expected ${this.ALGORITHM}`,
      );
    }
    if (typeof payload.issued_at !== 'number') {
      throw new Error('Missing or invalid issued_at in payload');
    }
    return {
      signature,
      payload,
      rawPayload,
    };
  }

  /**
   * Validates that the timestamp is within acceptable range
   */
  static isTimestampValid(timestamp: number): boolean {
    if (typeof timestamp !== 'number' || timestamp <= 0) {
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.abs(now - timestamp);
    const maxDiffSeconds = this.MAX_TIMESTAMP_DIFF_MS / 1000;
    return diff <= maxDiffSeconds;
  }

  /**
   * Decodes a base64url encoded string
   */
  private static base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    if (padding > 0) {
      base64 += '='.repeat(4 - padding);
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  /**
   * Decodes a base64url encoded string to Buffer
   */
  private static base64UrlDecodeToBuffer(input: string): Buffer {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const padding = base64.length % 4;
    if (padding > 0) {
      base64 += '='.repeat(4 - padding);
    }
    return Buffer.from(base64, 'base64');
  }

  /**
   * Verifies the HMAC-SHA256 signature
   */
  private static verifySignature(
    parsed: ParsedSignedRequest,
    appSecret: string,
  ): void {
    if (!appSecret || typeof appSecret !== 'string') {
      throw new Error('App secret must be a non-empty string');
    }
    const expectedSignature = createHmac('sha256', appSecret)
      .update(parsed.rawPayload)
      .digest();
    if (expectedSignature.length !== parsed.signature.length) {
      throw new Error('Signature length mismatch');
    }
    if (!timingSafeEqual(expectedSignature, parsed.signature)) {
      throw new Error('Signature verification failed');
    }
  }

  /**
   * Validates the timestamp in the payload
   */
  private static validateTimestamp(payload: SignedRequestPayload): void {
    if (!this.isTimestampValid(payload.issued_at)) {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.abs(now - payload.issued_at);
      throw new Error(
        `Timestamp out of valid range. Difference: ${diff} seconds`,
      );
    }
  }
}
