# TEST-003: Frontend Testing

## Epic
Testing Infrastructure & Quality Assurance

## Story
As a frontend developer, I need comprehensive testing infrastructure with Jest, React Testing Library, MSW for API mocking, Playwright for E2E tests, visual regression testing, and accessibility testing to ensure UI quality, user experience, and cross-browser compatibility with automated test execution in CI/CD pipelines.

## Priority
P0 - Critical

## Estimated Effort
13 Story Points (Large)

## Dependencies
- Frontend application setup (React + TypeScript)
- Component library implementation
- API client implementation
- Authentication implementation
- Routing setup (React Router)
- State management (Zustand/React Query)

## Technical Context

### Technology Stack
- **Unit Testing**: Jest 29.x + React Testing Library
- **E2E Testing**: Playwright for cross-browser testing
- **API Mocking**: MSW (Mock Service Worker)
- **Visual Testing**: Playwright visual comparisons
- **Accessibility**: jest-axe + Playwright accessibility testing
- **Coverage**: Istanbul via Jest
- **Component Testing**: Storybook interaction tests
- **Form Testing**: React Hook Form testing utilities
- **State Testing**: Zustand/React Query test utilities

### Architecture Overview
```
┌──────────────────────────────────────────────────┐
│       Frontend Testing Infrastructure            │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │         Unit Tests (Jest + RTL)        │    │
│  │  - Component rendering                 │    │
│  │  - User interactions                   │    │
│  │  - Custom hooks                        │    │
│  │  - Utility functions                   │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  MSW Mocking   │    │  E2E Tests       │    │
│  │  - API mocks   │    │  - Playwright    │    │
│  │  - Handlers    │    │  - User flows    │    │
│  │  - Scenarios   │    │  - Screenshots   │    │
│  └────────────────┘    └──────────────────┘    │
│                                                  │
│  ┌────────────────┐    ┌──────────────────┐    │
│  │  Accessibility │    │  Visual Testing  │    │
│  │  - jest-axe    │    │  - Snapshots     │    │
│  │  - ARIA tests  │    │  - Regression    │    │
│  └────────────────┘    └──────────────────┘    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Testing Strategy
- **Unit Tests**: Test components in isolation with mocked dependencies
- **Integration Tests**: Test component interactions and data flow
- **E2E Tests**: Test complete user workflows across pages
- **Visual Tests**: Detect unintended UI changes
- **Accessibility Tests**: Ensure WCAG 2.1 AA compliance
- **Performance Tests**: Monitor bundle size and render performance
- **Cross-browser**: Test on Chrome, Firefox, Safari, Edge

## Detailed Requirements

### 1. Jest + React Testing Library Setup

#### Jest Configuration
```typescript
// jest.config.ts

import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  displayName: 'frontend',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Module resolution
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  modulePaths: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@test/(.*)$': '<rootDir>/tests/$1',

    // Mock static assets
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/__mocks__/fileMock.ts',
  },

  // Test matching
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '\\.e2e\\.test\\.ts$',
  ],

  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },

  // Setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Transform
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },

  // Performance
  maxWorkers: '50%',
  cache: true,

  // Timeouts
  testTimeout: 10000,

  // Mocking
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

export default config;
```

#### Test Setup File
```typescript
// tests/setup.ts

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';
import 'whatwg-fetch'; // Polyfill for fetch

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock sessionStorage
global.sessionStorage = localStorageMock as any;

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

// Custom matchers
expect.extend({
  toHaveNoViolations: require('jest-axe').toHaveNoViolations,
});
```

#### File Mocks
```typescript
// tests/__mocks__/fileMock.ts
export default 'test-file-stub';
```

### 2. MSW API Mocking

#### MSW Server Setup
```typescript
// tests/mocks/server.ts

import { setupServer } from 'msw/node';
import { authHandlers } from './handlers/auth';
import { productsHandlers } from './handlers/products';
import { messagesHandlers } from './handlers/messages';
import { instagramHandlers } from './handlers/instagram';
import { analyticsHandlers } from './handlers/analytics';

export const handlers = [
  ...authHandlers,
  ...productsHandlers,
  ...messagesHandlers,
  ...instagramHandlers,
  ...analyticsHandlers,
];

export const server = setupServer(...handlers);
```

#### Auth Handlers
```typescript
// tests/mocks/handlers/auth.ts

