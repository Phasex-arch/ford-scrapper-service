import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface RequestWithTrace extends Request {
  traceId?: string;
}

/**
 * Global exception filter (slide 9).
 *
 * Maps any uncaught error to a generic envelope so that stack traces, ORM
 * names, driver versions or SQL text never leak to the client. The full
 * detail is still logged server-side (with the `traceId` for correlation).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithTrace>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal Server Error';
    let errorCode: string = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        const rawMessage = obj['message'];
        if (Array.isArray(rawMessage) || typeof rawMessage === 'string') {
          message = rawMessage as string | string[];
        }
        if (typeof obj['error'] === 'string') {
          errorCode = obj['error'].toUpperCase().replace(/\s+/g, '_');
        }
      }
    }

    // Always log full detail server-side
    const traceId = request.traceId ?? 'no-trace';
    if (status >= 500) {
      this.logger.error(
        {
          traceId,
          path: request.url,
          method: request.method,
          err: this.serializeError(exception),
        },
        'Unhandled exception',
      );
    } else if (status >= 400) {
      this.logger.warn(
        { traceId, path: request.url, method: request.method, status },
        'Client error',
      );
    }

    // Never echo stack traces / Prisma metadata to clients
    const safeMessage = status >= 500 ? 'Internal Server Error' : message;
    const safeError = status >= 500 ? 'INTERNAL_ERROR' : errorCode;

    response.status(status).json({
      statusCode: status,
      error: safeError,
      message: safeMessage,
      traceId,
      timestamp: new Date().toISOString(),
    });
  }

  private serializeError(exception: unknown): Record<string, unknown> {
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }
    return { value: String(exception) };
  }
}
