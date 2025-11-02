/**
 * Debug script to help identify webhook signature issues
 *
 * This script will be integrated into the webhook controller to log
 * detailed information about incoming webhooks and signature verification.
 */

import * as crypto from 'crypto';

export interface WebhookDebugInfo {
  receivedSignature: string;
  rawBodyLength: number;
  rawBodyPreview: string;
  calculatedSignature: string;
  appSecretPreview: string;
  isValid: boolean;
  possibleIssues: string[];
}

export function debugWebhookSignature(
  signature: string,
  rawBody: Buffer,
  appSecret: string,
): WebhookDebugInfo {
  const possibleIssues: string[] = [];

  // Get signature hash (remove sha256= prefix if present)
  const signatureHash = signature?.replace('sha256=', '') || '';

  // Convert buffer to string
  const rawBodyString = rawBody.toString('utf8');

  // Calculate expected signature
  const calculatedHash = crypto
    .createHmac('sha256', appSecret)
    .update(rawBodyString)
    .digest('hex');

  // Check for common issues
  if (!appSecret) {
    possibleIssues.push('App Secret is empty or not configured');
  }

  if (!signature) {
    possibleIssues.push('x-hub-signature-256 header is missing');
  }

  if (rawBodyString.length === 0) {
    possibleIssues.push('Raw body is empty');
  }

  // Try to validate
  let isValid = false;
  try {
    if (signatureHash && calculatedHash) {
      isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(calculatedHash, 'hex'),
      );
    }
  } catch (error) {
    possibleIssues.push(`Signature comparison failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!isValid && signatureHash && calculatedHash) {
    possibleIssues.push('Calculated signature does not match received signature');
    possibleIssues.push('Possible causes:');
    possibleIssues.push('  1. Wrong App Secret (check Meta App Dashboard > Settings > Basic > App Secret)');
    possibleIssues.push('  2. Request body was modified by proxy/nginx');
    possibleIssues.push('  3. Character encoding mismatch');
    possibleIssues.push('  4. Using wrong webhook endpoint or configuration');
  }

  return {
    receivedSignature: signatureHash,
    rawBodyLength: rawBodyString.length,
    rawBodyPreview: rawBodyString.substring(0, 200),
    calculatedSignature: calculatedHash,
    appSecretPreview: appSecret ? `${appSecret.substring(0, 8)}...` : '(empty)',
    isValid,
    possibleIssues,
  };
}

/**
 * Test signature with different app secrets
 * Useful for testing if the wrong secret is being used
 */
export function testMultipleSecrets(
  signature: string,
  rawBody: Buffer,
  possibleSecrets: string[],
): { secret: string; matches: boolean }[] {
  const signatureHash = signature?.replace('sha256=', '') || '';
  const rawBodyString = rawBody.toString('utf8');

  return possibleSecrets.map(secret => {
    const calculatedHash = crypto
      .createHmac('sha256', secret)
      .update(rawBodyString)
      .digest('hex');

    let matches = false;
    try {
      matches = crypto.timingSafeEqual(
        Buffer.from(signatureHash, 'hex'),
        Buffer.from(calculatedHash, 'hex'),
      );
    } catch {
      matches = false;
    }

    return {
      secret: `${secret.substring(0, 8)}...`,
      matches,
    };
  });
}
