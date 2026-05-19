import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

const BRUTE_FORCE_WINDOW_MS = 5 * 60 * 1000;
const BRUTE_FORCE_THRESHOLD = 5;

export interface AuditRecordInput {
  userId: string | null;
  action: string;
  resource?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  traceId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditRecordInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: input.action,
          resource: input.resource ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          traceId: input.traceId ?? null,
          metadata: (input.metadata ?? {}) as object,
        },
      });
    } catch (err) {
      this.logger.warn(
        `Failed to write audit log [${input.action}]: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Brute-force detector (slide 25 "alertas de brute force").
   * Counts failed-login attempts from the same IP in the last 5 minutes.
   * When the threshold is crossed, emits a WARN log and inserts a
   * BRUTE_FORCE_SUSPECTED audit row that ops can alert on.
   */
  async detectBruteForce(ip: string | null, email: string): Promise<void> {
    if (!ip) return;
    const since = new Date(Date.now() - BRUTE_FORCE_WINDOW_MS);
    const count = await this.prisma.auditLog.count({
      where: {
        action: 'AUTH_LOGIN_FAILED',
        ip,
        createdAt: { gte: since },
      },
    });
    if (count >= BRUTE_FORCE_THRESHOLD) {
      this.logger.warn(
        `BRUTE_FORCE_SUSPECTED ip=${ip} attempts=${count} window=${BRUTE_FORCE_WINDOW_MS}ms`,
      );
      await this.record({
        userId: null,
        action: 'BRUTE_FORCE_SUSPECTED',
        ip,
        metadata: { attempts: count, lastEmail: email },
      });
    }
  }

  async list(limit: number, action?: string, userId?: string) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(action ? { action } : {}),
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Minimal /metrics view (slide 25).
   * Returns counts grouped by action over the last 24h plus 5xx incidents.
   */
  async metrics() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [byAction, total, last5xx] = await Promise.all([
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
      }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: since } } }),
      this.prisma.auditLog.findMany({
        where: {
          createdAt: { gte: since },
          metadata: { path: ['outcome'], equals: 'FAILURE' },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          createdAt: true,
          traceId: true,
          metadata: true,
        },
      }),
    ]);

    return {
      window_hours: 24,
      total_audit_events: total,
      events_by_action: byAction.map((b) => ({
        action: b.action,
        count: b._count.id,
      })),
      recent_failures: last5xx,
    };
  }
}
