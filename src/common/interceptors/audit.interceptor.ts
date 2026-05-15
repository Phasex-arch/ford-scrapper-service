import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service.js';

interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

const TRACKED_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = req.method;

    if (!TRACKED_METHODS.has(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          void this.persist(req, context, data, null);
        },
        error: (err: Error) => {
          void this.persist(req, context, null, err);
        },
      }),
    );
  }

  private async persist(
    req: AuthenticatedRequest,
    context: ExecutionContext,
    data: unknown,
    error: Error | null,
  ): Promise<void> {
    try {
      const handler = context.getHandler().name;
      const controller = context.getClass().name;
      const resource = controller
        .replace(/Controller$/, '')
        .toLowerCase();

      const resourceId = this.extractResourceId(req, data);
      const action = this.mapAction(req.method);
      const ip = this.extractIp(req);

      await this.prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          userEmail: req.user?.email,
          action,
          resource,
          resourceId,
          details: {
            handler,
            method: req.method,
            path: req.originalUrl,
            success: !error,
            error: error?.message ?? null,
          },
          ip,
          userAgent: req.headers['user-agent']?.toString().slice(0, 500),
          statusCode: error ? 500 : 200,
        },
      });
    } catch (err) {
      this.logger.error(
        `Falha ao persistir audit log: ${(err as Error).message}`,
      );
    }
  }

  private mapAction(method: string): string {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PATCH':
      case 'PUT':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      default:
        return method;
    }
  }

  private extractResourceId(
    req: AuthenticatedRequest,
    data: unknown,
  ): string | undefined {
    const params = req.params as Record<string, string> | undefined;
    if (params?.id) return params.id;
    if (data && typeof data === 'object' && 'id' in data) {
      const id = (data as { id: unknown }).id;
      if (typeof id === 'string') return id;
    }
    return undefined;
  }

  private extractIp(req: AuthenticatedRequest): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress;
  }
}
