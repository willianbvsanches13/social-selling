import { Module } from '@nestjs/common';
import { PostsController } from './controllers/posts.controller';
import { InstagramModule } from '../instagram/instagram.module';

@Module({
  imports: [InstagramModule],
  controllers: [PostsController],
})
export class PostsModule {}
