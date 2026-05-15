import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

export type SecurityEventType =
  | 'login_failed'
  | 'login_success'
  | 'invalid_token'
  | 'expired_token'
  | 'access_denied'
  | 'suspicious_activity';

interface SecurityEvent {
  type: SecurityEventType;
  userEmail?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

const FAILED_LOGIN_THRESHOLD = 5;
const FAILED_LOGIN_WINDOW_MS = 5 * 60 * 1000;

@Injectable()
export class SecurityEventLogger {
  private readonly logger = new Logger('SecurityEvent');
  private readonly failedLogins = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {}

  async log(event: SecurityEvent): Promise<void> {
    const entry = {
      event: 'security_event',
      type: event.type,
      userEmail: event.userEmail,
      userId: event.userId,
      ip: event.ip,
      timestamp: new Date().toISOString(),
      details: event.details,
    };

    if (event.type === 'login_failed' || event.type === 'access_denied') {
      this.logger.warn(JSON.stringify(entry));
    } else {
      this.logger.log(JSON.stringify(entry));
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: event.userId,
          userEmail: event.userEmail,
          action: event.type.toUpperCase(),
          resource: 'security',
          ip: event.ip,
          userAgent: event.userAgent?.slice(0, 500),
          details: event.details as object | undefined,
        },
      });
    } catch (err) {
      this.logger.error(
        `Falha ao persistir security event: ${(err as Error).message}`,
      );
    }

    if (event.type === 'login_failed' && event.userEmail) {
      this.trackFailedLogin(event.userEmail, event.ip);
    }
  }

  private trackFailedLogin(email: string, ip?: string): void {
    const key = `${email}::${ip ?? 'unknown'}`;
    const now = Date.now();
    const attempts = (this.failedLogins.get(key) ?? []).filter(
      (t) => now - t < FAILED_LOGIN_WINDOW_MS,
    );
    attempts.push(now);
    this.failedLogins.set(key, attempts);

    if (attempts.length >= FAILED_LOGIN_THRESHOLD) {
      this.logger.error(
        JSON.stringify({
          event: 'security_alert',
          type: 'brute_force_suspected',
          userEmail: email,
          ip,
          attempts: attempts.length,
          windowMs: FAILED_LOGIN_WINDOW_MS,
        }),
      );
    }
  }
}
