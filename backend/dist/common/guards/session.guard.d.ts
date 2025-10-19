import { CanActivate, ExecutionContext } from '@nestjs/common';
import { SessionService } from '../../modules/auth/services/session.service';
export declare class SessionGuard implements CanActivate {
    private readonly sessionService;
    constructor(sessionService: SessionService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
