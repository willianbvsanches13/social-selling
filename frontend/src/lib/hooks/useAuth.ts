'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { authService } from '@/lib/services/auth.service';
import { LoginCredentials, RegisterData } from '@/types/auth';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const { user, tokens, isAuthenticated, isLoading, login, logout, setLoading, setUser } =
    useAuthStore();

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      const authResponse = await authService.login(credentials);

      // Backend returns: { user, accessToken, refreshToken, expiresIn, sessionId? }
      login(authResponse.user, {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        expiresIn: authResponse.expiresIn,
      });

      // Don't redirect here - let the calling component handle it
    } catch (error) {
      setLoading(false);
      throw error; // Re-throw so the calling component can handle it
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: RegisterData) => {
    try {
      setLoading(true);
      const authResponse = await authService.register(data);

      // Backend returns: { user, accessToken, refreshToken, expiresIn, sessionId? }
      login(authResponse.user, {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        expiresIn: authResponse.expiresIn,
      });

      // Don't redirect here - let the calling component handle it
    } catch (error) {
      setLoading(false);
      throw error; // Re-throw so the calling component can handle it
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (tokens?.refreshToken) {
        await authService.logout(tokens.refreshToken);
      }
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
      const userData = await authService.getCurrentUser();
      setUser(userData);
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
