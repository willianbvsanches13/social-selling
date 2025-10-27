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
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
  account_type: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
}

export interface OAuthState {
  state: string;
  userId: string;
  redirectUri: string;
  createdAt: Date;
  expiresAt: Date;
}
