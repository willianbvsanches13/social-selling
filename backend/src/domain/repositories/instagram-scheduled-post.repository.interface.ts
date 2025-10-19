import { InstagramScheduledPost } from '../entities/instagram-scheduled-post.entity';

export interface IInstagramScheduledPostRepository {
  create(post: InstagramScheduledPost): Promise<InstagramScheduledPost>;
  findById(id: string): Promise<InstagramScheduledPost | null>;
  findByClientAccount(clientAccountId: string): Promise<InstagramScheduledPost[]>;
  update(post: InstagramScheduledPost): Promise<InstagramScheduledPost>;
  delete(id: string): Promise<void>;
  findScheduledForPublishing(now: Date): Promise<InstagramScheduledPost[]>;
  list(
    clientAccountId: string,
    filters?: {
      status?: string;
      scheduledAfter?: Date;
      scheduledBefore?: Date;
      skip?: number;
      take?: number;
    },
  ): Promise<{ items: InstagramScheduledPost[]; total: number }>;
}
