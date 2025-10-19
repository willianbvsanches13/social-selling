import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/cache/redis.service';
import Redis from 'ioredis';

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: Date;
}

@Injectable()
export class InstagramRateLimiter {
  private readonly logger = new Logger(InstagramRateLimiter.name);
  private readonly RATE_LIMIT_PREFIX = 'ig:rate_limit:';
  private redis: Redis;

  // Instagram Graph API rate limits (per access token per hour)
  private readonly DEFAULT_RATE_LIMIT = 200; // calls per hour
  private readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getClient();
  }

  /**
   * Check if request is allowed under rate limit
   */
  async checkRateLimit(accountId: string): Promise<RateLimitInfo> {
    const key = `${this.RATE_LIMIT_PREFIX}${accountId}`;
    const now = Date.now();
    const windowStart = now - this.WINDOW_MS;

    try {
      // Remove old entries outside the time window
      await this.redis.zremrangebyscore(key, '-inf', windowStart.toString());

      // Count requests in current window
      const requestCount = await this.redis.zcard(key);

      const remaining = Math.max(0, this.DEFAULT_RATE_LIMIT - requestCount);
      const resetAt = new Date(now + this.WINDOW_MS);

      return {
        limit: this.DEFAULT_RATE_LIMIT,
        remaining,
        resetAt,
      };
    } catch (error) {
      this.logger.error(`Error checking rate limit for account ${accountId}:`, error);
      // Return permissive limit on error to avoid blocking requests
      return {
        limit: this.DEFAULT_RATE_LIMIT,
        remaining: this.DEFAULT_RATE_LIMIT,
        resetAt: new Date(now + this.WINDOW_MS),
      };
    }
  }

  /**
   * Record an API call
   */
  async recordApiCall(accountId: string): Promise<void> {
    const key = `${this.RATE_LIMIT_PREFIX}${accountId}`;
    const now = Date.now();

    try {
      // Add current request to sorted set with timestamp as score
      // Use random suffix to ensure uniqueness
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiration to clean up old data (1 hour + buffer)
      await this.redis.expire(key, Math.ceil(this.WINDOW_MS / 1000) + 300);
    } catch (error) {
      this.logger.error(`Error recording API call for account ${accountId}:`, error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Check if we should wait before making request
   */
  async shouldWait(accountId: string): Promise<number> {
    const rateLimit = await this.checkRateLimit(accountId);

    if (rateLimit.remaining === 0) {
      const waitMs = rateLimit.resetAt.getTime() - Date.now();
      return Math.max(0, waitMs);
    }

    return 0;
  }

  /**
   * Update rate limit info from API response headers
   */
  async updateFromHeaders(
    accountId: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<void> {
    try {
      const usage = headers['x-app-usage'] || headers['x-business-use-case-usage'];

      if (!usage) {
        return;
      }

      const usageStr = Array.isArray(usage) ? usage[0] : usage;
      const usageData = JSON.parse(usageStr);

      // Instagram returns usage as percentage
      const callCount = usageData.call_count || 0;
      const totalCputime = usageData.total_cputime || 0;
      const totalTime = usageData.total_time || 0;

      this.logger.debug(
        `Rate limit usage for account ${accountId}: calls=${callCount}%, cpu=${totalCputime}%, time=${totalTime}%`,
      );

      // Store usage info for monitoring
      const key = `${this.RATE_LIMIT_PREFIX}${accountId}:usage`;
      await this.redis.setex(
        key,
        60 * 60, // 1 hour
        JSON.stringify({ callCount, totalCputime, totalTime, timestamp: Date.now() }),
      );
    } catch (error) {
      this.logger.warn(`Failed to parse rate limit headers for account ${accountId}:`, error);
      // Don't throw - this is non-critical
    }
  }

  /**
   * Calculate backoff delay for retry
   */
  calculateBackoff(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const baseDelay = 1000;
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

    // Add jitter to avoid thundering herd (0-30% of delay)
    const jitter = Math.random() * 0.3 * delay;

    return Math.floor(delay + jitter);
  }

  /**
   * Get current rate limit status (for monitoring/debugging)
   */
  async getStatus(accountId: string): Promise<RateLimitInfo & { usagePercentage: number }> {
    const rateLimit = await this.checkRateLimit(accountId);
    const usagePercentage = Math.round(
      ((this.DEFAULT_RATE_LIMIT - rateLimit.remaining) / this.DEFAULT_RATE_LIMIT) * 100,
    );

    return {
      ...rateLimit,
      usagePercentage,
    };
  }

  /**
   * Reset rate limit for an account (for testing/admin purposes)
   */
  async reset(accountId: string): Promise<void> {
    const key = `${this.RATE_LIMIT_PREFIX}${accountId}`;
    const usageKey = `${this.RATE_LIMIT_PREFIX}${accountId}:usage`;

    try {
      await this.redis.del(key, usageKey);
      this.logger.log(`Rate limit reset for account ${accountId}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit for account ${accountId}:`, error);
      throw error;
    }
  }
}
