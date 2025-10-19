import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  ResetPasswordFormData,
} from '@/lib/schemas/auth.schemas';
import type { User, AuthTokens } from '@/types/auth';

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export const authService = {
  async login(credentials: LoginFormData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.LOGIN,
      credentials
    );
    return response.data!;
  },

  async register(data: Omit<RegisterFormData, 'confirmPassword' | 'acceptTerms'>): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.REGISTER,
      data
    );
    return response.data!;
  },

  async logout(): Promise<void> {
    await apiClient.post(API_ENDPOINTS.LOGOUT);
  },

  async forgotPassword(data: ForgotPasswordFormData): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.FORGOT_PASSWORD,
      data
    );
    return response.data!;
  },

  async resetPassword(data: ResetPasswordFormData): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.RESET_PASSWORD,
      data
    );
    return response.data!;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>(API_ENDPOINTS.ME);
    return response.data!;
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await apiClient.post<AuthTokens>(
      API_ENDPOINTS.REFRESH,
      { refreshToken }
    );
    return response.data!;
  },
};
