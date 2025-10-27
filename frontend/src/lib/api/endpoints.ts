export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  // TODO: Implementar forgot/reset password no backend
  // FORGOT_PASSWORD: '/auth/forgot-password',
  // RESET_PASSWORD: '/auth/reset-password',

  // User Management
  USER_PROFILE: '/users/me',
  USER_UPDATE: '/users/me',
  USER_CHANGE_PASSWORD: '/users/me/change-password',
  USER_STATS: '/users/me/stats',
  USER_VERIFY_EMAIL: '/users/verify-email',
  USER_VERIFY_EMAIL_TOKEN: (token: string) => `/users/verify-email/${token}`,

  // Instagram OAuth
  INSTAGRAM_OAUTH_AUTHORIZE: '/instagram/oauth/authorize',
  INSTAGRAM_OAUTH_CALLBACK: '/instagram/oauth/callback',

  // Instagram Accounts
  INSTAGRAM_ACCOUNTS: '/instagram/accounts',
  INSTAGRAM_ACCOUNT: (id: string) => `/instagram/accounts/${id}`,
  INSTAGRAM_ACCOUNT_SYNC: (id: string) => `/instagram/accounts/${id}/sync`,
  INSTAGRAM_ACCOUNT_REFRESH_STATUS: (id: string) => `/instagram/accounts/${id}/refresh-status`,
  INSTAGRAM_ACCOUNT_DELETE: (id: string) => `/instagram/accounts/${id}`,

  // Instagram Webhooks
  INSTAGRAM_WEBHOOK_CREATE: '/instagram/webhooks/subscriptions',
  INSTAGRAM_WEBHOOK_EVENTS: (accountId: string) => `/instagram/webhooks/events/${accountId}`,
  INSTAGRAM_WEBHOOK_STATS: (accountId: string) => `/instagram/webhooks/stats/${accountId}`,
  INSTAGRAM_WEBHOOK_RETRY: (accountId: string) => `/instagram/webhooks/retry/${accountId}`,

  // Instagram Analytics
  ANALYTICS_ACCOUNT_INSIGHTS: '/instagram/analytics/account/insights',
  ANALYTICS_ACCOUNT_INSIGHTS_HISTORY: (accountId: string) => `/instagram/analytics/account/${accountId}`,
  ANALYTICS_MEDIA_INSIGHTS: (accountId: string) => `/instagram/analytics/media/${accountId}`,
  ANALYTICS_TOP_POSTS: (accountId: string) => `/instagram/analytics/media/top/${accountId}`,
  ANALYTICS_AUDIENCE: (accountId: string) => `/instagram/analytics/audience/${accountId}`,
  ANALYTICS_REPORTS: '/instagram/analytics/reports',
  ANALYTICS_REPORTS_LIST: (accountId: string) => `/instagram/analytics/reports/${accountId}`,

  // Conversations & Messages
  CONVERSATIONS: '/conversations',
  CONVERSATION_DETAIL: (id: string) => `/conversations/${id}`,
  CONVERSATION_MESSAGES: (conversationId: string) => `/conversations/${conversationId}/messages`,
  CONVERSATION_READ: (conversationId: string) => `/conversations/${conversationId}/read`,
  CONVERSATION_ARCHIVE: (conversationId: string) => `/conversations/${conversationId}/archive`,
  CONVERSATION_UNARCHIVE: (conversationId: string) => `/conversations/${conversationId}/unarchive`,
  MESSAGE_TEMPLATES: '/message-templates',
  MESSAGE_UPLOAD: '/messages/upload',

  // Posts & Content Scheduling
  // Upload and Calendar (from /posts controller)
  POST_UPLOAD_MEDIA: '/posts/upload',
  POSTS_CALENDAR: '/posts/calendar',

  // Scheduled Posts CRUD (from /instagram/scheduling controller)
  SCHEDULED_POSTS_CREATE: '/instagram/scheduling/posts',
  SCHEDULED_POSTS_LIST: (accountId: string) => `/instagram/scheduling/posts/${accountId}`,
  SCHEDULED_POST_DETAIL: (accountId: string, postId: string) => `/instagram/scheduling/posts/${accountId}/${postId}`,
  SCHEDULED_POST_UPDATE: (postId: string) => `/instagram/scheduling/posts/${postId}`,
  SCHEDULED_POST_DELETE: (postId: string) => `/instagram/scheduling/posts/${postId}`,
  SCHEDULED_POST_PUBLISH_NOW: (postId: string) => `/instagram/scheduling/posts/${postId}/publish-now`,

  // Media Management
  MEDIA_UPLOAD: '/instagram/scheduling/media/upload',
  MEDIA_LIST: (accountId: string) => `/instagram/scheduling/media/${accountId}`,
  MEDIA_DETAIL: (accountId: string, assetId: string) => `/instagram/scheduling/media/${accountId}/${assetId}`,
  MEDIA_DELETE: (assetId: string) => `/instagram/scheduling/media/${assetId}`,

  // Optimal Posting Times
  OPTIMAL_TIMES: (accountId: string) => `/instagram/scheduling/optimal-times/${accountId}`,

  // Health
  HEALTH: '/health',
  HEALTH_READY: '/health/ready',
  HEALTH_LIVE: '/health/live',
};

export default API_ENDPOINTS;
