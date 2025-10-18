# FE-011: Profile Page

## Epic
Frontend Development - Phase 3

## Story
As a user, I want to view and edit my profile, manage my avatar, see my activity timeline, and share my profile with others so that I can maintain a professional presence and track my account activity.

## Description
Build a comprehensive user profile page that displays user information, allows profile editing through a modal, supports avatar upload with image cropping, shows account completeness, displays activity timeline, manages connected social accounts, generates shareable profile links, and provides profile customization options.

## Priority
HIGH

## Estimated Story Points
13

## Acceptance Criteria

1. **User Profile Display**
   - Large avatar display at top of profile
   - User's full name prominently displayed
   - Username with @ symbol
   - Email address (with privacy toggle visibility)
   - Bio/description text with proper formatting
   - Website URL as clickable link
   - Location information with icon
   - Member since date
   - Last active timestamp
   - Profile views counter
   - Verified badge if applicable

2. **Edit Profile Modal**
   - Modal opens from "Edit Profile" button
   - Form includes all editable profile fields
   - Real-time character counting for bio
   - Form validation before submission
   - Cancel button to discard changes
   - Save button with loading state
   - Success/error notifications
   - Modal closes on successful save
   - Keyboard shortcut to open (Ctrl/Cmd + E)
   - Modal overlay closes on click outside

3. **Avatar Upload with Image Cropping**
   - Click avatar to open upload dialog
   - Drag and drop support for image upload
   - File type validation (jpg, png, gif, webp)
   - File size limit (max 5MB)
   - Image cropping interface with aspect ratio lock (1:1)
   - Zoom in/out controls for cropping
   - Rotate image controls
   - Preview of cropped image
   - Upload progress indicator
   - Remove avatar option
   - Default avatar fallback

4. **Profile Completeness Progress Bar**
   - Circular or linear progress indicator
   - Percentage display (0-100%)
   - Breakdown of completed vs missing items
   - Checklist of profile completion items
   - Items: Avatar, Bio, Website, Location, Phone, Social accounts
   - Each item shows completion status
   - Click item to navigate to edit that field
   - Celebration animation at 100% completion
   - Gamification badges for milestones

5. **Activity Timeline with Recent Actions**
   - Chronological list of user activities
   - Activity types: Profile updates, Posts created, Comments, Follows, Unfollows
   - Each activity shows: Icon, Description, Timestamp, Related entity
   - Relative time display (2 hours ago, 3 days ago)
   - Load more button for pagination
   - Infinite scroll option
   - Filter by activity type
   - Date range filter
   - Export activity log option
   - Activity privacy controls

6. **Connected Social Accounts List**
   - List of all connected platforms (Instagram, Facebook, Twitter, LinkedIn)
   - Each platform shows: Logo, Account name, Connection status, Last synced
   - Connect button for unconnected platforms
   - Disconnect button for connected platforms
   - Primary account designation
   - Account health indicators (active, needs reauth, error)
   - Follower count from each platform
   - Quick actions: View profile, Sync now
   - OAuth flow for new connections

7. **Profile Sharing Link Generation**
   - "Share Profile" button
   - Generate unique shareable URL
   - Copy link button with success feedback
   - QR code generation for profile link
   - Download QR code option
   - Share via email, SMS, WhatsApp, social media
   - Link preview customization
   - Analytics for link clicks
   - Temporary vs permanent links
   - Link expiration settings

8. **Profile Theme/Customization Options**
   - Theme selector: Light, Dark, Auto
   - Accent color picker (6-10 preset colors)
   - Cover photo upload and positioning
   - Profile layout options: Classic, Modern, Minimal
   - Font style selection
   - Background pattern options
   - Custom CSS input for advanced users
   - Preview mode before applying
   - Reset to default theme button
   - Save theme as preset

9. **User Statistics Summary**
   - Statistics cards in grid layout
   - Total posts created
   - Total engagement received
   - Average engagement rate
   - Follower growth this month
   - Top performing post
   - Content categories breakdown
   - Posting frequency stats
   - Best posting times
   - Audience demographics summary
   - Link to full analytics dashboard

10. **Edit Profile Picture**
    - Dedicated "Change Photo" button on avatar
    - Upload from device
    - Capture from webcam option
    - Choose from previous uploads
    - Remove current photo
    - Zoom and reposition interface
    - Filters and adjustments (brightness, contrast)
    - Preview before saving
    - Optimistic UI update
    - Rollback on upload failure

