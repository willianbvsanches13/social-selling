import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { InstagramAccount, ConnectInstagramRequest } from '@/types/instagram';

interface AccountListResponse {
  accounts: InstagramAccount[];
  total: number;
}

export const instagramService = {
  async getAccounts(): Promise<InstagramAccount[]> {
    const response = await apiClient.get<AccountListResponse>(
      API_ENDPOINTS.INSTAGRAM_ACCOUNTS
    );
    return response.data?.accounts || [];
  },

  async getAccount(accountId: string): Promise<InstagramAccount> {
    const response = await apiClient.get<InstagramAccount>(
      API_ENDPOINTS.INSTAGRAM_ACCOUNT(accountId)
    );
    return response.data!;
  },

  async disconnectAccount(accountId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.INSTAGRAM_ACCOUNT_DELETE(accountId));
  },

  async syncAccount(accountId: string): Promise<InstagramAccount> {
    const response = await apiClient.post<InstagramAccount>(
      API_ENDPOINTS.INSTAGRAM_ACCOUNT_SYNC(accountId)
    );
    return response.data!;
  },

  async refreshAccountStatus(accountId: string): Promise<{ status: string }> {
    const response = await apiClient.post<{ status: string }>(
      API_ENDPOINTS.INSTAGRAM_ACCOUNT_REFRESH_STATUS(accountId)
    );
    return response.data!;
  },

  getAuthUrl(): string {
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_APP_URL}/auth/instagram/callback`
    );
    const scope = encodeURIComponent('instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish');
    const state = Math.random().toString(36).substring(7);

    // Store state in sessionStorage for verification
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('instagram_oauth_state', state);
    }

    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${state}`;
  },
};
