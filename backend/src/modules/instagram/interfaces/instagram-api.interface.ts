export interface InstagramTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
}

export interface InstagramUserProfile {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
  media_count?: number;
}

export interface OAuthState {
  state: string;
  userId: string;
  redirectUri: string;
  createdAt: Date;
  expiresAt: Date;
}
