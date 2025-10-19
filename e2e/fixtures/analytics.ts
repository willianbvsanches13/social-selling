/**
 * Mock data for Analytics Dashboard E2E tests
 */

export const mockAnalyticsOverview = {
  totalFollowers: 15234,
  followerChange: 12.5,
  totalReach: 45678,
  reachChange: 8.2,
  totalEngagement: 3456,
  engagementChange: -3.1,
  engagementRate: 7.56,
  engagementRateChange: 2.3,
};

export const mockEngagementData = [
  { date: '2025-10-01', likes: 150, comments: 45, shares: 12, saves: 23 },
  { date: '2025-10-02', likes: 180, comments: 52, shares: 15, saves: 28 },
  { date: '2025-10-03', likes: 165, comments: 48, shares: 10, saves: 25 },
  { date: '2025-10-04', likes: 195, comments: 60, shares: 18, saves: 32 },
  { date: '2025-10-05', likes: 210, comments: 65, shares: 20, saves: 35 },
  { date: '2025-10-06', likes: 175, comments: 50, shares: 14, saves: 27 },
  { date: '2025-10-07', likes: 190, comments: 55, shares: 16, saves: 30 },
];

export const mockFollowerData = [
  { date: '2025-10-01', followers: 15000, newFollowers: 50, unfollows: 10 },
  { date: '2025-10-02', followers: 15040, newFollowers: 55, unfollows: 15 },
  { date: '2025-10-03', followers: 15080, newFollowers: 60, unfollows: 20 },
  { date: '2025-10-04', followers: 15120, newFollowers: 65, unfollows: 25 },
  { date: '2025-10-05', followers: 15160, newFollowers: 70, unfollows: 30 },
  { date: '2025-10-06', followers: 15195, newFollowers: 60, unfollows: 25 },
  { date: '2025-10-07', followers: 15234, newFollowers: 65, unfollows: 26 },
];

export const mockTopPosts = [
  {
    id: '1',
    caption: 'Amazing sunset at the beach 🌅',
    mediaUrl: 'https://example.com/image1.jpg',
    mediaType: 'IMAGE',
    likes: 1234,
    comments: 89,
    shares: 45,
    saves: 67,
    reach: 5678,
    impressions: 8901,
    engagementRate: 8.5,
    publishedAt: '2025-10-15T10:00:00Z',
  },
  {
    id: '2',
    caption: 'New product launch! Check it out 🚀',
    mediaUrl: 'https://example.com/image2.jpg',
    mediaType: 'IMAGE',
    likes: 987,
    comments: 76,
    shares: 34,
    saves: 56,
    reach: 4567,
    impressions: 7890,
    engagementRate: 7.2,
    publishedAt: '2025-10-14T14:30:00Z',
  },
  {
    id: '3',
    caption: 'Behind the scenes of our latest shoot 📸',
    mediaUrl: 'https://example.com/video1.mp4',
    mediaType: 'VIDEO',
    likes: 876,
    comments: 65,
    shares: 28,
    saves: 45,
    reach: 3456,
    impressions: 6789,
    engagementRate: 6.8,
    publishedAt: '2025-10-13T09:15:00Z',
  },
  {
    id: '4',
    caption: 'Throwback Thursday 🔙',
    mediaUrl: 'https://example.com/image4.jpg',
    mediaType: 'IMAGE',
    likes: 765,
    comments: 54,
    shares: 22,
    saves: 38,
    reach: 2890,
    impressions: 5678,
    engagementRate: 6.1,
    publishedAt: '2025-10-12T16:45:00Z',
  },
  {
    id: '5',
    caption: 'Weekend vibes ✨',
    mediaUrl: 'https://example.com/image5.jpg',
    mediaType: 'IMAGE',
    likes: 654,
    comments: 43,
    shares: 18,
    saves: 32,
    reach: 2345,
    impressions: 4567,
    engagementRate: 5.5,
    publishedAt: '2025-10-11T11:20:00Z',
  },
];

export const mockInstagramAccounts = [
  {
    id: 'acc-1',
    username: '@testaccount',
    profilePictureUrl: 'https://example.com/profile1.jpg',
    followerCount: 15234,
    followingCount: 500,
    status: 'active',
  },
  {
    id: 'acc-2',
    username: '@testaccount2',
    profilePictureUrl: 'https://example.com/profile2.jpg',
    followerCount: 8765,
    followingCount: 350,
    status: 'active',
  },
];
