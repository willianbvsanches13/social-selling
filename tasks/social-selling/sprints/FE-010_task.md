# FE-010: Settings Page

## Epic
Frontend Development - Phase 3

## Story
As a user, I want to manage my account settings, preferences, and connected accounts so that I can customize my experience, control notifications, manage billing, and maintain my account security.

## Description
Build a comprehensive settings page with multiple sections including profile management, password change, notification preferences, connected Instagram accounts, billing information, API keys, language/timezone settings, privacy controls, and account deletion. The settings should be organized in a tabbed or sectioned layout for easy navigation.

## Priority
HIGH

## Estimated Story Points
13

## Acceptance Criteria

1. **Settings Page Layout**
   - Sidebar navigation with icons for each settings section
   - Active section highlighted in sidebar
   - Responsive layout: sidebar collapses to dropdown on mobile
   - Smooth transitions between sections
   - Breadcrumb navigation showing current section
   - Save/discard changes prompt when navigating away with unsaved changes

2. **Profile Settings Form**
   - Input fields: First name, Last name, Email, Username, Bio, Website URL
   - Phone number with country code selector
   - Company/Business name (optional)
   - Job title (optional)
   - Location (city, country)
   - Real-time form validation
   - Character count for bio (max 500 characters)
   - URL validation for website
   - Email format validation
   - Save button enables only when changes detected
   - Success toast on save
   - Error handling for duplicate email/username

3. **Change Password Functionality**
   - Current password field with show/hide toggle
   - New password field with strength indicator
   - Confirm new password field
   - Password requirements display: 8+ chars, uppercase, lowercase, number, special char
   - Real-time password strength calculation
   - Passwords must match validation
   - Success message and auto-logout on password change
   - Two-factor authentication prompt after password change

4. **Notification Preferences**
   - Email notifications toggles: New followers, Comments, Mentions, Direct messages, Weekly summary
   - Push notifications toggles: Real-time engagement, Scheduled post reminders, System updates
   - In-app notifications toggles: Activity feed, Recommendations
   - Quiet hours configuration: Start time, End time, Days of week
   - Notification frequency selector: Real-time, Hourly digest, Daily digest
   - Test notification button
   - Save notification preferences
   - Visual feedback for saved settings

5. **Connected Instagram Accounts Management**
   - List of connected Instagram accounts with avatar and username
   - Primary account indicator
   - Set as primary button for each account
   - Disconnect account button with confirmation modal
   - Add new account button triggering OAuth flow
   - Account status indicators: Active, Expired token, Limited access
   - Reconnect button for expired accounts
   - Last synced timestamp for each account
   - Account statistics preview: followers, posts count

6. **Billing and Subscription Details**
   - Current plan display: Plan name, Price, Billing cycle
   - Plan features list
   - Usage statistics: API calls, Storage used, Posts scheduled
   - Upgrade/Downgrade plan buttons
   - Next billing date
   - Payment method display: Card brand, Last 4 digits, Expiry
   - Update payment method button
   - Billing history table: Date, Amount, Status, Invoice link
   - Cancel subscription button with retention flow
   - Pause subscription option

7. **API Keys Generation and Management**
   - List of existing API keys with names and creation dates
   - Create new API key button
   - API key name input on creation
   - Generated key display with copy button (shown once)
   - Revoke key button with confirmation
   - Last used timestamp for each key
   - Key permissions/scopes display
   - API documentation link
   - Usage statistics per key
   - Rate limit information

8. **Language and Timezone Selectors**
   - Language dropdown with flag icons
   - Supported languages: English, Spanish, Portuguese, French, German
   - Timezone selector with search functionality
   - Auto-detect timezone button
   - Date format preview
   - Time format selector: 12-hour, 24-hour
   - First day of week selector: Sunday, Monday
   - Number format selector: 1,000.00 vs 1.000,00
   - Currency selector for display purposes

9. **Privacy Settings Toggles**
   - Profile visibility: Public, Private, Followers only
   - Show email to others toggle
   - Show activity status toggle
   - Allow search engines to index profile
   - Data collection consent toggles
   - Analytics tracking toggle
   - Third-party integrations access toggle
   - Download my data button
   - Privacy policy link
   - Data retention settings

