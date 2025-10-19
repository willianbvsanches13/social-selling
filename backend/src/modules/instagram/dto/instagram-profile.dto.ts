export interface InstagramProfileDto {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  website?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  ig_id?: number; // Instagram Business Account ID
  is_verified?: boolean;
  account_type?: 'BUSINESS' | 'CREATOR' | 'PERSONAL';
}
