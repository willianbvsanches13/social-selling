export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',

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
  INSTAGRAM_DISCONNECT: (id: string) => `/instagram/accounts/${id}/disconnect`,

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

  // Health
  HEALTH: '/health',
  HEALTH_READY: '/health/ready',
  HEALTH_LIVE: '/health/live',
};

export default API_ENDPOINTS;
