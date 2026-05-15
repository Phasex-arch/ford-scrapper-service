import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const SENSITIVE_PATHS = ['/auth/login', '/auth/register'];

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const start = process.hrtime.bigint();
    const { method, originalUrl } = req;
    const ip = this.extractIp(req);
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    res.on('finish', () => {
      const elapsedNs = Number(process.hrtime.bigint() - start);
      const elapsedMs = +(elapsedNs / 1_000_000).toFixed(2);

      const entry = {
        event: 'http_request',
        requestId,
        method,
        path: originalUrl,
        status: res.statusCode,
        durationMs: elapsedMs,
        ip,
        userAgent,
        contentLength: res.getHeader('content-length') ?? 0,
        sensitive: SENSITIVE_PATHS.some((p) => originalUrl.includes(p)),
      };

      if (res.statusCode >= 500) {
        this.logger.error(JSON.stringify(entry));
      } else if (res.statusCode >= 400) {
        this.logger.warn(JSON.stringify(entry));
      } else {
        this.logger.log(JSON.stringify(entry));
      }
    });

    next();
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress ?? 'unknown';
  }
}