11. **Profile Visibility Settings**
    - Public/Private profile toggle
    - Who can view profile: Everyone, Followers only, Only me
    - Hide specific fields from public view
    - Search engine visibility toggle
    - Activity visibility settings
    - Profile in directory toggle
    - Custom privacy per section

12. **Profile Badge System**
    - Display earned badges on profile
    - Badge categories: Achievements, Milestones, Special events
    - Badge details on hover
    - Badge grid or carousel layout
    - Badge sharing options
    - Badge progress tracking
    - Unlock criteria display for locked badges
    - Notification on new badge earned

13. **Contact Information Section**
    - Phone number with privacy settings
    - Business email (separate from login email)
    - Physical address (optional)
    - Working hours/availability
    - Preferred contact method
    - Contact form integration
    - Social media handles display
    - Calendar booking link

14. **Professional Information**
    - Job title/role
    - Company/Organization
    - Industry sector
    - Years of experience
    - Skills and expertise tags
    - Certifications and licenses
    - Portfolio links
    - Resume/CV upload
    - LinkedIn integration

15. **Profile Sections Management**
    - Reorderable sections via drag-and-drop
    - Show/hide sections toggle
    - Add custom sections
    - Section templates: About, Experience, Education, Projects
    - Rich text editor for section content
    - Media embedding in sections
    - Section privacy controls

16. **Followers and Following Display**
    - Follower count with growth indicator
    - Following count
    - "View All" links to separate pages
    - Recent followers avatars preview
    - Mutual connections display
    - Follow/Unfollow actions
    - Follower quality score
    - Remove followers option

17. **Profile Verification**
    - Verification status indicator
    - Apply for verification button
    - Verification requirements checklist
    - Document upload for verification
    - Verification application status tracking
    - Verified badge display
    - Verification benefits explanation
    - Appeal process for rejections

18. **Profile Insights and Analytics**
    - Profile views over time graph
    - Visitor demographics
    - Referral sources
    - Most viewed sections
    - Engagement metrics
    - Search appearances
    - Click-through rates
    - Conversion tracking
    - Export insights report

19. **Related Profiles Suggestions**
    - "People you may know" section
    - Algorithm-based recommendations
    - Mutual connections indicator
    - Industry/interest matching
    - Follow suggestions
    - Dismiss suggestion option
    - Refresh suggestions button
    - Privacy controls for appearing in suggestions

20. **Profile Backup and Export**
    - Export entire profile data
    - Download as JSON/PDF
    - Include all sections: Info, Posts, Comments, Media
    - Scheduled automatic backups
    - Backup history
    - Restore from backup option
    - GDPR compliance features
    - Data portability

21. **Profile URL Customization**
    - Custom vanity URL input
    - URL availability checker
    - URL format validation
    - Update URL with redirects from old URL
    - URL change history
    - SEO-friendly URL suggestions
    - URL preview

22. **Multi-language Profile Support**
    - Add translations for bio and other fields
    - Language selector for visitors
    - Auto-translate option
    - Primary language designation
    - Translation quality indicators
    - Professional translation service integration

## Technical Implementation Details

### Component Structure

