import { Injectable, Logger, Inject, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOAuthTokenRepository } from '../../../domain/repositories/oauth-token.repository.interface';

export interface InstagramGraphApiProfile {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
  ig_id?: string;
  is_verified?: boolean;
}

@Injectable()
export class InstagramApiService {
  private readonly logger = new Logger(InstagramApiService.name);
  private readonly graphBaseUrl = 'https://graph.instagram.com';
  private readonly apiVersion = 'v18.0';

  constructor(
    private readonly configService: ConfigService,
    @Inject('IOAuthTokenRepository')
    private readonly oauthTokenRepository: IOAuthTokenRepository,
  ) {}

  /**
   * Get Instagram user profile
   */
  async getUserProfile(accountId: string): Promise<InstagramGraphApiProfile> {
    const accessToken = await this.getAccessToken(accountId);

    const fields = [
      'id',
      'username',
      'name',
      'profile_picture_url',
      'followers_count',
      'follows_count',
      'media_count',
      'biography',
      'website',
      'ig_id',
      'is_verified',
    ].join(',');

    const url = `${this.graphBaseUrl}/${this.apiVersion}/me?fields=${fields}&access_token=${accessToken}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const error = await response.json();
        this.logger.error(`Instagram API error: ${JSON.stringify(error)}`);
        throw new Error(`Instagram API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data as InstagramGraphApiProfile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch user profile: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Revoke Instagram access token (best-effort)
   */
  async revokeToken(accountId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken(accountId);

      // Instagram doesn't have a direct revoke endpoint
      // The token is revoked when the user removes the app from their settings
      // We'll just log this action for now
      this.logger.log(`Token revocation requested for account ${accountId}`);

      // You can implement additional logic here if needed, such as:
      // - Notifying the user to manually revoke access from Instagram settings
      // - Marking the token as revoked in your database
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to revoke token for account ${accountId}: ${errorMessage}`);
      // Don't throw error, as this is best-effort
    }
  }

  /**
   * Get decrypted access token for an account
   */
  private async getAccessToken(accountId: string): Promise<string> {
    const token = await this.oauthTokenRepository.findByClientAccountId(accountId);

    if (!token) {
      throw new UnauthorizedException('No OAuth token found for account');
    }

    // Access the decrypted token (assumes OAuthToken entity has proper decryption)
    // This is a simplified version - you may need to adjust based on your actual implementation
    const decryptedToken = (token as any).props.encryptedAccessToken;

    if (!decryptedToken) {
      throw new UnauthorizedException('Failed to decrypt access token');
    }

    return decryptedToken;
  }

  /**
   * Test if token is valid by making a simple API call
   */
  async testToken(accountId: string): Promise<boolean> {
    try {
      await this.getUserProfile(accountId);
      return true;
    } catch (error) {
      return false;
    }
  }
}
