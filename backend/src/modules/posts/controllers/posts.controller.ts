import {
  Controller,
  Post,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InstagramMediaUploadService } from '../../instagram/services/instagram-media-upload.service';
import { MediaUploadResponseDto } from '../../instagram/dto/media-upload.dto';

@ApiTags('Posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(
    private readonly mediaUploadService: InstagramMediaUploadService,
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
}