```typescript
// src/app/profile/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  Camera,
  Share2,
  MapPin,
  Calendar,
  Globe,
  Mail,
  Phone,
  Award,
  TrendingUp,
  Users,
  Link as LinkIcon,
  QrCode,
  Download,
  Settings,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { profileService } from '@/services/profileService';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { AvatarCropModal } from '@/components/profile/AvatarCropModal';
import { ShareProfileModal } from '@/components/profile/ShareProfileModal';
import { ProfileCompletenessCard } from '@/components/profile/ProfileCompletenessCard';
import { ActivityTimeline } from '@/components/profile/ActivityTimeline';
import { ConnectedAccountsCard } from '@/components/profile/ConnectedAccountsCard';
import { StatisticsGrid } from '@/components/profile/StatisticsGrid';
import { ProfileBadges } from '@/components/profile/ProfileBadges';
import { ThemeCustomizer } from '@/components/profile/ThemeCustomizer';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  bio?: string;
  website?: string;
  location?: string;
  phone?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  joinedAt: string;
  lastActiveAt: string;
  isVerified: boolean;
  profileViews: number;
  theme: {
    mode: 'light' | 'dark' | 'auto';
    accentColor: string;
    layout: 'classic' | 'modern' | 'minimal';
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'followers';
    showEmail: boolean;
    showPhone: boolean;
    searchable: boolean;
  };
  stats: {
    totalPosts: number;
    totalEngagement: number;
    avgEngagementRate: number;
    followerGrowth: number;
  };
  completeness: {
    percentage: number;
    items: Array<{
      id: string;
      label: string;
      completed: boolean;
    }>;
  };
  connectedAccounts: Array<{
    id: string;
    platform: string;
    accountName: string;
    status: 'active' | 'expired' | 'error';
    isPrimary: boolean;
    lastSynced: string;
    followerCount: number;
  }>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    iconUrl: string;
    earnedAt: string;
  }>;
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: profileService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile');
    },
  });

  const updateAvatarMutation = useMutation({
    mutationFn: profileService.updateAvatar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile picture updated');
      setIsAvatarModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update profile picture');
    },
  });

  const generateShareLinkMutation = useMutation({
    mutationFn: profileService.generateShareLink,
    onSuccess: (data) => {
      toast.success('Share link generated');
      return data;
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to generate share link');
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <div className="bg-white rounded-b-lg p-6 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600">Unable to load your profile information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Photo Section */}
      <div className="relative h-48 bg-gradient-to-r from-blue-500 to-purple-600">
        {profile.coverPhotoUrl ? (
          <img
            src={profile.coverPhotoUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
        )}

        {/* Edit Cover Button */}
        <button
          className="absolute bottom-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-sm text-gray-900 rounded-lg hover:bg-white transition-colors flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          <span className="text-sm font-medium">Edit Cover</span>
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="relative -mt-16 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              {/* Avatar */}
              <div className="relative">
                <button
                  onClick={() => setIsAvatarModalOpen(true)}
                  className="group relative block"
                >
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={`${profile.firstName} ${profile.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-4xl font-bold">
                        {profile.firstName[0]}{profile.lastName[0]}
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </button>
                {profile.isVerified && (
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      {profile.firstName} {profile.lastName}
                      {profile.isVerified && (
                        <Award className="w-6 h-6 text-blue-600" title="Verified" />
                      )}
                    </h1>
                    <p className="text-gray-600 mt-1">@{profile.username}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsShareModalOpen(true)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Share Profile"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsThemeCustomizerOpen(true)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Customize Theme"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </button>
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="mt-4 text-gray-700 leading-relaxed">{profile.bio}</p>
                )}

                {/* Contact Info */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {profile.privacy.showEmail && (
                    <div className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {profile.email}
                    </div>
                  )}
                  {profile.privacy.showPhone && profile.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {profile.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(profile.joinedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {/* Profile Views */}
                <div className="mt-3 text-sm text-gray-500">
                  {profile.profileViews.toLocaleString()} profile views
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Completeness */}
            <ProfileCompletenessCard
              percentage={profile.completeness.percentage}
              items={profile.completeness.items}
            />

            {/* Connected Accounts */}
            <ConnectedAccountsCard accounts={profile.connectedAccounts} />

            {/* Badges */}
            {profile.badges.length > 0 && (
              <ProfileBadges badges={profile.badges} />
            )}
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statistics */}
            <StatisticsGrid stats={profile.stats} />

            {/* Activity Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
              <ActivityTimeline userId={profile.id} />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={profile}
        onSave={updateProfileMutation.mutate}
        isLoading={updateProfileMutation.isPending}
      />

      <AvatarCropModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={profile.avatarUrl}
        onSave={updateAvatarMutation.mutate}
        isLoading={updateAvatarMutation.isPending}
      />

      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        profile={profile}
        onGenerateLink={generateShareLinkMutation.mutate}
      />

      <ThemeCustomizer
        isOpen={isThemeCustomizerOpen}
        onClose={() => setIsThemeCustomizerOpen(false)}
        currentTheme={profile.theme}
      />
    </div>
  );
}
```

```typescript
// src/components/profile/EditProfileModal.tsx
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onSave: (data: ProfileFormData) => void;
  isLoading: boolean;
}

export function EditProfileModal({
  isOpen,
  onClose,
  profile,
  onSave,
  isLoading,
}: EditProfileModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile,
  });

  useEffect(() => {
    if (profile) {
      reset(profile);
    }
  }, [profile, reset]);

  const bioLength = watch('bio')?.length || 0;

  const onSubmit = (data: ProfileFormData) => {
    onSave(data);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* First Name & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
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

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input
                type="text"
                {...register('username')}
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
            {errors.username && (
              <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              {...register('bio')}
              rows={4}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input
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

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              {...register('location')}
              placeholder="City, Country"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.location ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              {...register('phone')}
              placeholder="+1 (555) 123-4567"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
```

```typescript
// src/components/profile/AvatarCropModal.tsx
'use client';

import { useState, useCallback } from 'react';
import { X, Upload, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Modal } from '@/components/ui/Modal';

interface AvatarCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string;
  onSave: (file: Blob) => void;
  isLoading: boolean;
}

export function AvatarCropModal({
  isOpen,
  onClose,
  currentAvatar,
  onSave,
  isLoading,
}: AvatarCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 90,
    height: 90,
    x: 5,
    y: 5,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        alert('File must be an image (jpg, png, gif, or webp)');
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result?.toString() || null);
      });
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = useCallback(async () => {
    if (!imageRef || !completedCrop) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scaleX = imageRef.naturalWidth / imageRef.width;
    const scaleY = imageRef.naturalHeight / imageRef.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      imageRef,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  }, [imageRef, completedCrop]);

  const handleSave = async () => {
    const croppedImage = await getCroppedImg();
    if (croppedImage) {
      onSave(croppedImage);
    }
  };

  const handleRotate = () => {
    setRotate((prev) => (prev + 90) % 360);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Update Profile Picture</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!imageSrc ? (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF or WEBP (MAX. 5MB)</p>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={onSelectFile}
              />
            </label>

            {currentAvatar && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Current Profile Picture:</p>
                <img
                  src={currentAvatar}
                  alt="Current avatar"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Crop Controls */}
            <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg">
              <button
                onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setScale(Math.min(3, scale + 0.1))}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Crop Area */}
            <div className="flex justify-center">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1}
                circularCrop
              >
                <img
                  ref={setImageRef}
                  src={imageSrc}
                  alt="Crop"
                  style={{
                    transform: `scale(${scale}) rotate(${rotate}deg)`,
                    maxHeight: '400px',
                  }}
                />
              </ReactCrop>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setImageSrc(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Choose Different Image
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading || !completedCrop}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

