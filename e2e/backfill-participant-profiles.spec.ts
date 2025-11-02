import { test, expect } from '@playwright/test';
import axios from 'axios';
import * as crypto from 'crypto';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

/**
 * E2E Test for Backfill Participant Profiles Worker
 *
 * This test verifies the backfill worker successfully updates existing
 * conversations with missing participant profiles by fetching data from
 * the Instagram API.
 *
 * Requirements:
 * - Backend must be running with database access
 * - INSTAGRAM_SYSTEM_USER_TOKEN must be configured
 * - Test uses actual Instagram test account IDs
 */
test.describe('Backfill Participant Profiles Worker E2E', () => {
  const TEST_ACCOUNT_ID = process.env.INSTAGRAM_TEST_ACCOUNT_ID || 'system';
  const TEST_PARTICIPANT_ID = process.env.INSTAGRAM_TEST_PARTICIPANT_ID || '17841403506636395';
  const TEST_PLATFORM_CONVERSATION_ID = `test-conv-${Date.now()}`;

  let conversationId: string;
  let clientAccountId: string;

  test.beforeEach(async () => {
    test.setTimeout(60000);
  });

  test.afterEach(async () => {
    if (conversationId) {
      try {
        await axios.delete(
          `${BACKEND_URL}/api/messaging/conversations/${conversationId}`,
          {
            validateStatus: () => true,
          }
        );
      } catch (error) {
        console.log('Cleanup note:', (error as Error).message);
      }
    }
  });

  test('should create conversation with NULL participant_username', async () => {
    try {
      const createPayload = {
        clientAccountId: TEST_ACCOUNT_ID,
        platformConversationId: TEST_PLATFORM_CONVERSATION_ID,
        participantPlatformId: TEST_PARTICIPANT_ID,
        participantUsername: null,
        participantProfilePic: null,
        unreadCount: 0,
        status: 'open',
        metadata: {},
      };

      const response = await axios.post(
        `${BACKEND_URL}/api/messaging/conversations`,
        createPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      expect([200, 201]).toContain(response.status);
      expect(response.data).toBeDefined();

      if (response.data.data) {
        conversationId = response.data.data.id;
        clientAccountId = response.data.data.clientAccountId;
      } else if (response.data.id) {
        conversationId = response.data.id;
        clientAccountId = response.data.clientAccountId;
      }

      expect(conversationId).toBeDefined();

      const getResponse = await axios.get(
        `${BACKEND_URL}/api/messaging/conversations/${conversationId}`,
        {
          validateStatus: () => true,
        }
      );

      expect(getResponse.status).toBe(200);
      const conversation = getResponse.data.data || getResponse.data;

      expect(conversation.participantUsername).toBeNull();
      expect(conversation.participantProfilePic).toBeNull();
      expect(conversation.participantPlatformId).toBe(TEST_PARTICIPANT_ID);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Failed to create conversation: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should trigger backfill worker and update conversation with participant profile', async () => {
    try {
      const createPayload = {
        clientAccountId: TEST_ACCOUNT_ID,
        platformConversationId: `${TEST_PLATFORM_CONVERSATION_ID}-backfill`,
        participantPlatformId: TEST_PARTICIPANT_ID,
        participantUsername: null,
        participantProfilePic: null,
        unreadCount: 0,
        status: 'open',
        metadata: {},
      };

      const createResponse = await axios.post(
        `${BACKEND_URL}/api/messaging/conversations`,
        createPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      expect([200, 201]).toContain(createResponse.status);

      if (createResponse.data.data) {
        conversationId = createResponse.data.data.id;
        clientAccountId = createResponse.data.data.clientAccountId;
      } else if (createResponse.data.id) {
        conversationId = createResponse.data.id;
        clientAccountId = createResponse.data.clientAccountId;
      }

      const verifyBeforeResponse = await axios.get(
        `${BACKEND_URL}/api/messaging/conversations/${conversationId}`,
        {
          validateStatus: () => true,
        }
      );

      const conversationBefore = verifyBeforeResponse.data.data || verifyBeforeResponse.data;
      expect(conversationBefore.participantUsername).toBeNull();

      const backfillPayload = {
        accountId: clientAccountId || TEST_ACCOUNT_ID,
        batchSize: 10,
      };

      const backfillResponse = await axios.post(
        `${BACKEND_URL}/api/workers/backfill-participant-profiles`,
        backfillPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          validateStatus: () => true,
        }
      );

      expect([200, 201, 202]).toContain(backfillResponse.status);

      await new Promise(resolve => setTimeout(resolve, 5000));

      const verifyAfterResponse = await axios.get(
        `${BACKEND_URL}/api/messaging/conversations/${conversationId}`,
        {
          validateStatus: () => true,
        }
      );

      expect(verifyAfterResponse.status).toBe(200);
      const conversationAfter = verifyAfterResponse.data.data || verifyAfterResponse.data;

      expect(conversationAfter.participantUsername).toBeDefined();
      expect(conversationAfter.participantUsername).not.toBeNull();
      expect(typeof conversationAfter.participantUsername).toBe('string');
      expect(conversationAfter.participantUsername.length).toBeGreaterThan(0);

      expect(conversationAfter.participantProfilePic).toBeDefined();
      expect(conversationAfter.participantProfilePic).not.toBeNull();

      console.log('Backfill successful:', {
        conversationId: conversationAfter.id,
        participantUsername: conversationAfter.participantUsername,
        hasProfilePic: !!conversationAfter.participantProfilePic,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Backfill test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should verify participant_username is no longer NULL after backfill', async () => {
    try {
      const createPayload = {
        clientAccountId: TEST_ACCOUNT_ID,
        platformConversationId: `${TEST_PLATFORM_CONVERSATION_ID}-verify`,
        participantPlatformId: TEST_PARTICIPANT_ID,
        participantUsername: null,
        participantProfilePic: null,
        unreadCount: 0,
        status: 'open',
        metadata: {},
      };

      const createResponse = await axios.post(
        `${BACKEND_URL}/api/messaging/conversations`,
        createPayload,
        {
          validateStatus: () => true,
        }
      );

      expect([200, 201]).toContain(createResponse.status);

      if (createResponse.data.data) {
        conversationId = createResponse.data.data.id;
        clientAccountId = createResponse.data.data.clientAccountId;
      } else if (createResponse.data.id) {
        conversationId = createResponse.data.id;
        clientAccountId = createResponse.data.clientAccountId;
      }

      const backfillPayload = {
        accountId: clientAccountId || TEST_ACCOUNT_ID,
        batchSize: 10,
      };

      await axios.post(
        `${BACKEND_URL}/api/workers/backfill-participant-profiles`,
        backfillPayload,
        {
          validateStatus: () => true,
        }
      );

      await new Promise(resolve => setTimeout(resolve, 5000));

      const verifyResponse = await axios.get(
        `${BACKEND_URL}/api/messaging/conversations/${conversationId}`,
        {
          validateStatus: () => true,
        }
      );

      const conversation = verifyResponse.data.data || verifyResponse.data;

      expect(conversation.participantUsername).not.toBeNull();
      expect(conversation.participantUsername).toBeTruthy();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Verification test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should verify participant_profile_pic is populated after backfill', async () => {
    try {
      const createPayload = {
        clientAccountId: TEST_ACCOUNT_ID,
        platformConversationId: `${TEST_PLATFORM_CONVERSATION_ID}-pic`,
        participantPlatformId: TEST_PARTICIPANT_ID,
        participantUsername: null,
        participantProfilePic: null,
        unreadCount: 0,
        status: 'open',
        metadata: {},
      };

      const createResponse = await axios.post(
        `${BACKEND_URL}/api/messaging/conversations`,
        createPayload,
        {
          validateStatus: () => true,
        }
      );

      expect([200, 201]).toContain(createResponse.status);

      if (createResponse.data.data) {
        conversationId = createResponse.data.data.id;
        clientAccountId = createResponse.data.data.clientAccountId;
      } else if (createResponse.data.id) {
        conversationId = createResponse.data.id;
        clientAccountId = createResponse.data.clientAccountId;
      }

      const backfillPayload = {
        accountId: clientAccountId || TEST_ACCOUNT_ID,
        batchSize: 10,
      };

      await axios.post(
        `${BACKEND_URL}/api/workers/backfill-participant-profiles`,
        backfillPayload,
        {
          validateStatus: () => true,
        }
      );

      await new Promise(resolve => setTimeout(resolve, 5000));

      const verifyResponse = await axios.get(
        `${BACKEND_URL}/api/messaging/conversations/${conversationId}`,
        {
          validateStatus: () => true,
        }
      );

      const conversation = verifyResponse.data.data || verifyResponse.data;

      expect(conversation.participantProfilePic).not.toBeNull();
      expect(conversation.participantProfilePic).toBeTruthy();
      expect(typeof conversation.participantProfilePic).toBe('string');
      expect(conversation.participantProfilePic).toMatch(/^https?:\/\//);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Profile pic test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should handle multiple conversations in batch', async () => {
    const conversationIds: string[] = [];

    try {
      for (let i = 0; i < 3; i++) {
        const createPayload = {
          clientAccountId: TEST_ACCOUNT_ID,
          platformConversationId: `${TEST_PLATFORM_CONVERSATION_ID}-batch-${i}`,
          participantPlatformId: TEST_PARTICIPANT_ID,
          participantUsername: null,
          participantProfilePic: null,
          unreadCount: 0,
          status: 'open',
          metadata: {},
        };

        const createResponse = await axios.post(
          `${BACKEND_URL}/api/messaging/conversations`,
          createPayload,
          {
            validateStatus: () => true,
          }
        );

        if (createResponse.data.data) {
          conversationIds.push(createResponse.data.data.id);
        } else if (createResponse.data.id) {
          conversationIds.push(createResponse.data.id);
        }
      }

      expect(conversationIds.length).toBeGreaterThan(0);

      const backfillPayload = {
        accountId: TEST_ACCOUNT_ID,
        batchSize: 10,
      };

      const backfillResponse = await axios.post(
        `${BACKEND_URL}/api/workers/backfill-participant-profiles`,
        backfillPayload,
        {
          validateStatus: () => true,
        }
      );

      expect([200, 201, 202]).toContain(backfillResponse.status);

      await new Promise(resolve => setTimeout(resolve, 8000));

      for (const id of conversationIds) {
        const verifyResponse = await axios.get(
          `${BACKEND_URL}/api/messaging/conversations/${id}`,
          {
            validateStatus: () => true,
          }
        );

        if (verifyResponse.status === 200) {
          const conversation = verifyResponse.data.data || verifyResponse.data;

          expect(conversation.participantUsername).not.toBeNull();
          expect(conversation.participantProfilePic).not.toBeNull();
        }
      }

      for (const id of conversationIds) {
        try {
          await axios.delete(
            `${BACKEND_URL}/api/messaging/conversations/${id}`,
            {
              validateStatus: () => true,
            }
          );
        } catch (error) {
          console.log('Cleanup note:', (error as Error).message);
        }
      }
    } catch (error) {
      for (const id of conversationIds) {
        try {
          await axios.delete(
            `${BACKEND_URL}/api/messaging/conversations/${id}`,
            {
              validateStatus: () => true,
            }
          );
        } catch (cleanupError) {
          console.log('Cleanup note:', (cleanupError as Error).message);
        }
      }

      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Batch test failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should handle backfill when no conversations need update', async () => {
    try {
      const backfillPayload = {
        accountId: 'non-existent-account',
        batchSize: 10,
      };

      const backfillResponse = await axios.post(
        `${BACKEND_URL}/api/workers/backfill-participant-profiles`,
        backfillPayload,
        {
          validateStatus: () => true,
        }
      );

      expect([200, 201, 202, 404]).toContain(backfillResponse.status);

      if (backfillResponse.status === 200 || backfillResponse.status === 202) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        expect([200, 201, 202, 404, 500]).toContain(error.response?.status || 500);
      }
    }
  });
});