import { rest } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const authHandlers = [
  // Register
  rest.post(`${API_URL}/auth/register`, async (req, res, ctx) => {
    const { email, password, name } = await req.json();

    if (!email || !password || !name) {
      return res(
        ctx.status(400),
        ctx.json({
          message: 'Missing required fields',
        })
      );
    }

    return res(
      ctx.status(201),
      ctx.json({
        user: {
          id: 'user-123',
          email,
          name,
          role: 'USER',
          createdAt: new Date().toISOString(),
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      })
    );
  }),

  // Login
  rest.post(`${API_URL}/auth/login`, async (req, res, ctx) => {
    const { email, password } = await req.json();

    if (email === 'test@example.com' && password === 'Password123!') {
      return res(
        ctx.status(200),
        ctx.json({
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'USER',
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({
        message: 'Invalid credentials',
      })
    );
  }),

  // Get current user
  rest.get(`${API_URL}/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(
        ctx.status(401),
        ctx.json({
          message: 'Unauthorized',
        })
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: '2025-01-01T00:00:00Z',
      })
    );
  }),

  // Logout
  rest.post(`${API_URL}/auth/logout`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Refresh token
  rest.post(`${API_URL}/auth/refresh`, async (req, res, ctx) => {
    const { refreshToken } = await req.json();

    if (refreshToken === 'mock-refresh-token') {
      return res(
        ctx.status(200),
        ctx.json({
          accessToken: 'new-mock-access-token',
          refreshToken: 'new-mock-refresh-token',
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({
        message: 'Invalid refresh token',
      })
    );
  }),
];
```

#### Products Handlers
```typescript
// tests/mocks/handlers/products.ts

import { rest } from 'msw';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const mockProducts = [
  {
    id: 'product-1',
    name: 'Premium Headphones',
    description: 'High-quality wireless headphones',
    price: 299.99,
    currency: 'USD',
    sku: 'HEADPHONES-001',
    stockQuantity: 50,
    imageUrls: ['https://example.com/headphones.jpg'],
    status: 'ACTIVE',
    category: 'Electronics',
    tags: ['audio', 'wireless'],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'product-2',
    name: 'Laptop Stand',
    description: 'Ergonomic aluminum laptop stand',
    price: 49.99,
    currency: 'USD',
    sku: 'STAND-001',
    stockQuantity: 100,
    imageUrls: ['https://example.com/stand.jpg'],
    status: 'ACTIVE',
    category: 'Accessories',
    tags: ['desk', 'ergonomic'],
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
  },
];

export const productsHandlers = [
  // Get all products
  rest.get(`${API_URL}/products`, (req, res, ctx) => {
    const skip = Number(req.url.searchParams.get('skip')) || 0;
    const take = Number(req.url.searchParams.get('take')) || 10;

    return res(
      ctx.status(200),
      ctx.json(mockProducts.slice(skip, skip + take))
    );
  }),

  // Get product by ID
  rest.get(`${API_URL}/products/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const product = mockProducts.find(p => p.id === id);

    if (!product) {
      return res(
        ctx.status(404),
        ctx.json({
          message: 'Product not found',
        })
      );
    }

    return res(ctx.status(200), ctx.json(product));
  }),

  // Create product
  rest.post(`${API_URL}/products`, async (req, res, ctx) => {
    const productData = await req.json();

    const newProduct = {
      id: `product-${Date.now()}`,
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockProducts.push(newProduct);

    return res(ctx.status(201), ctx.json(newProduct));
  }),

  // Update product
  rest.patch(`${API_URL}/products/:id`, async (req, res, ctx) => {
    const { id } = req.params;
    const updates = await req.json();
    const productIndex = mockProducts.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({
          message: 'Product not found',
        })
      );
    }

    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return res(ctx.status(200), ctx.json(mockProducts[productIndex]));
  }),

  // Delete product
  rest.delete(`${API_URL}/products/:id`, (req, res, ctx) => {
    const { id } = req.params;
    const productIndex = mockProducts.findIndex(p => p.id === id);

    if (productIndex === -1) {
      return res(
        ctx.status(404),
        ctx.json({
          message: 'Product not found',
        })
      );
    }

    mockProducts.splice(productIndex, 1);

    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Search products
  rest.get(`${API_URL}/products/search`, (req, res, ctx) => {
    const query = req.url.searchParams.get('q')?.toLowerCase() || '';

    const results = mockProducts.filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );

    return res(ctx.status(200), ctx.json(results));
  }),
];
```

### 3. Component Unit Tests

#### Button Component Test
```typescript
// src/components/ui/Button/__tests__/Button.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders in disabled state', () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-md');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-lg');
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders icon button', () => {
    const Icon = () => <svg data-testid="icon" />;
    render(
      <Button icon={<Icon />} aria-label="Icon button">
        <Icon />
      </Button>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
```

#### Form Input Test
```typescript
// src/components/ui/Input/__tests__/Input.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input Component', () => {
  it('renders input with label', () => {
    render(<Input label="Email" name="email" />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input name="email" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('test@example.com');
  });

  it('displays error message', () => {
    render(<Input name="email" error="Invalid email" />);

    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('input-error');
  });

  it('renders required indicator', () => {
    render(<Input label="Email" name="email" required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" name="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" name="password" />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');

    rerender(<Input type="number" name="quantity" />);
    expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
  });

  it('handles disabled state', () => {
    render(<Input name="email" disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('shows helper text', () => {
    render(<Input name="email" helperText="Enter your email address" />);

    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
  });
});
```

#### Product Card Test
```typescript
// src/components/products/ProductCard/__tests__/ProductCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

const mockProduct = {
  id: 'product-1',
  name: 'Premium Headphones',
  description: 'High-quality wireless headphones',
  price: 299.99,
  currency: 'USD',
  imageUrls: ['https://example.com/headphones.jpg'],
  stockQuantity: 50,
  status: 'ACTIVE' as const,
};

describe('ProductCard Component', () => {
  it('renders product information', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText(/premium headphones/i)).toBeInTheDocument();
    expect(screen.getByText(/\$299\.99/)).toBeInTheDocument();
    expect(screen.getByText(/in stock: 50/i)).toBeInTheDocument();
  });

  it('displays product image', () => {
    render(<ProductCard product={mockProduct} />);

    const image = screen.getByRole('img', { name: /premium headphones/i });
    expect(image).toHaveAttribute('src', mockProduct.imageUrls[0]);
  });

  it('shows out of stock badge', () => {
    const outOfStockProduct = {
      ...mockProduct,
      stockQuantity: 0,
      status: 'OUT_OF_STOCK' as const,
    };

    render(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    const handleEdit = jest.fn();
    render(<ProductCard product={mockProduct} onEdit={handleEdit} />);

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(handleEdit).toHaveBeenCalledWith(mockProduct);
  });

  it('calls onDelete when delete button clicked', () => {
    const handleDelete = jest.fn();
    render(<ProductCard product={mockProduct} onDelete={handleDelete} />);

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));

    expect(handleDelete).toHaveBeenCalledWith(mockProduct.id);
  });

  it('truncates long description', () => {
    const longDescription = 'A'.repeat(200);
    const productWithLongDesc = {
      ...mockProduct,
      description: longDescription,
    };

    render(<ProductCard product={productWithLongDesc} />);

    const description = screen.getByText(/A+\.\.\./);
    expect(description.textContent?.length).toBeLessThan(longDescription.length);
  });
});
```

### 4. Custom Hooks Testing

#### useAuth Hook Test
```typescript
// src/hooks/__tests__/useAuth.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { AuthProvider } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
};

describe('useAuth Hook', () => {
  it('returns null user initially', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logs in user successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  it('handles login error', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.login({
          email: 'wrong@example.com',
          password: 'wrong',
        });
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    expect(result.current.user).toBeNull();
  });

  it('registers user successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.register({
        email: 'newuser@example.com',
        password: 'Password123!',
        name: 'New User',
      });
    });

    await waitFor(() => {
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.email).toBe('newuser@example.com');
    });
  });

  it('logs out user', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    // Login first
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'Password123!',
      });
    });

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    await waitFor(() => {
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
```

#### useProducts Hook Test
```typescript
// src/hooks/__tests__/useProducts.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react';
import { useProducts } from '../useProducts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useProducts Hook', () => {
  it('fetches products successfully', async () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.products).toHaveLength(2);
    expect(result.current.products[0]).toMatchObject({
      name: 'Premium Headphones',
      price: 299.99,
    });
  });

  it('creates product successfully', async () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    const newProduct = {
      name: 'New Product',
      description: 'Test product',
      price: 99.99,
      currency: 'USD' as const,
      sku: 'NEW-001',
      stockQuantity: 10,
    };

    await act(async () => {
      await result.current.createProduct(newProduct);
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(3);
    });
  });

  it('updates product successfully', async () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(2);
    });

    const productId = result.current.products[0].id;

    await act(async () => {
      await result.current.updateProduct(productId, {
        name: 'Updated Name',
      });
    });

    await waitFor(() => {
      const updated = result.current.products.find(p => p.id === productId);
      expect(updated?.name).toBe('Updated Name');
    });
  });

  it('deletes product successfully', async () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(2);
    });

    const productId = result.current.products[0].id;

    await act(async () => {
      await result.current.deleteProduct(productId);
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(1);
    });
  });
});
```

### 5. Form Validation Testing

```typescript
// src/components/forms/__tests__/ProductForm.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductForm } from '../ProductForm';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('ProductForm Component', () => {
  it('renders all form fields', () => {
    render(<ProductForm />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sku/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/stock quantity/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<ProductForm />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/price is required/i)).toBeInTheDocument();
    });
  });

  it('validates price is positive number', async () => {
    render(<ProductForm />, { wrapper: createWrapper() });

    const priceInput = screen.getByLabelText(/price/i);
    fireEvent.change(priceInput, { target: { value: '-10' } });
    fireEvent.blur(priceInput);

    await waitFor(() => {
      expect(screen.getByText(/price must be positive/i)).toBeInTheDocument();
    });
  });

  it('validates SKU format', async () => {
    render(<ProductForm />, { wrapper: createWrapper() });

    const skuInput = screen.getByLabelText(/sku/i);
    fireEvent.change(skuInput, { target: { value: 'invalid sku!' } });
    fireEvent.blur(skuInput);

    await waitFor(() => {
      expect(screen.getByText(/invalid sku format/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<ProductForm onSubmit={onSubmit} />, { wrapper: createWrapper() });

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Test Product' },
    });
    fireEvent.change(screen.getByLabelText(/price/i), {
      target: { value: '99.99' },
    });
    fireEvent.change(screen.getByLabelText(/sku/i), {
      target: { value: 'TEST-001' },
    });
    fireEvent.change(screen.getByLabelText(/stock quantity/i), {
      target: { value: '10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          price: 99.99,
          sku: 'TEST-001',
          stockQuantity: 10,
        })
      );
    });
  });

  it('populates form with initial values for edit', () => {
    const initialProduct = {
      id: 'product-1',
      name: 'Existing Product',
      price: 149.99,
      sku: 'EXIST-001',
      stockQuantity: 20,
    };

    render(<ProductForm initialValues={initialProduct} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/name/i)).toHaveValue('Existing Product');
    expect(screen.getByLabelText(/price/i)).toHaveValue(149.99);
    expect(screen.getByLabelText(/sku/i)).toHaveValue('EXIST-001');
  });
});
```

### 6. Playwright E2E Tests

#### Playwright Configuration
```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Authentication E2E Test
```typescript
// e2e/auth.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should register new user', async ({ page }) => {
    await page.click('text=Sign Up');

    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');

    await page.click('button:has-text("Create Account")');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome, Test User')).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.click('text=Sign In');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');

    await page.click('button:has-text("Sign In")');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.click('text=Sign In');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'WrongPassword');

    await page.click('button:has-text("Sign In")');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });

  test('should logout user', async ({ page }) => {
    // Login first
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');

    await expect(page).toHaveURL('/dashboard');

    // Logout
    await page.click('[aria-label="User menu"]');
    await page.click('text=Logout');

    await expect(page).toHaveURL('/login');
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL('/login');
  });
});
```

