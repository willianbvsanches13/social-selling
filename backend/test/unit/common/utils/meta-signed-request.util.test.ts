import { createHmac } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { MetaSignedRequestUtil } from '../../../../src/common/utils/meta-signed-request.util';

describe('MetaSignedRequestUtil', () => {
  const APP_SECRET = 'test-app-secret-123';

  const createSignedRequest = (
    payload: any,
    secret: string = APP_SECRET,
  ): string => {
    const encodedPayload = Buffer.from(JSON.stringify(payload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    const signature = createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return `${signature}.${encodedPayload}`;
  };

  const createValidPayload = (overrides = {}): any => {
    return {
      algorithm: 'HMAC-SHA256',
      issued_at: Math.floor(Date.now() / 1000),
      user_id: '123456',
      ...overrides,
    };
  };

  describe('validateSignedRequest', () => {
    it('should validate a valid signed request', () => {
      const payload = createValidPayload();
      const signedRequest = createSignedRequest(payload);
      const result = MetaSignedRequestUtil.validateSignedRequest(
        signedRequest,
        APP_SECRET,
      );
      expect(result).toEqual(payload);
    });

    it('should throw UnauthorizedException for invalid signature', () => {
      const payload = createValidPayload();
      const signedRequest = createSignedRequest(payload, 'wrong-secret');
      expect(() =>
        MetaSignedRequestUtil.validateSignedRequest(signedRequest, APP_SECRET),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired timestamp', () => {
      const payload = createValidPayload({
        issued_at: Math.floor(Date.now() / 1000) - 600,
      });
      const signedRequest = createSignedRequest(payload);
      expect(() =>
        MetaSignedRequestUtil.validateSignedRequest(signedRequest, APP_SECRET),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for future timestamp', () => {
      const payload = createValidPayload({
        issued_at: Math.floor(Date.now() / 1000) + 600,
      });
      const signedRequest = createSignedRequest(payload);
      expect(() =>
        MetaSignedRequestUtil.validateSignedRequest(signedRequest, APP_SECRET),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid format', () => {
      expect(() =>
        MetaSignedRequestUtil.validateSignedRequest(
          'invalid-format',
          APP_SECRET,
        ),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for empty string', () => {
      expect(() =>
        MetaSignedRequestUtil.validateSignedRequest('', APP_SECRET),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('parseSignedRequest', () => {
    it('should parse a valid signed request', () => {
      const payload = createValidPayload();
      const signedRequest = createSignedRequest(payload);
      const result = MetaSignedRequestUtil.parseSignedRequest(signedRequest);
      expect(result.payload).toEqual(payload);
      expect(result.signature).toBeDefined();
      expect(result.rawPayload).toBeDefined();
    });

    it('should throw error for invalid format without dot separator', () => {
      expect(() =>
        MetaSignedRequestUtil.parseSignedRequest('invalid'),
      ).toThrow('Invalid signed request format');
    });

    it('should throw error for empty signature', () => {
      expect(() => MetaSignedRequestUtil.parseSignedRequest('.payload')).toThrow(
        'Signature or payload is empty',
      );
    });

    it('should throw error for empty payload', () => {
      expect(() =>
        MetaSignedRequestUtil.parseSignedRequest('signature.'),
      ).toThrow('Signature or payload is empty');
    });

    it('should throw error for invalid JSON payload', () => {
      const invalidPayload = Buffer.from('not-json')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      expect(() =>
        MetaSignedRequestUtil.parseSignedRequest(`signature.${invalidPayload}`),
      ).toThrow('Failed to parse payload JSON');
    });

    it('should throw error for missing algorithm', () => {
      const payload = { issued_at: Math.floor(Date.now() / 1000) };
      const signedRequest = createSignedRequest(payload);
      expect(() =>
        MetaSignedRequestUtil.parseSignedRequest(signedRequest),
      ).toThrow('Missing algorithm in payload');
    });

    it('should throw error for unsupported algorithm', () => {
      const payload = createValidPayload({ algorithm: 'HMAC-SHA1' });
      const signedRequest = createSignedRequest(payload);
      expect(() =>
        MetaSignedRequestUtil.parseSignedRequest(signedRequest),
      ).toThrow('Unsupported algorithm');
    });

    it('should throw error for missing issued_at', () => {
      const payload = { algorithm: 'HMAC-SHA256' };
      const signedRequest = createSignedRequest(payload);
      expect(() =>
        MetaSignedRequestUtil.parseSignedRequest(signedRequest),
      ).toThrow('Missing or invalid issued_at in payload');
    });

    it('should throw error for non-string input', () => {
      expect(() =>
        MetaSignedRequestUtil.parseSignedRequest(null as any),
      ).toThrow('Signed request must be a non-empty string');
    });
  });

  describe('isTimestampValid', () => {
    it('should return true for current timestamp', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      expect(MetaSignedRequestUtil.isTimestampValid(timestamp)).toBe(true);
    });

    it('should return true for timestamp within 5 minutes', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 60;
      expect(MetaSignedRequestUtil.isTimestampValid(timestamp)).toBe(true);
    });

    it('should return false for timestamp older than 5 minutes', () => {
      const timestamp = Math.floor(Date.now() / 1000) - 400;
      expect(MetaSignedRequestUtil.isTimestampValid(timestamp)).toBe(false);
    });

    it('should return false for timestamp more than 5 minutes in future', () => {
      const timestamp = Math.floor(Date.now() / 1000) + 400;
      expect(MetaSignedRequestUtil.isTimestampValid(timestamp)).toBe(false);
    });

    it('should return false for zero timestamp', () => {
      expect(MetaSignedRequestUtil.isTimestampValid(0)).toBe(false);
    });

    it('should return false for negative timestamp', () => {
      expect(MetaSignedRequestUtil.isTimestampValid(-100)).toBe(false);
    });

    it('should return false for non-number input', () => {
      expect(MetaSignedRequestUtil.isTimestampValid('123' as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle payload with additional custom fields', () => {
      const payload = createValidPayload({
        custom_field: 'custom_value',
        another_field: 123,
      });
      const signedRequest = createSignedRequest(payload);
      const result = MetaSignedRequestUtil.validateSignedRequest(
        signedRequest,
        APP_SECRET,
      );
      expect(result.custom_field).toBe('custom_value');
      expect(result.another_field).toBe(123);
    });

    it('should handle case-insensitive algorithm check', () => {
      const payload = createValidPayload({ algorithm: 'hmac-sha256' });
      const signedRequest = createSignedRequest(payload);
      const result = MetaSignedRequestUtil.parseSignedRequest(signedRequest);
      expect(result.payload.algorithm).toBe('hmac-sha256');
    });

    it('should throw error for empty app secret', () => {
      const payload = createValidPayload();
      const signedRequest = createSignedRequest(payload);
      expect(() =>
        MetaSignedRequestUtil.validateSignedRequest(signedRequest, ''),
      ).toThrow(UnauthorizedException);
    });

    it('should handle payload without user_id', () => {
      const payload = {
        algorithm: 'HMAC-SHA256',
        issued_at: Math.floor(Date.now() / 1000),
      };
      const signedRequest = createSignedRequest(payload);
      const result = MetaSignedRequestUtil.validateSignedRequest(
        signedRequest,
        APP_SECRET,
      );
      expect(result.user_id).toBeUndefined();
    });
  });
});
