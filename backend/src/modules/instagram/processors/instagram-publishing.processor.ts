import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InstagramSchedulingService } from '../services/instagram-scheduling.service';

@Processor('instagram-post-publishing')
export class InstagramPublishingProcessor {
  private readonly logger = new Logger(InstagramPublishingProcessor.name);

  constructor(private readonly schedulingService: InstagramSchedulingService) {}

  @Process('publish-post')
  async handlePublishPost(job: Job) {
    this.logger.log(
      `Processing publish job ${job.id} for post ${job.data.postId}`,
    );

    const { postId } = job.data;

    try {
      await this.schedulingService.executePublish(postId);
      this.logger.log(`Post published successfully: ${postId}`);
      return { success: true, postId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `Failed to publish post ${postId} (attempt ${job.attemptsMade}/${job.opts.attempts}): ${errorMessage}`,
        errorStack,
      );
      throw error; // Let BullMQ handle retry
    }
  }
}