10. **Account Deletion with Confirmation**
    - Delete account button in danger zone
    - Multi-step confirmation modal
    - Reason for deletion dropdown
    - Optional feedback text area
    - Type "DELETE" to confirm
    - Final warning about data loss
    - Delete immediately vs Schedule deletion
    - Email confirmation sent
    - Grace period information (30 days to cancel)
    - Export data before deletion option

11. **Settings Tabs/Sections Navigation**
    - Sections: Profile, Account, Notifications, Connected Accounts, Billing, Security, Privacy, Advanced
    - Deep linking support (URL reflects current section)
    - Keyboard navigation support (arrow keys)
    - Scroll to section on click
    - Sticky navigation on scroll
    - Mobile: Accordion-style or full-screen sections

12. **Form Validation**
    - Client-side validation before submission
    - Server-side validation error display
    - Inline error messages below fields
    - Error summary at top of form
    - Required field indicators
    - Proper HTML5 input types
    - Accessible error announcements

13. **Auto-save Functionality**
    - Auto-save drafts for forms (optional toggle)
    - Saving indicator
    - Last saved timestamp
    - Conflict resolution if edited elsewhere
    - Restore previous version option

14. **Two-Factor Authentication**
    - Enable 2FA toggle
    - QR code generation for authenticator app
    - Backup codes generation and download
    - SMS 2FA option with phone verification
    - Trusted devices list
    - Remove trusted device button

15. **Session Management**
    - Active sessions list with device info, location, last active
    - Current session indicator
    - Logout from specific session button
    - Logout from all other sessions button
    - Session security information

16. **Email Preferences**
    - Subscribe to newsletter toggle
    - Marketing emails toggle
    - Product updates toggle
    - Unsubscribe from all button
    - Email frequency selector

17. **Appearance Settings**
    - Theme selector: Light, Dark, System
    - Accent color picker
    - Font size selector: Small, Medium, Large
    - Compact mode toggle
    - Preview of theme changes

18. **Data Export**
    - Export all data button
    - Select specific data types: Profile, Posts, Comments, Analytics
    - Export format: JSON, CSV
    - Email when export is ready
    - Download link expiration notice
    - Export history table

19. **Integration Settings**
    - Connected third-party apps list
    - App permissions display
    - Revoke access button
    - Add new integration button
    - Integration categories: Analytics, CRM, E-commerce

20. **Security Settings**
    - Login history table: Date, Location, Device, IP address
    - Suspicious activity alerts
    - Change email functionality
    - Recovery email setup
    - Security questions configuration

21. **Advanced Settings**
    - Developer mode toggle
    - Debug logs toggle
    - Beta features opt-in
    - Experimental features list with descriptions
    - Reset all settings to default button
    - Clear cache button

22. **Accessibility Settings**
    - Reduced motion toggle
    - High contrast mode toggle
    - Screen reader optimizations toggle
    - Keyboard shortcuts customization
    - Font accessibility options

## Technical Implementation Details

### Component Structure

