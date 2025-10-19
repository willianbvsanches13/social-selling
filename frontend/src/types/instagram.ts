export interface InstagramAccount {
  id: string;
  platform: string;
  username: string;
  displayName?: string;
  profilePictureUrl?: string;
  followerCount?: number;
  followingCount?: number;
  mediaCount?: number;
  biography?: string;
  website?: string;
  status: 'active' | 'error' | 'disconnected' | 'token_expired' | 'refreshing';
  accountType: string;
  createdAt: string;
  lastSyncAt?: string;
  tokenExpiresAt?: string;
}

export interface InstagramAuthResponse {
  code: string;
  state?: string;
}

export interface ConnectInstagramRequest {
  code: string;
  redirectUri: string;
}
