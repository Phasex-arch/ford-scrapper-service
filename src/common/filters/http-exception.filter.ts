import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  requestId?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const errorName =
      exception instanceof HttpException
        ? exception.name
        : 'InternalServerError';

    const rawMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno do servidor';

    const message =
      typeof rawMessage === 'string'
        ? rawMessage
        : ((rawMessage as { message?: string | string[] }).message ??
          'Erro interno do servidor');

    const payload: ErrorPayload = {
      statusCode: status,
      message,
      error: errorName,
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: (request.headers['x-request-id'] as string | undefined),
    };

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          event: 'unhandled_exception',
          path: request.url,
          method: request.method,
          status,
          error: errorName,
        }),
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        JSON.stringify({
          event: 'http_exception',
          path: request.url,
          method: request.method,
          status,
          error: errorName,
        }),
      );
    }

    response.status(status).json(payload);
  }
}
