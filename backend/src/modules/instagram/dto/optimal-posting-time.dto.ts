import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class OptimalTimeSlotDto {
  @ApiProperty({ description: 'Day of week (0-6, where 0 is Sunday)' })
  dayOfWeek!: number;

  @ApiProperty({ description: 'Hour of day (0-23)' })
  hour!: number;

  @ApiProperty({ description: 'Average engagement score (0-100)' })
  averageEngagement!: number;

  @ApiProperty({ description: 'Number of posts sampled' })
  sampleSize!: number;
}

export class PostingScheduleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  clientAccountId!: string;

  @ApiProperty({
    description: 'Day of week (0-6, where 0 is Sunday)',
    minimum: 0,
    maximum: 6,
  })
  dayOfWeek!: number;

  @ApiProperty({
    description: 'Time slots in HH:MM format',
    type: [String],
    example: ['09:00', '14:00', '20:00'],
  })
  timeSlots!: string[];

  @ApiProperty()
  timezone!: string;

  @ApiPropertyOptional({
    description: 'Whether this is an optimal time based on analytics',
  })
  isOptimal?: boolean;

  @ApiPropertyOptional({
    description: 'Engagement score for this time slot (0-100)',
    minimum: 0,
    maximum: 100,
  })
  engagementScore?: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class OptimalPostingTimesResponseDto {
  @ApiProperty({
    type: [PostingScheduleDto],
    description: 'Posting schedules for each day of week',
  })
  schedules!: PostingScheduleDto[];

  @ApiProperty({
    type: [OptimalTimeSlotDto],
    description: 'Top 5 optimal posting times based on historical engagement',
  })
  recommendations!: OptimalTimeSlotDto[];

  @ApiProperty({
    description: 'User timezone',
  })
  timezone!: string;

  @ApiProperty({
    description: 'Number of posts analyzed',
  })
  postsAnalyzed!: number;

  @ApiProperty({
    description: 'Time period analyzed (in days)',
  })
  analysisPeriodDays!: number;
}

export class UpdatePostingScheduleDto {
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Time slots in HH:MM format',
    type: [String],
    example: ['09:00', '14:00', '20:00'],
  })
  timeSlots?: string[];

  @IsOptional()
  @ApiPropertyOptional()
  timezone?: string;

  @IsOptional()
  @ApiPropertyOptional()
  isActive?: boolean;
}
