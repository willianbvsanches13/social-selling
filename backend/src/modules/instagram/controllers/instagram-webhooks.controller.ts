import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  UseGuards,
  Request,
  HttpCode,
  Req,
  RawBodyRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramWebhooksService } from '../services/instagram-webhooks.service';
import {
  CreateWebhookSubscriptionDto,
  WebhookStatsDto,
} from '../dto/webhook.dto';

@ApiTags('Instagram Webhooks')
@Controller('instagram/webhooks')
export class InstagramWebhooksController {
  private readonly logger = new (require('@nestjs/common').Logger)('InstagramWebhooksController');

  constructor(private webhooksService: InstagramWebhooksService) {}

  /**
   * Webhook verification endpoint (GET)
   * Called by Meta/Instagram to verify webhook URL
   */
  @Get()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async verifyWebhook(@Query() query: any): Promise<string> {
    const challenge = this.webhooksService.verifySubscription(query);

    if (!challenge) {
      throw new Error('Webhook verification failed');
    }

    return challenge;
  }

  /**
   * Webhook events endpoint (POST)
   * Receives webhook events from Meta/Instagram
   */
  @Post()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: any,
    @Headers('x-hub-signature-256') signature: string,
  ): Promise<{ status: string }> {
    // Get raw body for signature verification
    const rawBody = req.rawBody
      ? req.rawBody.toString('utf8')
      : JSON.stringify(req.body);

    this.logger.debug(`Webhook received:
      - Has signature: ${!!signature}
      - Has rawBody: ${!!req.rawBody}
      - Body type: ${typeof req.body}
      - Raw body length: ${rawBody.length}`);

    let payload: any;

    try {
      payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body;
    } catch (_error) {
      throw new Error('Invalid webhook payload format');
    }

    // Verify signature
    const isValid = this.webhooksService.verifySignature(signature, rawBody);
    if (!isValid) {
      this.logger.error('Webhook signature validation failed');
      throw new Error('Invalid webhook signature');
    }

    // Process webhook asynchronously (don't wait for processing)
    this.webhooksService.processWebhook(payload, signature).catch((error) => {
      console.error('Error processing webhook asynchronously:', error);
    });

    // Return immediately to Meta
    return { status: 'ok' };
  }

  /**
   * Create webhook subscription
   */
  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({
    summary: 'Create webhook subscription for Instagram account',
  })
  @ApiResponse({
    status: 201,
    description: 'Subscription created successfully',
  })
  async createSubscription(
    @Request() req: any,
    @Body() dto: CreateWebhookSubscriptionDto,
  ) {
    return this.webhooksService.createSubscription(
      req.user.id,
      dto.instagramAccountId,
      dto.subscriptionFields,
      dto.verifyToken,
    );
  }

  /**
   * Get webhook events for an account
   */
  @Get('events/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get webhook events for an Instagram account' })
  @ApiQuery({
    name: 'eventType',
    required: false,
    description:
      'Filter by event type (comment, mention, message, story_mention, live_comment)',
  })
  @ApiQuery({
    name: 'processed',
    required: false,
    type: Boolean,
    description: 'Filter by processed status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Results per page (default: 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully',
  })
  async getEvents(
    @Request() req: any,
    @Param('accountId') accountId: string,
    @Query('eventType') eventType?: string,
    @Query('processed') processed?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.webhooksService.getEvents(req.user.id, accountId, {
      eventType,
      processed: processed !== undefined ? processed === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  /**
   * Get webhook statistics for an account
   */
  @Get('stats/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Get webhook statistics for an Instagram account' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: WebhookStatsDto,
  })
  async getStats(@Request() req: any, @Param('accountId') accountId: string) {
    return this.webhooksService.getStats(req.user.id, accountId);
  }

  /**
   * Retry failed webhook events
   */
  @Post('retry/:accountId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearerAuth')
  @ApiOperation({ summary: 'Retry failed webhook events' })
  @ApiResponse({
    status: 200,
    description: 'Events queued for retry',
  })
  @HttpCode(200)
  async retryFailedEvents(
    @Request() req: any,
    @Param('accountId') accountId: string,
  ) {
    const count = await this.webhooksService.retryFailedEvents(
      req.user.id,
      accountId,
    );
    return { retriedCount: count };
  }
}
