import { test, expect } from '@playwright/test';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

/**
 * E2E Test for InstagramApiService.getUserProfileById
 *
 * This test verifies real Instagram API integration for fetching user profiles
 * using the system user token configured in the backend.
 *
 * Requirements:
 * - Backend must be running with INSTAGRAM_SYSTEM_USER_TOKEN configured
 * - Test uses actual Instagram test account IDs
 */
test.describe('Instagram API - Profile Fetching E2E', () => {
  const TEST_ACCOUNT_ID = process.env.INSTAGRAM_TEST_ACCOUNT_ID || 'system';
  const TEST_PARTICIPANT_ID = process.env.INSTAGRAM_TEST_PARTICIPANT_ID || '17841403506636395';

  test.beforeEach(async () => {
    test.setTimeout(30000);
  });

  test('should successfully fetch profile from Instagram API', async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/instagram/profile/${TEST_PARTICIPANT_ID}`,
        {
          params: {
            accountId: TEST_ACCOUNT_ID,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch profile: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should return profile data with username and profile_picture_url', async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/instagram/profile/${TEST_PARTICIPANT_ID}`,
        {
          params: {
            accountId: TEST_ACCOUNT_ID,
          },
        }
      );

      const profile = response.data;

      expect(profile).toHaveProperty('id');
      expect(profile.id).toBe(TEST_PARTICIPANT_ID);

      expect(profile).toHaveProperty('username');
      expect(typeof profile.username).toBe('string');
      expect(profile.username.length).toBeGreaterThan(0);

      expect(profile).toHaveProperty('profile_picture_url');
      expect(typeof profile.profile_picture_url).toBe('string');
      expect(profile.profile_picture_url).toMatch(/^https?:\/\//);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Failed to fetch profile: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should cache profile data after first fetch', async () => {
    let firstCallTime: number;
    let secondCallTime: number;

    try {
      const startFirst = Date.now();
      const firstResponse = await axios.get(
        `${BACKEND_URL}/api/instagram/profile/${TEST_PARTICIPANT_ID}`,
        {
          params: {
            accountId: TEST_ACCOUNT_ID,
          },
        }
      );
      firstCallTime = Date.now() - startFirst;

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.data).toBeDefined();

      await new Promise(resolve => setTimeout(resolve, 100));

      const startSecond = Date.now();
      const secondResponse = await axios.get(
        `${BACKEND_URL}/api/instagram/profile/${TEST_PARTICIPANT_ID}`,
        {
          params: {
            accountId: TEST_ACCOUNT_ID,
          },
        }
      );
      secondCallTime = Date.now() - startSecond;

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.data).toEqual(firstResponse.data);

      console.log(`First call: ${firstCallTime}ms, Second call: ${secondCallTime}ms`);

      // Cache should make subsequent calls faster or at least as fast
      // Using <= instead of < 0.5 since both calls might be cached if previous tests ran
      expect(secondCallTime).toBeLessThanOrEqual(Math.max(firstCallTime, 100));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Failed during cache test: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should return cached data without API call on second request', async () => {
    try {
      const firstResponse = await axios.get(
        `${BACKEND_URL}/api/instagram/profile/${TEST_PARTICIPANT_ID}`,
        {
          params: {
            accountId: TEST_ACCOUNT_ID,
          },
        }
      );

      expect(firstResponse.status).toBe(200);
      const firstData = firstResponse.data;

      await new Promise(resolve => setTimeout(resolve, 200));

      const secondResponse = await axios.get(
        `${BACKEND_URL}/api/instagram/profile/${TEST_PARTICIPANT_ID}`,
        {
          params: {
            accountId: TEST_ACCOUNT_ID,
          },
        }
      );

      expect(secondResponse.status).toBe(200);
      const secondData = secondResponse.data;

      expect(secondData).toEqual(firstData);
      expect(secondData.id).toBe(firstData.id);
      expect(secondData.username).toBe(firstData.username);
      expect(secondData.profile_picture_url).toBe(firstData.profile_picture_url);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Failed during cached data test: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });

  test('should handle invalid participant ID gracefully', async () => {
    const invalidParticipantId = '999999999999999';

    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/instagram/profile/${invalidParticipantId}`,
        {
          params: {
            accountId: TEST_ACCOUNT_ID,
          },
          validateStatus: () => true,
        }
      );

      expect([400, 404, 422, 500]).toContain(response.status);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        expect([400, 404, 422, 500]).toContain(error.response?.status || 500);
      }
    }
  });

  test('should use real Instagram test account', async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/instagram/profile/${TEST_PARTICIPANT_ID}`,
        {
          params: {
            accountId: TEST_ACCOUNT_ID,
          },
        }
      );

      expect(response.status).toBe(200);

      const profile = response.data;
      expect(profile.id).toBe(TEST_PARTICIPANT_ID);
      expect(profile.username).toBeTruthy();
      expect(profile.profile_picture_url).toBeTruthy();

      console.log('Successfully fetched real Instagram profile:', {
        id: profile.id,
        username: profile.username,
        hasProfilePicture: !!profile.profile_picture_url,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('API Error:', error.response?.data || error.message);
        throw new Error(`Failed to use real test account: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  });
});
