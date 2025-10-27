import {
  Controller,
  Post,
  Get,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramMediaUploadService } from '../../instagram/services/instagram-media-upload.service';
import { InstagramSchedulingService } from '../../instagram/services/instagram-scheduling.service';
import { MediaUploadResponseDto } from '../../instagram/dto/media-upload.dto';
import { ScheduledPostResponseDto } from '../../instagram/dto/scheduled-post.dto';

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(
    private readonly mediaUploadService: InstagramMediaUploadService,
    private readonly schedulingService: InstagramSchedulingService,
  ) {}

  /**
   * Upload media for posts (delegates to Instagram media upload)
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload media file for post' })
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

  /**
   * Get calendar posts for a date range
   */
  @Get('calendar')
  @ApiOperation({ summary: 'Get posts for calendar view' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    description: 'Start date in ISO format (e.g., 2025-10-01)',
    example: '2025-10-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    description: 'End date in ISO format (e.g., 2025-11-30)',
    example: '2025-11-30',
  })
  @ApiQuery({
    name: 'clientAccountId',
    required: false,
    description: 'Filter by client account ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar posts retrieved successfully',
    type: [ScheduledPostResponseDto],
  })
  async getCalendarPosts(
    @Request() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('clientAccountId') clientAccountId?: string,
  ): Promise<ScheduledPostResponseDto[]> {
    return this.schedulingService.getCalendarPosts(
      req.user.id,
      startDate,
      endDate,
      clientAccountId,
    );
  }
}
