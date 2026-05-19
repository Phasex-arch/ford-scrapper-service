import {
  BadRequestException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../decorators/current-user.decorator.js';

const HEADER = 'idempotency-key';
const KEY_REGEX = /^[A-Za-z0-9_-]{8,128}$/;
const TTL_HOURS = 24;

/**
 * Idempotency-Key middleware (slide 16).
 *
 * For unsafe (non-GET) methods, requires an `Idempotency-Key` header and
 * stores `(key, route, userId)` -> response in the `IdempotencyKey` table.
 * Duplicate keys replay the original response, so a double-clicked POST
 * never creates two leads / triggers two syncs.
 *
 * Apply this middleware only to routes that need it (configured in
 * `AppModule` -> `configure()`), not globally, so GETs stay cheap.
 */
@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IdempotencyMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(
    req: Request & { user?: AuthenticatedUser },
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    if (
      req.method === 'GET' ||
      req.method === 'HEAD' ||
      req.method === 'OPTIONS'
    ) {
      next();
      return;
    }

    const key = req.headers[HEADER];
    if (typeof key !== 'string') {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (!KEY_REGEX.test(key)) {
      throw new BadRequestException('Invalid Idempotency-Key format');
    }

    const route = `${req.method} ${req.baseUrl ?? ''}${req.path}`;
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key },
    });

    if (existing) {
      if (existing.route !== route) {
        throw new BadRequestException(
          'Idempotency-Key already used on a different route',
        );
      }
      this.logger.log(
        `Replaying idempotent response for key=${key.substring(0, 8)}...`,
      );
      const cached = existing.response as Record<string, unknown>;
      res.setHeader('Idempotent-Replay', 'true');
      res.status(200).json(cached);
      return;
    }

    // Hook into res.json to persist the response after the handler runs.
    const userId = req.user?.id ?? null;
    const originalJson = res.json.bind(res) as (body: unknown) => Response;
    const prisma = this.prisma;
    const logger = this.logger;
    res.json = (body: unknown): Response => {
      const status = res.statusCode;
      if (status >= 200 && status < 300) {
        void prisma.idempotencyKey
          .create({
            data: {
              key,
              userId,
              route,
              response: body as object,
            },
          })
          .catch((err: Error) =>
            logger.warn(`Failed to persist idempotency key: ${err.message}`),
          );
      }
      return originalJson(body);
    };

    next();
  }

  /**
   * Should be called periodically to purge keys older than TTL_HOURS.
   */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000);
    const r = await this.prisma.idempotencyKey.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return r.count;
  }
}
