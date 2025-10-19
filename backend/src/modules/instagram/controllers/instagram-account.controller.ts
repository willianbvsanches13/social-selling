import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramAccountService } from '../services/instagram-account.service';
import { UpdateAccountDto, AccountResponseDto, AccountListResponseDto, AccountStatusResponseDto } from '../dto/account.dto';

@ApiTags('Instagram Account Management')
@Controller('instagram/accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InstagramAccountController {
  private readonly logger = new Logger(InstagramAccountController.name);

  constructor(private readonly accountService: InstagramAccountService) {}

  @Get()
  @ApiOperation({ summary: 'List all connected Instagram accounts' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of accounts',
    type: AccountListResponseDto,
  })
  async listAccounts(@Request() req: any): Promise<AccountListResponseDto> {
    const accounts = await this.accountService.getUserAccounts(req.user.id);

    return {
      accounts: accounts.map((account) => this.mapToResponse(account)),
      total: accounts.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single account by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns account details',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  async getAccount(@Param('id') accountId: string, @Request() req: any): Promise<AccountResponseDto> {
    const account = await this.accountService.getAccountById(accountId, req.user.id);
    return this.mapToResponse(account);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update account information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account updated successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  async updateAccount(
    @Param('id') accountId: string,
    @Body() updateDto: UpdateAccountDto,
    @Request() req: any,
  ): Promise<AccountResponseDto> {
    const account = await this.accountService.updateAccount(accountId, req.user.id, updateDto);
    this.logger.log(`Account ${accountId} updated by user ${req.user.id}`);
    return this.mapToResponse(account);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect Instagram account' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Account disconnected successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  async deleteAccount(@Param('id') accountId: string, @Request() req: any): Promise<void> {
    await this.accountService.deleteAccount(accountId, req.user.id);
    this.logger.log(`Account ${accountId} disconnected by user ${req.user.id}`);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync account metadata from Instagram' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account synced successfully',
    type: AccountResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  async syncAccount(@Param('id') accountId: string, @Request() req: any): Promise<AccountResponseDto> {
    // Verify ownership
    await this.accountService.getAccountById(accountId, req.user.id);

    const account = await this.accountService.syncAccountMetadata(accountId);
    this.logger.log(`Account ${accountId} synced by user ${req.user.id}`);
    return this.mapToResponse(account);
  }

  @Post(':id/refresh-status')
  @ApiOperation({ summary: 'Refresh account status (check token validity)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status refreshed',
    type: AccountStatusResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Account not found' })
  async refreshStatus(
    @Param('id') accountId: string,
    @Request() req: any,
  ): Promise<AccountStatusResponseDto> {
    // Verify ownership
    await this.accountService.getAccountById(accountId, req.user.id);

    const status = await this.accountService.refreshAccountStatus(accountId);
    this.logger.log(`Account ${accountId} status refreshed: ${status}`);
    return { status };
  }

  private mapToResponse(account: any): AccountResponseDto {
    return {
      id: account.id,
      platform: account.platform,
      username: account.username,
      displayName: account.displayName,
      profilePictureUrl: account.profilePictureUrl,
      followerCount: account.followerCount,
      followingCount: account.followingCount,
      mediaCount: account.mediaCount,
      biography: account.biography,
      website: account.website,
      status: account.status,
      accountType: account.accountType,
      createdAt: account.toJSON().createdAt,
      lastSyncAt: account.lastSyncAt,
      tokenExpiresAt: account.tokenExpiresAt,
    };
  }
}
