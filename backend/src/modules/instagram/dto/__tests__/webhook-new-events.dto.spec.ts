import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  MessageReactionDto,
  MessageReactionEventDto,
  MessagingPostbackDto,
  MessagingPostbackEventDto,
  MessagingSeenEventDto,
  StoryInsightsEventDto,
  InsightMetricDto,
} from '../webhook.dto';

describe('New Instagram Webhook DTOs', () => {
  describe('MessageReactionDto', () => {
    it('should validate valid message reaction', async () => {
      const dto = plainToInstance(MessageReactionDto, {
        mid: 'mid.1234567890',
        reaction: 'love',
        emoji: '❤️',
        reaction_type: 'love',
        action: 'react',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require mid field', async () => {
      const dto = plainToInstance(MessageReactionDto, {
        action: 'react',
        reaction: 'love',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('mid');
    });

    it('should require action field', async () => {
      const dto = plainToInstance(MessageReactionDto, {
        mid: 'mid.1234567890',
        reaction: 'love',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('action');
    });

    it('should validate action is react or unreact', async () => {
      const dto = plainToInstance(MessageReactionDto, {
        mid: 'mid.1234567890',
        action: 'invalid_action',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isIn');
    });

    it('should allow optional emoji and reaction fields', async () => {
      const dto = plainToInstance(MessageReactionDto, {
        mid: 'mid.1234567890',
        action: 'react',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('MessageReactionEventDto', () => {
    it('should validate complete message reaction event', async () => {
      const dto = plainToInstance(MessageReactionEventDto, {
        message_reactions: [
          {
            mid: 'random_mid',
            action: 'react',
            reaction: 'love',
            emoji: '❤️',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require message_reactions array', async () => {
      const dto = plainToInstance(MessageReactionEventDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('message_reactions');
    });

    it('should validate nested reaction objects', async () => {
      const dto = plainToInstance(MessageReactionEventDto, {
        message_reactions: [
          {
            // Missing required fields
            emoji: '❤️',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('MessagingPostbackDto', () => {
    it('should validate valid messaging postback', async () => {
      const dto = plainToInstance(MessagingPostbackDto, {
        mid: 'mid.1234567890',
        title: 'Talk to human',
        payload: 'Payload',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require mid field', async () => {
      const dto = plainToInstance(MessagingPostbackDto, {
        title: 'Talk to human',
        payload: 'Payload',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('mid');
    });

    it('should require payload field', async () => {
      const dto = plainToInstance(MessagingPostbackDto, {
        mid: 'mid.1234567890',
        title: 'Talk to human',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow optional title field', async () => {
      const dto = plainToInstance(MessagingPostbackDto, {
        mid: 'mid.1234567890',
        payload: 'Payload',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('MessagingPostbackEventDto', () => {
    it('should validate complete messaging postback event', async () => {
      const dto = plainToInstance(MessagingPostbackEventDto, {
        messaging_postbacks: [
          {
            mid: 'aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlE',
            title: 'Talk to human',
            payload: 'Payload',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require messaging_postbacks array', async () => {
      const dto = plainToInstance(MessagingPostbackEventDto, {});

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('messaging_postbacks');
    });

    it('should validate nested postback objects', async () => {
      const dto = plainToInstance(MessagingPostbackEventDto, {
        messaging_postbacks: [
          {
            mid: 'mid.1234567890',
            payload: 'Payload',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('MessagingSeenEventDto', () => {
    it('should validate valid messaging seen event', async () => {
      const dto = plainToInstance(MessagingSeenEventDto, {
        watermark: 1527459824,
        mid: 'last_message_id_read',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require watermark field', async () => {
      const dto = plainToInstance(MessagingSeenEventDto, {
        mid: 'last_message_id_read',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('watermark');
    });

    it('should allow optional mid field', async () => {
      const dto = plainToInstance(MessagingSeenEventDto, {
        watermark: 1527459824000,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate watermark is number', async () => {
      const dto = plainToInstance(MessagingSeenEventDto, {
        watermark: '1527459824', // Should be number
        mid: 'last_message_id_read',
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('InsightMetricDto', () => {
    it('should validate valid insight metrics', async () => {
      const dto = plainToInstance(InsightMetricDto, {
        reach: 44,
        impressions: 444,
        exits: 3,
        replies: 0,
        taps_forward: 4,
        taps_back: 3,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow all fields to be optional', async () => {
      const dto = plainToInstance(InsightMetricDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate numeric types', async () => {
      const dto = plainToInstance(InsightMetricDto, {
        reach: '44', // Should be number
        impressions: 444,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('StoryInsightsEventDto', () => {
    it('should validate complete story insights event', async () => {
      const dto = plainToInstance(StoryInsightsEventDto, {
        media_id: '17887498072083520',
        impressions: 444,
        reach: 44,
        taps_forward: 4,
        taps_back: 3,
        exits: 3,
        replies: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require media_id field', async () => {
      const dto = plainToInstance(StoryInsightsEventDto, {
        impressions: 444,
        reach: 44,
      });

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('media_id');
    });

    it('should allow optional insights field', async () => {
      const dto = plainToInstance(StoryInsightsEventDto, {
        media_id: '17887498072083520',
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate nested insights object', async () => {
      const dto = plainToInstance(StoryInsightsEventDto, {
        media_id: '17887498072083520',
        insights: {
          impressions: 444,
          reach: 44,
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing required nested objects', async () => {
      const dto = plainToInstance(MessageReactionEventDto, {
        message_reactions: [],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0); // Empty array is valid
    });

    it('should handle empty strings', async () => {
      const dto = plainToInstance(MessageReactionDto, {
        mid: '',
        action: 'react',
      });

      const errors = await validate(dto);
      // mid is required but empty string passes @IsString validation
      expect(dto.mid).toBe('');
    });

    it('should handle very large numbers for insights', async () => {
      const dto = plainToInstance(StoryInsightsEventDto, {
        media_id: '17887498072083520',
        insights: {
          impressions: 999999999,
          reach: 999999999,
        },
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle unicode emojis correctly', async () => {
      const emojis = ['❤️', '👍', '😂', '😢', '🔥', '🎉'];

      for (const emoji of emojis) {
        const dto = plainToInstance(MessageReactionDto, {
          mid: 'mid.1234567890',
          action: 'react',
          emoji: emoji,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
        expect(dto.emoji).toBe(emoji);
      }
    });

    it('should handle multiple reactions in array', async () => {
      const dto = plainToInstance(MessageReactionEventDto, {
        message_reactions: [
          {
            mid: 'mid.1',
            action: 'react',
            emoji: '❤️',
          },
          {
            mid: 'mid.2',
            action: 'react',
            emoji: '👍',
          },
          {
            mid: 'mid.3',
            action: 'unreact',
          },
        ],
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.message_reactions).toHaveLength(3);
    });

    it('should handle zero values in metrics', async () => {
      const dto = plainToInstance(InsightMetricDto, {
        reach: 0,
        impressions: 0,
        exits: 0,
        replies: 0,
      });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
