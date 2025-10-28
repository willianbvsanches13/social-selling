import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
  };
}

export interface InstagramBusinessAccount {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
  facebookPageId: string;
  facebookPageName: string;
}

export interface AvailableAccountsResponse {
  accounts: InstagramBusinessAccount[];
  total: number;
}

/**
 * Service to manage Instagram Business Accounts using System User Token
 */
@Injectable()
export class InstagramSystemAccountsService {
  private readonly logger = new Logger(InstagramSystemAccountsService.name);
  private readonly client: AxiosInstance;
  private readonly BASE_URL = 'https://graph.facebook.com';
  private readonly API_VERSION = 'v24.0';

  constructor(private readonly configService: ConfigService) {
    this.client = axios.create({
      baseURL: `${this.BASE_URL}/${this.API_VERSION}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get system user token from environment
   */
  private getSystemUserToken(): string {
    const token = this.configService.get<string>('INSTAGRAM_SYSTEM_USER_TOKEN');
    if (!token) {
      throw new HttpException(
        'System user token not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return token;
  }

  /**
   * List all available Instagram Business Accounts
   * This retrieves all pages and their connected Instagram accounts
   */
  async listAvailableAccounts(): Promise<AvailableAccountsResponse> {
    try {
      const token = this.getSystemUserToken();

      // Step 1: Get all Facebook Pages accessible by the system user
      this.logger.log('Fetching Facebook Pages accessible by system user...');
      const pagesResponse = await this.client.get('/me/accounts', {
        params: {
          access_token: token,
          fields: 'id,name,access_token,instagram_business_account',
        },
      });

      const pages: FacebookPage[] = pagesResponse.data.data || [];
      this.logger.log(`Found ${pages.length} Facebook Pages`);

      // Step 2: For each page with Instagram Business Account, get the details
      const accounts: InstagramBusinessAccount[] = [];

      for (const page of pages) {
        if (page.instagram_business_account) {
          try {
            const igAccountId = page.instagram_business_account.id;
            this.logger.log(
              `Fetching Instagram Business Account ${igAccountId} for page ${page.name}`,
            );

            const igResponse = await this.client.get(`/${igAccountId}`, {
              params: {
                access_token: token,
                fields:
                  'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
              },
            });

            accounts.push({
              ...igResponse.data,
              facebookPageId: page.id,
              facebookPageName: page.name,
            });
          } catch (error) {
            this.logger.error(
              `Failed to fetch Instagram account for page ${page.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }

      this.logger.log(
        `Successfully retrieved ${accounts.length} Instagram Business Accounts`,
      );

      return {
        accounts,
        total: accounts.length,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data?.error;
        this.logger.error(
          `Facebook API error: ${errorData?.message || error.message}`,
        );
        throw new HttpException(
          errorData?.message || 'Failed to fetch Instagram accounts',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.error(`Error listing Instagram accounts: ${error}`);
      throw new HttpException(
        'Failed to list Instagram accounts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get details of a specific Instagram Business Account
   */
  async getAccountDetails(
    instagramBusinessAccountId: string,
  ): Promise<InstagramBusinessAccount> {
    try {
      const token = this.getSystemUserToken();

      this.logger.log(
        `Fetching details for Instagram Business Account ${instagramBusinessAccountId}`,
      );

      const igResponse = await this.client.get(
        `/${instagramBusinessAccountId}`,
        {
          params: {
            access_token: token,
            fields:
              'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
          },
        },
      );

      // Also get the connected Facebook Page
      const pagesResponse = await this.client.get('/me/accounts', {
        params: {
          access_token: token,
          fields: 'id,name,instagram_business_account',
        },
      });

      const pages: FacebookPage[] = pagesResponse.data.data || [];
      const connectedPage = pages.find(
        (page) =>
          page.instagram_business_account?.id === instagramBusinessAccountId,
      );

      if (!connectedPage) {
        throw new HttpException(
          'Instagram account not found or not accessible',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        ...igResponse.data,
        facebookPageId: connectedPage.id,
        facebookPageName: connectedPage.name,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data?.error;
        this.logger.error(
          `Facebook API error: ${errorData?.message || error.message}`,
        );
        throw new HttpException(
          errorData?.message || 'Failed to fetch Instagram account details',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw error;
    }
  }

  /**
   * Verify that an Instagram Business Account ID is valid and accessible
   */
  async verifyAccountAccess(
    instagramBusinessAccountId: string,
  ): Promise<boolean> {
    try {
      await this.getAccountDetails(instagramBusinessAccountId);
      return true;
    } catch (error) {
      this.logger.warn(
        `Instagram Business Account ${instagramBusinessAccountId} is not accessible`,
      );
      return false;
    }
  }
}
