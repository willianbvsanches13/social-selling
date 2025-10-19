export interface JwtPayload {
    sub: string;
    email: string;
    iat: number;
    exp: number;
    type: 'access' | 'refresh';
}
export interface JwtTokenPair {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
