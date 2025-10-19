import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  NormalizedComment,
  NormalizedMessage,
} from './event-normalizer.service';
import { Database } from '../../infrastructure/database/database';

/**
 * Auto-reply rule structure from database
 */
export interface AutoReplyRule {
  id: string;
  trigger: 'keyword' | 'question' | 'greeting' | 'away';
  pattern: string | RegExp;
  response: string;
  enabled: boolean;
  priority: number;
}

/**
 * Result of auto-reply attempt
 */
export interface AutoReplyResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Auto Reply Service
 *
 * Implements intelligent auto-reply logic for Instagram comments and messages.
 * Supports keyword matching, question detection, greeting detection, and away messages.
 */
@Injectable()
export class AutoReplyService {
  private readonly logger = new Logger(AutoReplyService.name);
  private readonly graphApiVersion = 'v18.0';

  constructor(
    @Inject(Database) private database: Database,
    private configService: ConfigService,
  ) {}

  /**
   * Determine if auto-reply should be sent
   *
   * @param accountId - Instagram account ID
   * @param text - Message/comment text
   * @param eventType - Type of event ('comment' or 'message')
   * @returns Object indicating if reply should be sent and which rule matched
   */
  async shouldAutoReply(
    accountId: string,
    text: string,
    eventType: 'comment' | 'message',
  ): Promise<{ should: boolean; rule?: AutoReplyRule }> {
    try {
      // Check if auto-reply is enabled for account
      const account = await this.database.oneOrNone<{
        auto_reply_enabled: boolean;
      }>(
        `SELECT auto_reply_enabled FROM client_accounts WHERE id = $1`,
        [accountId],
      );

      if (!account?.auto_reply_enabled) {
        return { should: false };
      }

      // Get active auto-reply rules for account
      const rules = await this.getAutoReplyRules(accountId, eventType);

      if (rules.length === 0) {
        return { should: false };
      }

      // Find matching rule
      const matchingRule = this.findMatchingRule(text, rules);

      if (matchingRule) {
        this.logger.log(
          `Auto-reply rule matched: ${matchingRule.id} for account ${accountId}`,
        );
        return { should: true, rule: matchingRule };
      }

      return { should: false };
    } catch (error) {
      this.logger.error(
        `Error checking auto-reply: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { should: false };
    }
  }

  /**
   * Reply to an Instagram comment
   *
   * @param comment - Normalized comment data
   * @param replyText - Text to reply with
   * @param accessToken - Instagram access token
   * @returns Result of reply attempt
   */
  async replyToComment(
    comment: NormalizedComment,
    replyText: string,
    accessToken: string,
  ): Promise<AutoReplyResult> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/${this.graphApiVersion}/${comment.id}/replies`,
        {
          message: replyText,
        },
        {
          params: {
            access_token: accessToken,
          },
          timeout: 10000, // 10 second timeout
        },
      );

      this.logger.log(`Auto-replied to comment ${comment.id}`);

      return {
        sent: true,
        messageId: response.data.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to reply to comment: ${errorMessage}`);

      return {
        sent: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Reply to an Instagram direct message
   *
   * @param message - Normalized message data
   * @param replyText - Text to reply with
   * @param igAccountId - Instagram business account ID
   * @param accessToken - Instagram access token
   * @returns Result of reply attempt
   */
  async replyToMessage(
    message: NormalizedMessage,
    replyText: string,
    igAccountId: string,
    accessToken: string,
  ): Promise<AutoReplyResult> {
    try {
      const response = await axios.post(
        `https://graph.facebook.com/${this.graphApiVersion}/${igAccountId}/messages`,
        {
          recipient: {
            id: message.from.id,
          },
          message: {
            text: replyText,
          },
        },
        {
          params: {
            access_token: accessToken,
          },
          timeout: 10000, // 10 second timeout
        },
      );

      this.logger.log(`Auto-replied to message ${message.id}`);

      return {
        sent: true,
        messageId: response.data.message_id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to reply to message: ${errorMessage}`);

      return {
        sent: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Log auto-reply to database
   *
   * @param accountId - Instagram account ID
   * @param eventId - Event ID (comment/message ID)
   * @param ruleId - Auto-reply rule ID
   * @param replyMessageId - ID of sent reply
   */
  async logAutoReply(
    accountId: string,
    eventId: string,
    ruleId: string,
    replyMessageId: string,
  ): Promise<void> {
    try {
      await this.database.none(
        `INSERT INTO auto_reply_logs (account_id, event_id, rule_id, reply_message_id)
         VALUES ($1, $2, $3, $4)`,
        [accountId, eventId, ruleId, replyMessageId],
      );
    } catch (error) {
      this.logger.error(
        `Failed to log auto-reply: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - logging failure shouldn't fail the entire process
    }
  }

  /**
   * Get active auto-reply rules for account
   *
   * @param accountId - Instagram account ID
   * @param eventType - Type of event ('comment' or 'message')
   * @returns Array of active rules sorted by priority
   */
  private async getAutoReplyRules(
    accountId: string,
    eventType: 'comment' | 'message',
  ): Promise<AutoReplyRule[]> {
    const rules = await this.database.query(
      `SELECT id, trigger, pattern, is_regex, response, enabled, priority
       FROM auto_reply_rules
       WHERE account_id = $1 AND event_type = $2 AND enabled = TRUE
       ORDER BY priority ASC`,
      [accountId, eventType],
    );

    if (!rules || rules.length === 0) {
      return [];
    }

    return rules.map((rule: any) => ({
      id: rule.id,
      trigger: rule.trigger as 'keyword' | 'question' | 'greeting' | 'away',
      pattern: rule.is_regex ? new RegExp(rule.pattern, 'i') : rule.pattern,
      response: rule.response,
      enabled: rule.enabled,
      priority: rule.priority,
    }));
  }

  /**
   * Find matching auto-reply rule
   *
   * @param text - Message/comment text
   * @param rules - Array of rules to check
   * @returns Matching rule or null
   */
  private findMatchingRule(
    text: string,
    rules: AutoReplyRule[],
  ): AutoReplyRule | null {
    const lowerText = text.toLowerCase().trim();

    for (const rule of rules) {
      switch (rule.trigger) {
        case 'keyword':
          if (this.matchKeyword(lowerText, rule.pattern)) {
            return rule;
          }
          break;

        case 'question':
          if (this.isQuestion(lowerText)) {
            return rule;
          }
          break;

        case 'greeting':
          if (this.isGreeting(lowerText)) {
            return rule;
          }
          break;

        case 'away':
          // Away messages always match
          return rule;
      }
    }

    return null;
  }

  /**
   * Check if text matches keyword pattern
   *
   * @param text - Lowercased text
   * @param pattern - Pattern to match (string or regex)
   * @returns true if matches
   */
  private matchKeyword(text: string, pattern: string | RegExp): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(text);
    }

    return text.includes(pattern.toLowerCase());
  }

  /**
   * Detect if text is a question
   *
   * @param text - Lowercased text
   * @returns true if text appears to be a question
   */
  private isQuestion(text: string): boolean {
    const questionWords = [
      'what',
      'when',
      'where',
      'why',
      'who',
      'how',
      'is',
      'are',
      'can',
      'could',
      'would',
      'will',
      'do',
      'does',
    ];

    const hasQuestionWord = questionWords.some((word) =>
      text.startsWith(word + ' '),
    );
    const hasQuestionMark = text.includes('?');

    return hasQuestionWord || hasQuestionMark;
  }

  /**
   * Detect if text is a greeting
   *
   * @param text - Lowercased text
   * @returns true if text is a greeting
   */
  private isGreeting(text: string): boolean {
    const greetings = [
      'hi',
      'hello',
      'hey',
      'good morning',
      'good afternoon',
      'good evening',
      'oi',
      'olá',
      'ola',
      'bom dia',
      'boa tarde',
      'boa noite',
    ];

    return greetings.some(
      (greeting) =>
        text.startsWith(greeting) || text === greeting || text === greeting + '!',
    );
  }
}
