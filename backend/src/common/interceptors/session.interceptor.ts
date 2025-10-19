/**
 * Session Interceptor
 * Handles session cookie management
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { SESSION_CONFIG } from '../../modules/auth/config/session.config';

@Injectable()
export class SessionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Set session cookie if session created
    if (request.newSession) {
      response.cookie(SESSION_CONFIG.cookieName, request.newSession.id, {
        httpOnly: SESSION_CONFIG.cookieHttpOnly,
        secure: SESSION_CONFIG.cookieSecure,
        sameSite: SESSION_CONFIG.cookieSameSite,
        maxAge: SESSION_CONFIG.ttl * 1000, // Convert to milliseconds
        path: '/',
      });
    }

    return next.handle();
  }
}
