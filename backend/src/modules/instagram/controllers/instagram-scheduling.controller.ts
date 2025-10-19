import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramSchedulingService } from '../services/instagram-scheduling.service';
import { InstagramMediaUploadService } from '../services/instagram-media-upload.service';
import {
  CreateScheduledPostDto,
  UpdateScheduledPostDto,
  ListScheduledPostsDto,
  ScheduledPostResponseDto,
  PaginatedScheduledPostsResponseDto,
  PublishNowResponseDto,
  CancelScheduledPostResponseDto,
  PostStatus,
} from '../dto/scheduled-post.dto';
import {
  MediaUploadResponseDto,
  ListMediaAssetsDto,
  MediaAssetsListResponseDto,
  DeleteMediaAssetResponseDto,
} from '../dto/media-upload.dto';
import { OptimalPostingTimesResponseDto } from '../dto/optimal-posting-time.dto';

@ApiTags('Instagram Scheduling')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('instagram/scheduling')
export class InstagramSchedulingController {
  constructor(
    private readonly schedulingService: InstagramSchedulingService,
    private readonly mediaUploadService: InstagramMediaUploadService,
  ) {}

  // ========== Scheduled Posts ==========

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create scheduled post' })
  @ApiResponse({
    status: 201,
    description: 'Post scheduled successfully',
    type: ScheduledPostResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request',
  })
  async createScheduledPost(
    @Request() req: any,
    @Body() dto: CreateScheduledPostDto,
  ): Promise<ScheduledPostResponseDto> {
    return this.schedulingService.createScheduledPost(req.user.id, dto);
  }

  @Get('posts/:accountId')
  @ApiOperation({ summary: 'List scheduled posts' })
  @ApiParam({ name: 'accountId', description: 'Client account ID' })
  @ApiResponse({
    status: 200,
    description: 'Posts retrieved successfully',
    type: PaginatedScheduledPostsResponseDto,
  })
  async listScheduledPosts(
    @Request() req: any,
    @Param('accountId') accountId: string,
    @Query() dto: ListScheduledPostsDto,
  ): Promise<PaginatedScheduledPostsResponseDto> {
    return this.schedulingService.listScheduledPosts(
      req.user.id,
      accountId,
      dto,
    );
  }

  @Get('posts/:accountId/:postId')
  @ApiOperation({ summary: 'Get scheduled post by ID' })
  @ApiParam({ name: 'accountId', description: 'Client account ID' })
  @ApiParam({ name: 'postId', description: 'Scheduled post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post retrieved successfully',
    type: ScheduledPostResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async getScheduledPost(
    @Request() req: any,
    @Param('postId') postId: string,
  ): Promise<ScheduledPostResponseDto> {
    return this.schedulingService.getScheduledPost(postId, req.user.id);
  }

  @Put('posts/:postId')
  @ApiOperation({ summary: 'Update scheduled post' })
  @ApiParam({ name: 'postId', description: 'Scheduled post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post updated successfully',
    type: ScheduledPostResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update non-scheduled posts',
  })
  async updateScheduledPost(
    @Request() req: any,
    @Param('postId') postId: string,
    @Body() dto: UpdateScheduledPostDto,
  ): Promise<ScheduledPostResponseDto> {
    return this.schedulingService.updateScheduledPost(postId, req.user.id, dto);
  }

  @Delete('posts/:postId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel scheduled post' })
  @ApiParam({ name: 'postId', description: 'Scheduled post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post cancelled successfully',
    type: CancelScheduledPostResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async cancelScheduledPost(
    @Request() req: any,
    @Param('postId') postId: string,
  ): Promise<CancelScheduledPostResponseDto> {
    await this.schedulingService.cancelScheduledPost(postId, req.user.id);
    return {
      message: 'Post cancelled successfully',
      scheduledPostId: postId,
      status: PostStatus.CANCELLED,
    };
  }

  @Post('posts/:postId/publish-now')
  @ApiOperation({ summary: 'Publish post immediately' })
  @ApiParam({ name: 'postId', description: 'Scheduled post ID' })
  @ApiResponse({
    status: 200,
    description: 'Post published successfully',
    type: PublishNowResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Post not found',
  })
  async publishNow(
    @Request() req: any,
    @Param('postId') postId: string,
  ): Promise<PublishNowResponseDto> {
    const result = await this.schedulingService.publishNow(postId, req.user.id);
    return {
      message: 'Post published successfully',
      scheduledPostId: result.id,
      status: result.status,
    };
  }

  // ========== Media Upload ==========

  @Post('media/upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload media file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Media uploaded successfully',
    type: MediaUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Request() req: any,
    @UploadedFile() file: any,
    @Query('clientAccountId') clientAccountId?: string,
  ): Promise<MediaUploadResponseDto> {
    if (!file) {
      throw new Error('No file uploaded');
    }
    return this.mediaUploadService.uploadMedia(
      req.user.id,
      file,
      clientAccountId,
    );
  }

  @Get('media/:accountId')
  @ApiOperation({ summary: 'List media assets' })
  @ApiParam({ name: 'accountId', description: 'Client account ID' })
  @ApiResponse({
    status: 200,
    description: 'Media assets retrieved successfully',
    type: MediaAssetsListResponseDto,
  })
  async listMedia(
    @Request() req: any,
    @Param('accountId') accountId: string,
    @Query() dto: ListMediaAssetsDto,
  ): Promise<MediaUploadResponseDto[]> {
    return this.mediaUploadService.listAssets(req.user.id, accountId);
  }

  @Get('media/:accountId/:assetId')
  @ApiOperation({ summary: 'Get media asset details' })
  @ApiParam({ name: 'accountId', description: 'Client account ID' })
  @ApiParam({ name: 'assetId', description: 'Media asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Media asset retrieved successfully',
    type: MediaUploadResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Media asset not found',
  })
  async getMediaAsset(
    @Request() req: any,
    @Param('assetId') assetId: string,
  ): Promise<MediaUploadResponseDto> {
    return this.mediaUploadService.getAsset(assetId, req.user.id);
  }

  @Delete('media/:assetId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete media asset' })
  @ApiParam({ name: 'assetId', description: 'Media asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Media asset deleted successfully',
    type: DeleteMediaAssetResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Media asset not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete media in use',
  })
  async deleteMediaAsset(
    @Request() req: any,
    @Param('assetId') assetId: string,
  ): Promise<DeleteMediaAssetResponseDto> {
    await this.mediaUploadService.deleteAsset(assetId, req.user.id);
    return {
      message: 'Media asset deleted successfully',
      mediaId: assetId,
    };
  }

  // ========== Optimal Times ==========

  @Get('optimal-times/:accountId')
  @ApiOperation({ summary: 'Get optimal posting times' })
  @ApiParam({ name: 'accountId', description: 'Client account ID' })
  @ApiResponse({
    status: 200,
    description: 'Optimal times retrieved successfully',
    type: OptimalPostingTimesResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Account not found',
  })
  async getOptimalTimes(
    @Request() req: any,
    @Param('accountId') accountId: string,
  ): Promise<OptimalPostingTimesResponseDto> {
    return this.schedulingService.getOptimalPostingTimes(
      accountId,
      req.user.id,
    );
  }
}