```typescript
// src/app/settings/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock, Bell, Instagram, CreditCard, Key, Globe, Shield, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { PasswordSettings } from '@/components/settings/PasswordSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { ConnectedAccounts } from '@/components/settings/ConnectedAccounts';
import { BillingSettings } from '@/components/settings/BillingSettings';
import { ApiKeysSettings } from '@/components/settings/ApiKeysSettings';
import { LanguageTimezone } from '@/components/settings/LanguageTimezone';
import { PrivacySettings } from '@/components/settings/PrivacySettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { AdvancedSettings } from '@/components/settings/AdvancedSettings';
import { UnsavedChangesModal } from '@/components/settings/UnsavedChangesModal';

type SettingsSection =
  | 'profile'
  | 'password'
  | 'notifications'
  | 'accounts'
  | 'billing'
  | 'api'
  | 'language'
  | 'privacy'
  | 'security'
  | 'advanced';

interface NavigationItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAVIGATION: NavigationItem[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your personal information',
  },
  {
    id: 'password',
    label: 'Password',
    icon: Lock,
    description: 'Change your password and security settings',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Configure your notification preferences',
  },
  {
    id: 'accounts',
    label: 'Connected Accounts',
    icon: Instagram,
    description: 'Manage your connected Instagram accounts',
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: CreditCard,
    description: 'View and manage your subscription',
  },
  {
    id: 'api',
    label: 'API Keys',
    icon: Key,
    description: 'Generate and manage API keys',
  },
  {
    id: 'language',
    label: 'Language & Region',
    icon: Globe,
    description: 'Set your language and timezone',
  },
  {
    id: 'privacy',
    label: 'Privacy',
    icon: Shield,
    description: 'Control your privacy settings',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Lock,
    description: 'Manage security and sessions',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: SettingsIcon,
    description: 'Advanced settings and developer options',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    (searchParams.get('section') as SettingsSection) || 'profile'
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingSection, setPendingSection] = useState<SettingsSection | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSectionChange = (section: SettingsSection) => {
    if (hasUnsavedChanges) {
      setPendingSection(section);
      setShowUnsavedModal(true);
    } else {
      navigateToSection(section);
    }
  };

  const navigateToSection = (section: SettingsSection) => {
    setActiveSection(section);
    router.push(`/settings?section=${section}`, { scroll: false });
    setIsMobileMenuOpen(false);
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    if (pendingSection) {
      navigateToSection(pendingSection);
      setPendingSection(null);
    }
  };

  const handleSaveChanges = async () => {
    // Trigger save on current section
    // This would be implemented by the active section component
    setShowUnsavedModal(false);
  };

  const renderSection = () => {
    const sectionProps = {
      onUnsavedChanges: setHasUnsavedChanges,
    };

    switch (activeSection) {
      case 'profile':
        return <ProfileSettings {...sectionProps} />;
      case 'password':
        return <PasswordSettings {...sectionProps} />;
      case 'notifications':
        return <NotificationSettings {...sectionProps} />;
      case 'accounts':
        return <ConnectedAccounts {...sectionProps} />;
      case 'billing':
        return <BillingSettings {...sectionProps} />;
      case 'api':
        return <ApiKeysSettings {...sectionProps} />;
      case 'language':
        return <LanguageTimezone {...sectionProps} />;
      case 'privacy':
        return <PrivacySettings {...sectionProps} />;
      case 'security':
        return <SecuritySettings {...sectionProps} />;
      case 'advanced':
        return <AdvancedSettings {...sectionProps} />;
      default:
        return <ProfileSettings {...sectionProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <SettingsIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Breadcrumb */}
          <div className="mt-4 flex items-center text-sm text-gray-600">
            <span>Settings</span>
            <span className="mx-2">/</span>
            <span className="text-gray-900 font-medium">
              {NAVIGATION.find((item) => item.id === activeSection)?.label}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside
            className={`lg:w-64 flex-shrink-0 ${
              isMobileMenuOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <nav className="bg-white rounded-lg border border-gray-200 overflow-hidden sticky top-8">
              {NAVIGATION.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left ${
                      isActive
                        ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700'
                        : 'border-l-4 border-transparent text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border border-gray-200">
              {renderSection()}
            </div>
          </main>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        onDiscard={handleDiscardChanges}
        onSave={handleSaveChanges}
      />
    </div>
  );
}
```

```typescript
// src/components/settings/ProfileSettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Upload, X, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { settingsService } from '@/services/settingsService';
import { AvatarUpload } from '@/components/settings/AvatarUpload';
import { CountryCodeSelector } from '@/components/settings/CountryCodeSelector';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  phoneNumber: z.string().optional(),
  countryCode: z.string().default('+1'),
  companyName: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSettingsProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

export function ProfileSettings({ onUnsavedChanges }: ProfileSettingsProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: settingsService.getProfile,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: settingsService.updateProfile,
    onSuccess: () => {
      toast.success('Profile updated successfully');
      onUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  useEffect(() => {
    if (profile) {
      reset(profile);
      setAvatarUrl(profile.avatarUrl);
    }
  }, [profile, reset]);

  useEffect(() => {
    onUnsavedChanges(isDirty);
  }, [isDirty, onUnsavedChanges]);

  const bioLength = watch('bio')?.length || 0;

  const onSubmit = async (data: ProfileFormData) => {
    await updateProfileMutation.mutateAsync({
      ...data,
      avatarUrl,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
        <p className="text-gray-600 mt-1">Update your personal information and profile details</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
          <AvatarUpload
            currentUrl={avatarUrl}
            onUpload={setAvatarUrl}
            onRemove={() => setAvatarUrl(null)}
          />
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              id="firstName"
              type="text"
              {...register('firstName')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              id="lastName"
              type="text"
              {...register('lastName')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            type="text"
            {...register('username')}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.username ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            {...register('bio')}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              errors.bio ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Tell us about yourself..."
          />
          <div className="flex items-center justify-between mt-1">
            {errors.bio && (
              <p className="text-sm text-red-600">{errors.bio.message}</p>
            )}
            <p className={`text-sm ml-auto ${bioLength > 500 ? 'text-red-600' : 'text-gray-500'}`}>
              {bioLength}/500
            </p>
          </div>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            id="website"
            type="url"
            {...register('website')}
            placeholder="https://example.com"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.website ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.website && (
            <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <CountryCodeSelector
            phoneNumber={watch('phoneNumber') || ''}
            countryCode={watch('countryCode')}
            onPhoneChange={(value) => register('phoneNumber').onChange({ target: { value } })}
            onCountryCodeChange={(value) => register('countryCode').onChange({ target: { value } })}
          />
          {errors.phoneNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
          )}
        </div>

        {/* Company Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              id="companyName"
              type="text"
              {...register('companyName')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              id="jobTitle"
              type="text"
              {...register('jobTitle')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              id="city"
              type="text"
              {...register('city')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              id="country"
              type="text"
              {...register('country')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isDirty || updateProfileMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {updateProfileMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
```

```typescript
// src/components/settings/PasswordSettings.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { settingsService } from '@/services/settingsService';
import { useRouter } from 'next/navigation';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

interface PasswordSettingsProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

export function PasswordSettings({ onUnsavedChanges }: PasswordSettingsProps) {
  const router = useRouter();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const changePasswordMutation = useMutation({
    mutationFn: settingsService.changePassword,
    onSuccess: () => {
      toast.success('Password changed successfully. Please log in again.');
      reset();
      // Redirect to login after password change
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to change password');
    },
  });

  const newPassword = watch('newPassword', '');

  const passwordStrength = () => {
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;
    return strength;
  };

  const getStrengthLabel = () => {
    const strength = passwordStrength();
    if (strength <= 2) return { label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { label: 'Good', color: 'bg-blue-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter', met: /[a-z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const onSubmit = async (data: PasswordFormData) => {
    await changePasswordMutation.mutateAsync({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Change Password</h2>
        <p className="text-gray-600 mt-1">Update your password to keep your account secure</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg space-y-6">
        {/* Current Password */}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              {...register('currentPassword')}
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.currentPassword ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              {...register('newPassword')}
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.newPassword ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>
          )}

          {/* Password Strength Indicator */}
          {newPassword && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Password strength:</span>
                <span className={`text-sm font-medium ${getStrengthLabel().color.replace('bg-', 'text-')}`}>
                  {getStrengthLabel().label}
                </span>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded ${
                      i < passwordStrength() ? getStrengthLabel().color : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Password Requirements */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements:</h4>
          <ul className="space-y-1">
            {requirements.map((req, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                {req.met ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-gray-400" />
                )}
                <span className={req.met ? 'text-green-700' : 'text-gray-600'}>
                  {req.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {changePasswordMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Changing Password...
              </>
            ) : (
              'Change Password'
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Security Note:</strong> After changing your password, you'll be logged out and need to sign in again with your new password.
          </p>
        </div>
      </form>
    </div>
  );
}
```

```typescript
// src/services/settingsService.ts
import { apiClient } from '@/lib/apiClient';

export const settingsService = {
  // Profile
  async getProfile() {
    const response = await apiClient.get('/settings/profile');
    return response.data;
  },

  async updateProfile(data: any) {
    const response = await apiClient.put('/settings/profile', data);
    return response.data;
  },

  // Password
  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await apiClient.post('/settings/password/change', data);
    return response.data;
  },

  // Notifications
  async getNotificationSettings() {
    const response = await apiClient.get('/settings/notifications');
    return response.data;
  },

  async updateNotificationSettings(data: any) {
    const response = await apiClient.put('/settings/notifications', data);
    return response.data;
  },

  // Connected Accounts
  async getConnectedAccounts() {
    const response = await apiClient.get('/settings/accounts');
    return response.data;
  },

  async disconnectAccount(accountId: string) {
    const response = await apiClient.delete(`/settings/accounts/${accountId}`);
    return response.data;
  },

  async setPrimaryAccount(accountId: string) {
    const response = await apiClient.post(`/settings/accounts/${accountId}/set-primary`);
    return response.data;
  },

  // Billing
  async getBillingInfo() {
    const response = await apiClient.get('/settings/billing');
    return response.data;
  },

  async getBillingHistory() {
    const response = await apiClient.get('/settings/billing/history');
    return response.data;
  },

  // API Keys
  async getApiKeys() {
    const response = await apiClient.get('/settings/api-keys');
    return response.data;
  },

  async createApiKey(name: string) {
    const response = await apiClient.post('/settings/api-keys', { name });
    return response.data;
  },

  async revokeApiKey(keyId: string) {
    const response = await apiClient.delete(`/settings/api-keys/${keyId}`);
    return response.data;
  },

  // Privacy
  async getPrivacySettings() {
    const response = await apiClient.get('/settings/privacy');
    return response.data;
  },

  async updatePrivacySettings(data: any) {
    const response = await apiClient.put('/settings/privacy', data);
    return response.data;
  },

  // Account Deletion
  async deleteAccount(data: { reason: string; feedback?: string; confirmation: string }) {
    const response = await apiClient.post('/settings/account/delete', data);
    return response.data;
  },
};
```

## Testing Requirements

### Unit Tests
- Test form validation for all settings sections
- Test password strength calculation
- Test avatar upload functionality
- Test API key generation
- Test notification preferences updates

### Integration Tests
- Test profile update flow end-to-end
- Test password change and logout
- Test account connection/disconnection
- Test billing information display
- Test settings navigation

### E2E Tests
- Complete settings management flow
- Navigate between different settings sections
- Update profile with validation errors
- Change password successfully
- Connect and disconnect Instagram accounts
- Generate and revoke API keys

## Dependencies
```json
{
  "react-hook-form": "^7.49.0",
  "@hookform/resolvers": "^3.3.0",
  "zod": "^3.22.0",
  "@tanstack/react-query": "^5.0.0",
  "react-hot-toast": "^2.4.1",
  "lucide-react": "^0.300.0",
  "react-image-crop": "^10.1.0"
}
```

## Definition of Done
- [ ] All 22 acceptance criteria implemented
- [ ] All settings sections functional
- [ ] Form validation working correctly
- [ ] Password change with security features
- [ ] Connected accounts management
- [ ] Billing information display
- [ ] API keys generation and management
- [ ] Privacy settings implemented
- [ ] Account deletion with confirmation
- [ ] Responsive design on all devices
- [ ] Unit tests with >80% coverage
- [ ] Integration tests passing
- [ ] E2E tests covering main flows
- [ ] Accessibility compliance
- [ ] Code review completed
- [ ] Documentation updated

## Notes
- Implement auto-save for non-critical settings
- Add confirmation modals for destructive actions
- Use optimistic updates for better UX
- Implement proper error handling and recovery
- Add analytics tracking for settings changes
- Consider implementing settings import/export
- Add keyboard shortcuts for power users
