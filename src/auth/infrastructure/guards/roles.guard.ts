import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { Role } from '../../../../generated/prisma/enums.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { SecurityEventLogger } from '../../../common/security/security-event.logger.js';
import type { AuthenticatedUser } from '../../domain/authenticated-user.js';

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly securityLogger: SecurityEventLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Usuario nao autenticado');
    }

    if (!requiredRoles.includes(user.role)) {
      void this.securityLogger.log({
        type: 'access_denied',
        userId: user.id,
        userEmail: user.email,
        ip: this.extractIp(req),
        userAgent: req.headers['user-agent']?.toString(),
        details: {
          path: req.originalUrl,
          requiredRoles,
          userRole: user.role,
        },
      });
      throw new ForbiddenException('Permissao insuficiente para este recurso');
    }

    return true;
  }

  private extractIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress;
  }
}
