export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',

  // Instagram
  INSTAGRAM_ACCOUNTS: '/instagram/accounts',
  INSTAGRAM_CONNECT: '/instagram/connect',
  INSTAGRAM_DISCONNECT: (accountId: string) => `/instagram/accounts/${accountId}/disconnect`,
  INSTAGRAM_MESSAGES: (accountId: string) => `/instagram/accounts/${accountId}/messages`,
  INSTAGRAM_SEND_MESSAGE: (accountId: string) => `/instagram/accounts/${accountId}/messages`,

  // Products
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (id: string) => `/products/${id}`,
  PRODUCT_UPLOAD_IMAGE: '/products/upload-image',

  // Conversations
  CONVERSATIONS: '/conversations',
  CONVERSATION_DETAIL: (id: string) => `/conversations/${id}`,
  CONVERSATION_MESSAGES: (id: string) => `/conversations/${id}/messages`,

  // Analytics
  ANALYTICS_OVERVIEW: '/analytics/overview',
  ANALYTICS_MESSAGES: '/analytics/messages',
  ANALYTICS_PRODUCTS: '/analytics/products',

  // User
  USER_PROFILE: '/user/profile',
  USER_UPDATE: '/user/profile',
  USER_CHANGE_PASSWORD: '/user/change-password',
};

export default API_ENDPOINTS;
