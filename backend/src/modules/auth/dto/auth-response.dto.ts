import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'User information',
    example: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'demo@socialselling.com',
      name: 'Demo User',
      emailVerified: true,
    },
  })
  user!: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };

  @ApiProperty({
    description: 'JWT access token (expires in 15 minutes)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImRlbW9Ac29jaWFsc2VsbGluZy5jb20iLCJpYXQiOjE2MzU0NDMyMDAsImV4cCI6MTYzNTQ0NDA5MH0.abcdef123456',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token (expires in 7 days)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYzNTQ0MzIwMCwiZXhwIjoxNjM2MDQ4MDAwfQ.xyz789',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 900,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'Session ID (used for session management)',
    example: 'session-123-abc',
    required: false,
  })
  sessionId?: string;
}
