# Social Selling Platform - Frontend

A production-ready Next.js 14 application for managing Instagram business conversations, content scheduling, and analytics.

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

3. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

4. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

5. Update `.env.local` with your API configuration

6. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and fix issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Check TypeScript types
- `npm run clean` - Clean build artifacts

## Project Structure

```
src/
├── app/              # Next.js pages and routes
│   ├── api/         # API routes
│   ├── layout.tsx   # Root layout
│   ├── page.tsx     # Home page
│   └── globals.css  # Global styles
├── components/      # React components
│   ├── layout/      # Layout components
│   ├── ui/          # UI components
│   └── common/      # Common components
├── lib/             # Utilities and stores
│   ├── api/         # API client and endpoints
│   ├── hooks/       # Custom React hooks
│   ├── store/       # Zustand stores
│   └── utils/       # Utility functions
├── types/           # TypeScript type definitions
│   ├── api.ts
│   ├── auth.ts
│   └── common.ts
└── middleware.ts    # Next.js middleware for route protection
```

## Technology Stack

### Core
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript 5** - Type-safe JavaScript

### Styling
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Lucide React** - Icon library

### State Management
- **Zustand 4.5** - Lightweight state management
- **React Context** - For app-wide state

### Form Handling
- **React Hook Form 7.50** - Efficient form management
- **Zod 3.22** - Schema validation

### HTTP Client
- **Axios 1.6** - HTTP client with interceptors

### UI Components
- **@radix-ui** - Accessible component library
- **shadcn/ui** - Built on Radix UI

## Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Instagram OAuth
NEXT_PUBLIC_INSTAGRAM_CLIENT_ID=your_instagram_client_id
NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/instagram/callback

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true

# Environment
NEXT_PUBLIC_ENV=development
```

## Key Features

### Authentication
- User registration and login
- JWT token management
- Automatic token refresh
- Route protection

### API Integration
- Centralized API client with interceptors
- Request/response handling
- Error management
- File upload support

### State Management
- Auth store (Zustand)
- UI store for sidebar and theme
- Persistent storage

### Custom Hooks
- `useAuth` - Authentication management
- `useToast` - Toast notifications
- `useApi` - API data fetching (extensible)

### Layout
- Responsive header with user menu
- Collapsible sidebar navigation
- Footer with links
- Mobile-friendly design

## Development Guidelines

### TypeScript
- Strict mode enabled
- Comprehensive type definitions
- Type-safe API calls

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- Pre-commit hooks (configurable)

### Components
- Functional components with hooks
- Reusable and maintainable
- Proper prop typing
- Semantic HTML

### Styling
- Tailwind CSS utility-first approach
- Custom color palette (purple theme)
- Dark mode support (configurable)
- Responsive design

## Testing

### Running Tests
```bash
npm test
```

### Test Types
- Unit tests for utilities and hooks
- Component tests with React Testing Library
- API mocking with MSW (Mock Service Worker)

## Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Update `.env.production.local` with production URLs
2. Ensure API URL points to production backend
3. Configure Instagram OAuth credentials
4. Set feature flags appropriately

## Troubleshooting

### Port Already in Use
```bash
# Change port in package.json dev script
next dev -p 3001
```

### Module Not Found
```bash
# Clear cache and reinstall
npm run clean
npm install
```

### TypeScript Errors
```bash
# Check all types
npm run type-check

# Fix auto-fixable errors
npm run lint:fix
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests
4. Create a pull request

## Related Tasks

- **FE-001** (this task) - Next.js Project Initialization
- **FE-002** - Authentication Pages (Login & Register)
- **FE-003** - Dashboard Layout
- **FE-004** - Dashboard Overview
- **FE-005** - Unified Inbox
- **FE-006** - Content Calendar
- **FE-007** - Analytics Dashboard
- **FE-008** - Client Account Management
- **FE-009** - Settings Page
- **FE-010** - WebSocket Real-time Updates
- **FE-011** - Loading States & Error Handling
- **FE-012** - Responsive Design

## License

Proprietary - Social Selling Platform
