export interface InstagramAccount {
  id: string;
  instagramId: string;
  username: string;
  fullName: string;
  profilePictureUrl: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  biography?: string;
  website?: string;
  status: 'active' | 'error' | 'disconnected' | 'refreshing';
  accessToken: string;
  tokenExpiresAt: string;
  lastSyncAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface InstagramAuthResponse {
  code: string;
  state?: string;
}

export interface ConnectInstagramRequest {
  code: string;
  redirectUri: string;
}
