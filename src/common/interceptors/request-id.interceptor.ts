import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import type { Request, Response } from 'express';

const TRACE_HEADER = 'x-trace-id';

/**
 * Attaches a trace id to every request (slide 24 "rastreabilidade").
 * Honours an incoming `X-Trace-Id` so external systems can stitch logs.
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { traceId?: string }>();
    const response = http.getResponse<Response>();

    const incoming = request.headers[TRACE_HEADER];
    const traceId =
      typeof incoming === 'string' && /^[\w-]{8,128}$/.test(incoming)
        ? incoming
        : randomUUID();

    request.traceId = traceId;
    response.setHeader('X-Trace-Id', traceId);
    return next.handle();
  }
}
