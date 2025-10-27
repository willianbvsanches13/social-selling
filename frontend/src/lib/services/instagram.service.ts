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

  /**
   * Inicia o fluxo OAuth do Instagram
   * Chama o backend que retorna a URL de autorização
   */
  async initiateOAuth(): Promise<string> {
    const response = await apiClient.get<{ authorizationUrl: string }>(
      API_ENDPOINTS.INSTAGRAM_OAUTH_AUTHORIZE
    );
    return response.data?.authorizationUrl || '';
  },
};
