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
  private readonly logger = new (require('@nestjs/common').Logger)(
    'InstagramWebhooksController',
  );

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
    @Headers('x-hub-signature') signatureSha1: string,
  ): Promise<{ status: string }> {
    // Get raw body for signature verification
    // CRITICAL: Must use the EXACT raw body buffer as received, not re-stringified JSON
    if (!req.rawBody) {
      this.logger.error('Raw body not available for signature verification');
      this.logger.error('Headers:', JSON.stringify(req.headers, null, 2));
      throw new Error('Raw body not available for signature verification');
    }

    const rawBodyString = req.rawBody.toString('utf8');

    // TEMPORARY DEBUG: Save raw payload for forensic analysis
    const fs = require('fs');
    const debugPayload = {
      timestamp: new Date().toISOString(),
      signatureSha256: signature,
      signatureSha1: signatureSha1,
      rawBodyHex: req.rawBody.toString('hex'),
      rawBodyUtf8: rawBodyString,
      rawBodyLength: rawBodyString.length,
      contentLength: req.headers['content-length'],
    };
    fs.writeFileSync('/tmp/webhook-debug.json', JSON.stringify(debugPayload, null, 2));
    this.logger.log('🔍 DEBUG: Saved webhook payload to /tmp/webhook-debug.json');

    this.logger.log(`📨 Webhook received:
      - Has SHA-256 signature: ${!!signature}
      - Has SHA-1 signature: ${!!signatureSha1}
      - Has rawBody: ${!!req.rawBody}
      - Body type: ${typeof req.body}
      - Raw body length: ${rawBodyString.length} bytes
      - Content-Length header: ${req.headers['content-length']}
      - SHA-256: ${signature || '(missing)'}
      - SHA-1: ${signatureSha1 || '(missing)'}
      - Raw body preview: ${rawBodyString.substring(0, 100)}...`);

    // Payload is already parsed by express.json()
    const payload = req.body;

    // Verify signature - MUST use the exact raw body string as received
    const isValid = this.webhooksService.verifySignature(
      signature,
      rawBodyString,
    );
    if (!isValid) {
      this.logger.error('❌ Webhook signature validation failed');
      this.logger.error(`Debug info:
        - Received signature: ${signature}
        - Raw body first 500 chars: ${rawBodyString.substring(0, 500)}
        - Raw body length: ${rawBodyString.length}
        - Expected length from header: ${req.headers['content-length']}`);
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
