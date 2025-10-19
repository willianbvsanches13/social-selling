/**
 * Session Decorators
 * Provide easy access to session data in controllers
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Session } from '../../domain/entities/session.entity';

/**
 * Get session from request
 * @example @GetSession() session: Session
 * @example @GetSession('userId') userId: string
 */
export const GetSession = createParamDecorator(
  (data: keyof Session | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const session: Session = request.session;

    if (!session) {
      return null;
    }

    return data ? session[data] : session;
  },
);

/**
 * Get user ID from session
 * @example @GetUserId() userId: string
 */
export const GetUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const session: Session = request.session;
    return session?.userId;
  },
);