```typescript
// src/services/profileService.ts
import { apiClient } from '@/lib/apiClient';

export const profileService = {
  async getProfile() {
    const response = await apiClient.get('/profile');
    return response.data;
  },

  async updateProfile(data: any) {
    const response = await apiClient.put('/profile', data);
    return response.data;
  },

  async updateAvatar(file: Blob) {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await apiClient.post('/profile/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async generateShareLink(settings?: any) {
    const response = await apiClient.post('/profile/share-link', settings);
    return response.data;
  },

  async getActivityTimeline(userId: string, page = 1, limit = 10) {
    const response = await apiClient.get(`/profile/${userId}/activity`, {
      params: { page, limit },
    });
    return response.data;
  },

  async updateTheme(theme: any) {
    const response = await apiClient.put('/profile/theme', theme);
    return response.data;
  },

  async exportProfileData() {
    const response = await apiClient.get('/profile/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};
```

## Testing Requirements

### Unit Tests
- Test profile data display
- Test edit profile form validation
- Test avatar upload and cropping
- Test share link generation
- Test profile completeness calculation

### Integration Tests
- Test profile update flow
- Test avatar update with cropping
- Test activity timeline loading
- Test connected accounts management
- Test theme customization

### E2E Tests
- Complete profile viewing flow
- Edit profile successfully
- Upload and crop avatar
- Generate and copy share link
- View and filter activity timeline

## Dependencies
```json
{
  "react-hook-form": "^7.49.0",
  "@hookform/resolvers": "^3.3.0",
  "zod": "^3.22.0",
  "@tanstack/react-query": "^5.0.0",
  "react-hot-toast": "^2.4.1",
  "lucide-react": "^0.300.0",
  "react-image-crop": "^10.1.0",
  "qrcode.react": "^3.1.0",
  "html2canvas": "^1.4.1"
}
```

## Definition of Done
- [ ] All 22 acceptance criteria implemented
- [ ] Profile display with all user information
- [ ] Edit profile modal functional
- [ ] Avatar upload with cropping
- [ ] Profile completeness progress
- [ ] Activity timeline display
- [ ] Connected accounts management
- [ ] Share profile functionality
- [ ] Theme customization
- [ ] Statistics display
- [ ] Responsive design
- [ ] Unit tests with >80% coverage
- [ ] Integration tests passing
- [ ] E2E tests covering main flows
- [ ] Accessibility compliance
- [ ] Code review completed
- [ ] Documentation updated

## Notes
- Use optimistic UI updates for better UX
- Implement image optimization for avatars
- Add analytics tracking for profile actions
- Consider implementing profile versioning
- Add social sharing meta tags
- Implement profile URL slugs for better SEO
