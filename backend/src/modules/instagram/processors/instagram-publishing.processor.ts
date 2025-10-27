import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InstagramSchedulingService } from '../services/instagram-scheduling.service';

@Processor('instagram-post-publishing')
export class InstagramPublishingProcessor extends WorkerHost {
  private readonly logger = new Logger(InstagramPublishingProcessor.name);

  constructor(private readonly schedulingService: InstagramSchedulingService) {
    super();
  }

  async process(job: Job) {
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
        `Failed to publish post ${postId}: ${errorMessage}`,
        errorStack,
      );
      throw error; // Let BullMQ handle retry
    }
  }
}