#### Instagram Connection E2E
```typescript
// e2e/instagram.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Instagram Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should connect Instagram account', async ({ page, context }) => {
    await page.click('text=Connect Instagram');

    // Wait for OAuth popup
    const popupPromise = context.waitForEvent('page');
    await page.click('button:has-text("Connect Account")');

    const popup = await popupPromise;
    await popup.waitForLoadState();

    // Simulate Instagram OAuth (in real test, this would be Instagram's flow)
    await expect(popup).toHaveURL(/instagram\.com/);

    // Close popup and verify connection
    await popup.close();

    await expect(page.locator('text=Connected: @test_account')).toBeVisible();
  });

  test('should display connected account info', async ({ page }) => {
    await page.goto('/settings/instagram');

    await expect(page.locator('text=@test_account')).toBeVisible();
    await expect(page.locator('text=Business Account')).toBeVisible();
  });

  test('should disconnect Instagram account', async ({ page }) => {
    await page.goto('/settings/instagram');

    await page.click('button:has-text("Disconnect")');

    // Confirm dialog
    await page.click('button:has-text("Yes, Disconnect")');

    await expect(page.locator('text=Account disconnected')).toBeVisible();
  });
});
```

#### Product Management E2E
```typescript
// e2e/products.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');
  });

  test('should create new product', async ({ page }) => {
    await page.goto('/products');
    await page.click('button:has-text("Add Product")');

    await page.fill('input[name="name"]', 'Test Product');
    await page.fill('textarea[name="description"]', 'Product description');
    await page.fill('input[name="price"]', '99.99');
    await page.fill('input[name="sku"]', 'TEST-001');
    await page.fill('input[name="stockQuantity"]', '50');

    await page.click('button:has-text("Create Product")');

    await expect(page.locator('text=Product created successfully')).toBeVisible();
    await expect(page.locator('text=Test Product')).toBeVisible();
  });

  test('should edit existing product', async ({ page }) => {
    await page.goto('/products');

    await page.click('[aria-label="Edit Premium Headphones"]');

    await page.fill('input[name="price"]', '349.99');
    await page.click('button:has-text("Save Changes")');

    await expect(page.locator('text=$349.99')).toBeVisible();
  });

  test('should delete product', async ({ page }) => {
    await page.goto('/products');

    await page.click('[aria-label="Delete Premium Headphones"]');

    // Confirm deletion
    await page.click('button:has-text("Yes, Delete")');

    await expect(page.locator('text=Product deleted')).toBeVisible();
  });

  test('should search products', async ({ page }) => {
    await page.goto('/products');

    await page.fill('input[placeholder*="Search"]', 'headphones');

    await expect(page.locator('text=Premium Headphones')).toBeVisible();
    await expect(page.locator('text=Laptop Stand')).not.toBeVisible();
  });

  test('should paginate products', async ({ page }) => {
    await page.goto('/products');

    // Assuming we have more than 10 products
    await expect(page.locator('[aria-label="Next page"]')).toBeVisible();

    await page.click('[aria-label="Next page"]');

    // URL should update with pagination
    await expect(page).toHaveURL(/page=2/);
  });
});
```

