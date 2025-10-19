/**
 * Session Guard
 * Validates session from cookie or header and attaches to request
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionService } from '../../modules/auth/services/session.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessionService: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract session ID from cookie or header
    const sessionId =
      request.cookies?.ssell_session ||
      request.headers['x-session-id'];

    if (!sessionId) {
      throw new UnauthorizedException('No session found');
    }

    try {
      // Validate and retrieve session
      const session = await this.sessionService.validateSession(sessionId);

      // Attach session to request
      request.session = session;
      request.user = {
        id: session.userId,
        email: session.email,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
