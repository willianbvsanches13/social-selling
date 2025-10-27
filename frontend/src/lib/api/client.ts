'use client';

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '@/types/common';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL;

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('accessToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 Unauthorized - token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Backend returns: { user, accessToken, refreshToken, expiresIn }
            const response = await this.client.post('/auth/refresh', {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken, expiresIn } = response.data;
            localStorage.setItem('accessToken', accessToken);
            // Also set in cookies for middleware
            document.cookie = `accessToken=${accessToken}; path=/; max-age=${expiresIn || 900}; samesite=strict`;
            if (newRefreshToken) {
              localStorage.setItem('refreshToken', newRefreshToken);
              document.cookie = `refreshToken=${newRefreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=strict`;
            }

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout user
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = error.response.data as any;
      return {
        message: data.message || 'An error occurred',
        status: error.response.status,
        errors: data.errors,
      };
    }
    if (error.request) {
      return {
        message: 'Network error - please check your connection',
        status: 0,
      };
    }
    return {
      message: error.message || 'An unexpected error occurred',
      status: 0,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<T>(url, config);
    // Backend returns data directly, wrap it in ApiResponse format
    return {
      success: true,
      data: response.data,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async post<T = any>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<T>(url, data, config);
    // Backend returns data directly, wrap it in ApiResponse format
    return {
      success: true,
      data: response.data,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async put<T = any>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put<T>(url, data, config);
    // Backend returns data directly, wrap it in ApiResponse format
    return {
      success: true,
      data: response.data,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async patch<T = any>(
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.patch<T>(url, data, config);
    // Backend returns data directly, wrap it in ApiResponse format
    return {
      success: true,
      data: response.data,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<T>(url, config);
    // Backend returns data directly, wrap it in ApiResponse format
    return {
      success: true,
      data: response.data,
    };
  }

  // Upload file with progress
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async upload<T = any>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return {
      success: true,
      data: response.data,
      message: 'success',
    };
  }
}

export const apiClient = new ApiClient();
export default apiClient;
