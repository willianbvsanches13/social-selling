import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  Request,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InstagramOAuthService } from './instagram-oauth.service';
import { InstagramAccountService } from './services/instagram-account.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Instagram Integration')
@Controller('instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly instagramOAuthService: InstagramOAuthService,
    private readonly instagramAccountService: InstagramAccountService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  @Get('oauth/authorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Instagram OAuth flow' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns authorization URL',
    schema: {
      type: 'object',
      properties: {
        authorizationUrl: {
          type: 'string',
          example: 'https://api.instagram.com/oauth/authorize?...',
        },
      },
    },
  })
  async initiateOAuth(
    @Request() req: any,
  ): Promise<{ authorizationUrl: string }> {
    const authUrl = await this.instagramOAuthService.getAuthorizationUrl(
      req.user.id,
    );
    this.logger.log(
      `OAuth authorization URL generated for user ${req.user.id}`,
    );
    return { authorizationUrl: authUrl };
  }

  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle Instagram OAuth callback' })
  @ApiQuery({
    name: 'code',
    required: false,
    description: 'Authorization code from Instagram',
  })
  @ApiQuery({ name: 'state', required: false, description: 'CSRF state token' })
  @ApiQuery({
    name: 'error',
    required: false,
    description: 'Error code if user denied access',
  })
  @ApiResponse({
    status: HttpStatus.FOUND,
    description: 'Redirects to frontend',
  })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ): Promise<void> {
    if (error) {
      this.logger.warn(`OAuth access denied: ${error}`);
      return res.redirect(`${this.frontendUrl}/clients?error=access_denied`);
    }

    if (!code || !state) {
      this.logger.error('OAuth callback missing code or state');
      return res.redirect(`${this.frontendUrl}/clients?error=invalid_request`);
    }

    try {
      const result = await this.instagramOAuthService.handleCallback(
        code,
        state,
      );
      this.logger.log(
        `Instagram account connected successfully: ${result.username}`,
      );
      return res.redirect(
        `${this.frontendUrl}/clients?instagram_connected=true&account=${result.accountId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OAuth callback error: ${errorMessage}`);
      return res.redirect(
        `${this.frontendUrl}/clients?error=connection_failed`,
      );
    }
  }

  @Post('accounts/:id/sync')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync Instagram account data' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account synced successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized' })
  async syncAccount(@Request() req: any, @Param('id') accountId: string) {
    try {
      const account = await this.instagramAccountService.syncAccount(
        req.user.id,
        accountId,
      );
      this.logger.log(`Instagram account synced: ${accountId}`);
      return account;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Sync account error: ${errorMessage}`);
      throw error;
    }
  }

  @Delete('accounts/:id/disconnect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Instagram account' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account disconnected successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Instagram account disconnected successfully',
        },
        accountId: { type: 'string', format: 'uuid' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Account not found',
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Unauthorized' })
  async disconnectAccount(@Request() req: any, @Param('id') accountId: string) {
    await this.instagramOAuthService.disconnectAccount(req.user.id, accountId);
    this.logger.log(`Instagram account disconnected: ${accountId}`);
    return {
      message: 'Instagram account disconnected successfully',
      accountId,
    };
  }
}
