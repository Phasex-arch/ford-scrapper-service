import {
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SIG_HEADER = 'x-signature';
const TS_HEADER = 'x-signature-timestamp';
const PREFIX = 'sha256=';
const SKEW_MS = 5 * 60 * 1000;

/**
 * HMAC-SHA256 payload integrity verification (slide 16 bonus / API rubric).
 *
 * Server-to-server callers must send:
 *   X-Signature-Timestamp: <unix ms>
 *   X-Signature: sha256=<hex hmac of "<timestamp>.<body>">
 *
 * The HMAC key is `API_SIGNING_SECRET`. Timestamp skew defends against
 * replay; constant-time compare defends against timing oracle.
 *
 * Only mounted on the most sensitive routes (POST /sync) so that human
 * users with a valid JWT can still hit normal endpoints.
 */
@Injectable()
export class PayloadSignatureMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PayloadSignatureMiddleware.name);
  private readonly secret: string;
  private readonly enabled: boolean;

  constructor(config: ConfigService) {
    this.secret = config.get<string>('API_SIGNING_SECRET') ?? '';
    this.enabled = this.secret.length >= 32;
    if (!this.enabled) {
      this.logger.warn(
        'API_SIGNING_SECRET missing or shorter than 32 chars — payload signature verification is DISABLED. ' +
          'Set it before going to production.',
      );
    }
  }

  use(req: Request, res: Response, next: NextFunction): void {
    if (!this.enabled) {
      next();
      return;
    }

    const sig = req.headers[SIG_HEADER];
    const ts = req.headers[TS_HEADER];

    if (typeof sig !== 'string' || typeof ts !== 'string') {
      throw new UnauthorizedException('Missing signature headers');
    }
    if (!sig.startsWith(PREFIX)) {
      throw new UnauthorizedException('Invalid signature format');
    }

    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > SKEW_MS) {
      throw new UnauthorizedException(
        'Signature timestamp out of allowed skew',
      );
    }

    const rawBody = req.body as Record<string, unknown> | undefined;
    const body =
      rawBody && Object.keys(rawBody).length > 0 ? JSON.stringify(rawBody) : '';
    const expected = createHmac('sha256', this.secret)
      .update(`${ts}.${body}`)
      .digest('hex');

    const provided = sig.slice(PREFIX.length);
    if (provided.length !== expected.length) {
      throw new UnauthorizedException('Signature mismatch');
    }
    const ok = timingSafeEqual(
      Buffer.from(provided, 'hex'),
      Buffer.from(expected, 'hex'),
    );
    if (!ok) {
      throw new UnauthorizedException('Signature mismatch');
    }

    next();
  }
}
