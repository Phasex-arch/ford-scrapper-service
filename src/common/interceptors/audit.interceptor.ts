import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';
import { AuditService } from '../../audit/audit.service.js';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

const AUDITED_PATTERNS: { method: string; path: RegExp; action: string }[] = [
  { method: 'POST', path: /^\/api\/v1\/auth\/login$/, action: 'AUTH_LOGIN' },
  {
    method: 'POST',
    path: /^\/api\/v1\/auth\/register$/,
    action: 'AUTH_REGISTER',
  },
  {
    method: 'POST',
    path: /^\/api\/v1\/auth\/refresh$/,
    action: 'AUTH_REFRESH',
  },
  { method: 'POST', path: /^\/api\/v1\/auth\/logout$/, action: 'AUTH_LOGOUT' },
  { method: 'POST', path: /^\/api\/v1\/leads/, action: 'LEAD_CREATE' },
  { method: 'PATCH', path: /^\/api\/v1\/leads/, action: 'LEAD_UPDATE' },
  { method: 'DELETE', path: /^\/api\/v1\/leads/, action: 'LEAD_DELETE' },
  {
    method: 'POST',
    path: /^\/api\/v1\/leads\/[^/]+\/anonymize$/,
    action: 'LEAD_ANONYMIZE',
  },
  { method: 'POST', path: /^\/api\/v1\/sync/, action: 'SYNC_RUN' },
  {
    method: 'POST',
    path: /^\/api\/v1\/scrapper\/ford$/,
    action: 'SCRAPPER_RUN',
  },
];

/**
 * Persists an `AuditLog` row for sensitive routes (slide 25 "audit trail
 * para ações críticas"). Captures actor, IP, user agent, trace id and
 * resulting HTTP status; payload bodies are NOT stored to avoid leaking PII.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<
      Request & { traceId?: string; user?: AuthenticatedUser }
    >();

    const match = AUDITED_PATTERNS.find(
      (p) => p.method === request.method && p.path.test(request.path),
    );
    if (!match) return next.handle();

    const startedAt = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          void this.write(
            request,
            match.action,
            'SUCCESS',
            Date.now() - startedAt,
          );
        },
        error: (err: unknown) => {
          void this.write(
            request,
            match.action,
            'FAILURE',
            Date.now() - startedAt,
            err instanceof Error ? err.message : 'unknown_error',
          );
        },
      }),
    );
  }

  private async write(
    request: Request & { traceId?: string; user?: AuthenticatedUser },
    action: string,
    outcome: 'SUCCESS' | 'FAILURE',
    durationMs: number,
    errorReason?: string,
  ): Promise<void> {
    try {
      await this.audit.record({
        userId: request.user?.id ?? null,
        action,
        resource: request.path,
        ip: this.extractIp(request),
        userAgent: request.headers['user-agent'] ?? null,
        traceId: request.traceId ?? null,
        metadata: {
          method: request.method,
          outcome,
          durationMs,
          ...(errorReason ? { errorReason } : {}),
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to persist audit log for ${action}: ${(err as Error).message}`,
      );
    }
  }

  private extractIp(request: Request): string | null {
    const fwd = request.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0)
      return fwd.split(',')[0].trim();
    return request.ip ?? null;
  }
}
