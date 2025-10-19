import { Page } from '@playwright/test';

export interface AuthFixture {
  email: string;
  password: string;
  token: string;
}

export const mockAuthUser: AuthFixture = {
  email: 'test@example.com',
  password: 'Test123!@#',
  token: 'mock-jwt-token-123456',
};

/**
 * Login helper for E2E tests
 */
export async function loginUser(page: Page, user: AuthFixture = mockAuthUser): Promise<void> {
  // Mock the authentication API responses
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          token: user.token,
          user: {
            id: '123',
            email: user.email,
            name: 'Test User',
          },
        },
      }),
    });
  });

  // Set token in localStorage
  await page.addInitScript((token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
    }));
  }, user.token);
}

/**
 * Mock authenticated session
 */
export async function mockAuthSession(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token-123456');
    localStorage.setItem('user', JSON.stringify({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
    }));
  });
}
