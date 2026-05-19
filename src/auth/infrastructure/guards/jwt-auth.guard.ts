import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { SecurityEventLogger } from '../../../common/security/security-event.logger.js';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly securityLogger: SecurityEventLogger,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: { name?: string; message?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const req = context.switchToHttp().getRequest<Request>();
      const type =
        info?.name === 'TokenExpiredError' ? 'expired_token' : 'invalid_token';
      void this.securityLogger.log({
        type,
        ip: this.extractIp(req),
        userAgent: req.headers['user-agent']?.toString(),
        details: {
          path: req.originalUrl,
          reason: info?.message ?? err?.message ?? 'sem token',
        },
      });
      throw err ?? new UnauthorizedException('Nao autenticado');
    }
    return user;
  }

  private extractIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress;
  }
}
