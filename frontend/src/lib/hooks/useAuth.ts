'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { LoginCredentials, RegisterData, User, AuthTokens } from '@/types/auth';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, tokens, isAuthenticated, isLoading, login, logout, setLoading, setUser } =
    useAuthStore();

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      const response = await apiClient.post<{ user: User; tokens: AuthTokens }>(
        API_ENDPOINTS.LOGIN,
        credentials
      );

      if (response.success && response.data) {
        login(response.data.user, response.data.tokens);
        router.push('/dashboard');
      }

      return response;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: RegisterData) => {
    try {
      setLoading(true);
      const response = await apiClient.post<{ user: User; tokens: AuthTokens }>(
        API_ENDPOINTS.REGISTER,
        data
      );

      if (response.success && response.data) {
        login(response.data.user, response.data.tokens);
        router.push('/dashboard');
      }

      return response;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      router.push('/login');
    }
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<User>(API_ENDPOINTS.ME);
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    fetchUser,
  };
}
