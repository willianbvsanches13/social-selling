export interface User {
  id: string;
  email: string;
  name: string; // Backend uses 'name', not firstName/lastName
  emailVerified: boolean;
  avatar?: string;
  timezone?: string;
  language?: string;
  role?: 'admin' | 'user';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Backend response format for login/register
export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string; // Backend expects 'name', not firstName/lastName
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