#### Message Sending E2E
```typescript
// e2e/messages.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Message Sending', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');
  });

  test('should send message to customer', async ({ page }) => {
    await page.goto('/messages');

    await page.click('text=customer1');

    await page.fill('textarea[name="message"]', 'Hello! How can I help you?');
    await page.click('button:has-text("Send")');

    await expect(page.locator('text=Hello! How can I help you?')).toBeVisible();
  });

  test('should send message with product', async ({ page }) => {
    await page.goto('/messages');

    await page.click('text=customer1');

    await page.click('[aria-label="Attach product"]');
    await page.click('text=Premium Headphones');

    await page.fill('textarea[name="message"]', 'Check out this product!');
    await page.click('button:has-text("Send")');

    await expect(page.locator('text=Premium Headphones')).toBeVisible();
    await expect(page.locator('text=$299.99')).toBeVisible();
  });

  test('should display conversation list', async ({ page }) => {
    await page.goto('/messages');

    await expect(page.locator('text=customer1')).toBeVisible();
    await expect(page.locator('text=customer2')).toBeVisible();
  });

  test('should show unread message count', async ({ page }) => {
    await page.goto('/messages');

    await expect(page.locator('[data-testid="unread-count"]')).toHaveText('2');
  });
});
```

### 7. Visual Regression Tests

