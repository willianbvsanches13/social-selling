import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPass123!', description: 'Current password' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewPass456!',
    description: 'New password (min 8 chars, uppercase, lowercase, number)',
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string;

  @ApiProperty({ example: 'NewPass456!', description: 'Confirm new password' })
  @IsString()
  confirmPassword!: string;
}
