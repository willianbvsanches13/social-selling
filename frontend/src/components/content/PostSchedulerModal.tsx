'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Calendar, Eye } from 'lucide-react';
import { postsService } from '@/lib/services/posts.service';
import { instagramService } from '@/lib/services/instagram.service';
import { useToast } from '@/lib/hooks/useToast';
import { MediaUploader } from './MediaUploader';
import { PostPreview } from './PostPreview';
import { ScheduledPost, PostType } from '@/types/post';
import type { InstagramAccount } from '@/types/instagram';
import { format } from 'date-fns';

const postSchema = z.object({
  clientAccountId: z.string().min(1, 'Please select an account'),
  postType: z.enum(['IMAGE', 'REELS', 'CAROUSEL', 'STORIES']),
  caption: z.string().min(1, 'Caption is required').max(2200, 'Caption is too long'),
  scheduledTime: z.string().min(1, 'Scheduled time is required'),
  status: z.enum(['scheduled', 'cancelled']).default('scheduled'),
});

type PostFormData = z.infer<typeof postSchema>;

interface PostSchedulerModalProps {
  post?: ScheduledPost | null;
  defaultAccount?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PostSchedulerModal({
  post,
  defaultAccount,
  onClose,
  onSuccess,
}: PostSchedulerModalProps) {
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>(post?.mediaUrls || []);
  const [showPreview, setShowPreview] = useState(false);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: post
      ? {
          clientAccountId: post.clientAccountId,
          postType: post.mediaType,
          caption: post.caption,
          scheduledTime: format(new Date(post.scheduledFor), "yyyy-MM-dd'T'HH:mm"),
          status: post.status === 'scheduled' || post.status === 'cancelled' ? post.status : 'scheduled',
        }
      : {
          clientAccountId: defaultAccount || '',
          postType: 'IMAGE',
          caption: '',
          scheduledTime: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"), // 1 hour from now
          status: 'scheduled',
        },
  });

  const postType = watch('postType');
  const caption = watch('caption');

  // Fetch Instagram accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setIsLoadingAccounts(true);
        const data = await instagramService.getAccounts();
        // Only show active accounts
        const activeAccounts = data.filter((acc) => acc.status === 'active');
        setAccounts(activeAccounts);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load accounts';
        showError(errorMessage);
      } finally {
        setIsLoadingAccounts(false);
      }
    };

    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set default account if provided
  useEffect(() => {
    if (defaultAccount && !post) {
      setValue('clientAccountId', defaultAccount);
    }
  }, [defaultAccount, post, setValue]);

  const onSubmit = async (data: PostFormData) => {
    if (mediaUrls.length === 0) {
      showError('Please upload at least one media file');
      return;
    }

    try {
      setIsSubmitting(true);

      // Transform form data to match backend API
      // Convert local datetime to ISO 8601 UTC format
      const scheduledDate = new Date(data.scheduledTime);
      const scheduledForUTC = scheduledDate.toISOString();

      const apiData = {
        clientAccountId: data.clientAccountId,
        caption: data.caption,
        mediaUrls,
        mediaType: data.postType, // Form uses postType, API expects mediaType
        scheduledFor: scheduledForUTC, // Send as ISO 8601 UTC
      };

      if (post) {
        await postsService.updatePost(post.id, apiData);
        success('Post updated successfully');
      } else {
        await postsService.createPost(apiData);
        success('Post scheduled successfully');
      }

      onSuccess();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save post';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMaxFiles = (type: PostType): number => {
    switch (type) {
      case 'REELS':
      case 'STORIES':
        return 1;
      case 'IMAGE':
      case 'CAROUSEL':
        return 10;
      default:
        return 10;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b bg-white p-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {post ? 'Edit Scheduled Post' : 'Schedule New Post'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Form Fields */}
            <div className="space-y-6">
              {/* Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Instagram Account *
                </label>
                <select
                  {...register('clientAccountId')}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  disabled={isSubmitting || isLoadingAccounts}
                >
                  <option value="">
                    {isLoadingAccounts ? 'Loading accounts...' : 'Select an account'}
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      @{account.username}
                      {account.displayName ? ` (${account.displayName})` : ''}
                    </option>
                  ))}
                </select>
                {errors.clientAccountId && (
                  <p className="mt-1 text-sm text-red-600">{errors.clientAccountId.message}</p>
                )}
                {!isLoadingAccounts && accounts.length === 0 && (
                  <p className="mt-1 text-sm text-orange-600">
                    No active Instagram accounts. Please connect an account first.
                  </p>
                )}
              </div>

              {/* Post Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Post Type *</label>
                <div className="mt-2 grid grid-cols-4 gap-3">
                  {(['IMAGE', 'REELS', 'CAROUSEL', 'STORIES'] as const).map((type) => (
                    <label
                      key={type}
                      className={`
                        flex cursor-pointer items-center justify-center rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors
                        ${
                          postType === type
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        value={type}
                        {...register('postType')}
                        className="sr-only"
                        disabled={isSubmitting}
                      />
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </label>
                  ))}
                </div>
                {errors.postType && (
                  <p className="mt-1 text-sm text-red-600">{errors.postType.message}</p>
                )}
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Caption *</label>
                <textarea
                  {...register('caption')}
                  rows={6}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Write your caption here... #hashtags"
                  disabled={isSubmitting}
                />
                {errors.caption && (
                  <p className="mt-1 text-sm text-red-600">{errors.caption.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">{caption?.length || 0} / 2200 characters</p>
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Scheduled Date & Time *
                </label>
                <div className="relative mt-1">
                  <input
                    type="datetime-local"
                    {...register('scheduledTime')}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={isSubmitting}
                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                  />
                  <Calendar className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {errors.scheduledTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.scheduledTime.message}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-2 flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      value="scheduled"
                      {...register('status')}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">Scheduled</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      value="draft"
                      {...register('status')}
                      className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm text-gray-700">Save as Draft</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column - Media Upload & Preview */}
            <div className="space-y-6">
              {/* Media Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Media * ({mediaUrls.length}/{getMaxFiles(postType)})
                </label>
                <MediaUploader
                  value={mediaUrls}
                  onChange={setMediaUrls}
                  maxFiles={getMaxFiles(postType)}
                />
              </div>

              {/* Preview Button */}
              {mediaUrls.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? 'Hide' : 'Show'} Preview
                </button>
              )}

              {/* Preview */}
              {showPreview && mediaUrls.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <PostPreview
                    postType={postType}
                    caption={caption}
                    mediaUrls={mediaUrls}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end gap-3 border-t pt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mediaUrls.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {post ? 'Update Post' : 'Schedule Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