```typescript
// e2e/visual.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage should match screenshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('product card should match screenshot', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');

    await page.goto('/products');

    const productCard = page.locator('[data-testid="product-card"]').first();
    await expect(productCard).toHaveScreenshot('product-card.png');
  });

  test('login form should match screenshot', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('form')).toHaveScreenshot('login-form.png');
  });

  test('dashboard should match screenshot', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button:has-text("Sign In")');

    await page.goto('/dashboard');
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });
});
```

### 8. Accessibility Tests

```typescript
// src/components/__tests__/accessibility.test.tsx

import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProductCard } from '@/components/products/ProductCard';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('Button component has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Input component has no accessibility violations', async () => {
    const { container } = render(<Input label="Email" name="email" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ProductCard has no accessibility violations', async () => {
    const mockProduct = {
      id: 'product-1',
      name: 'Test Product',
      price: 99.99,
      currency: 'USD' as const,
      imageUrls: ['https://example.com/image.jpg'],
      stockQuantity: 10,
      status: 'ACTIVE' as const,
    };

    const { container } = render(<ProductCard product={mockProduct} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Form has proper ARIA labels', async () => {
    const { container } = render(
      <form>
        <Input label="Email" name="email" required />
        <Input label="Password" name="password" type="password" required />
        <Button type="submit">Submit</Button>
      </form>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

#### Playwright Accessibility Tests
```typescript
// e2e/accessibility.spec.ts

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('homepage should not have accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login form should be keyboard accessible', async ({ page }) => {
    await page.goto('/login');

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('all interactive elements should have accessible names', async ({ page }) => {
    await page.goto('/products');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['cat.color'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

### 9. CI/CD Integration

#### GitHub Actions Workflow
```yaml
# .github/workflows/test-frontend.yml

name: Frontend Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Run unit tests
        working-directory: frontend
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/lcov.info
          flags: frontend
          name: frontend-coverage

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: screenshots
          path: test-results/
```

#### Package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:debug": "playwright test --debug"
  }
}
```

## Acceptance Criteria

### Setup & Configuration (4 criteria)
1. ✅ Jest is configured with React Testing Library and jsdom environment
2. ✅ MSW is configured with API mocks for all backend endpoints
3. ✅ Playwright is configured for cross-browser E2E testing
4. ✅ Test setup files configure global mocks and utilities

### Component Tests (6 criteria)
5. ✅ All UI components have unit tests with RTL
6. ✅ Component tests verify rendering, props, and user interactions
7. ✅ Component tests achieve 75%+ code coverage
8. ✅ Snapshot tests detect unintended UI changes
9. ✅ Form components validate input and error states
10. ✅ Loading and error states are tested

### Custom Hooks Tests (3 criteria)
11. ✅ All custom hooks have comprehensive tests
12. ✅ Hook tests verify state management and side effects
13. ✅ Hook tests use proper wrapper components (providers)

### Form Testing (4 criteria)
14. ✅ Form validation rules are tested
15. ✅ Form submission with valid data is tested
16. ✅ Form error handling is tested
17. ✅ Form initial values and edit mode are tested

### API Mocking (4 criteria)
18. ✅ MSW handlers mock all API endpoints
19. ✅ Mock handlers return realistic response data
20. ✅ Error scenarios are mocked (401, 404, 500)
21. ✅ Mock handlers can be overridden per test

### E2E Authentication Tests (3 criteria)
22. ✅ User registration flow is tested end-to-end
23. ✅ Login/logout flow is tested end-to-end
24. ✅ Protected route redirection is tested

### E2E Instagram Tests (3 criteria)
25. ✅ Instagram OAuth connection flow is tested
26. ✅ Account info display is tested
27. ✅ Account disconnection is tested

### E2E Product Tests (4 criteria)
28. ✅ Product creation flow is tested
29. ✅ Product editing flow is tested
30. ✅ Product deletion with confirmation is tested
31. ✅ Product search and pagination are tested

### E2E Message Tests (3 criteria)
32. ✅ Message sending flow is tested
33. ✅ Message with product attachment is tested
34. ✅ Conversation list display is tested

### Visual Regression (3 criteria)
35. ✅ Key pages have screenshot tests
36. ✅ Component screenshots detect visual changes
37. ✅ Visual tests run on multiple viewports

### Accessibility (4 criteria)
38. ✅ Components pass axe accessibility checks
39. ✅ Keyboard navigation is tested
40. ✅ ARIA labels are properly tested
41. ✅ Color contrast meets WCAG AA standards

### CI/CD (3 criteria)
42. ✅ Frontend tests run in GitHub Actions
43. ✅ E2E tests run with Playwright in CI
44. ✅ Test reports and screenshots are uploaded as artifacts

## Definition of Done

- [ ] Jest and React Testing Library are configured
- [ ] MSW API mocking is implemented
- [ ] Playwright E2E tests are configured
- [ ] All components have unit tests
- [ ] All custom hooks have tests
- [ ] Form validation is tested
- [ ] E2E authentication flow is tested
- [ ] E2E Instagram flow is tested
- [ ] E2E product management is tested
- [ ] E2E message sending is tested
- [ ] Visual regression tests are implemented
- [ ] Accessibility tests pass
- [ ] All 44 acceptance criteria are met
- [ ] Tests pass in CI pipeline
- [ ] Code reviewed and approved

## Related Tasks
- TEST-001: Unit Testing Setup (parallel)
- TEST-002: Integration Testing (parallel)
- All frontend implementation tasks

## Resources
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [MSW Documentation](https://mswjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
