export class AuthResponseDto {
  user!: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
  };

  accessToken!: string;
  refreshToken!: string;
  expiresIn!: number;
}
