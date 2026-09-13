import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';

export interface AuditLogListFilter {
  page: number;
  limit: number;
  resource?: string;
  action?: string;
}

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: AuditLogListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: AuditLogListFilter): Promise<number> {
    return this.prisma.auditLog.count({ where: this.buildWhere(filter) });
  }

  private buildWhere(filter: AuditLogListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.resource) where.resource = filter.resource;
    if (filter.action) where.action = filter.action;
    return where;
  }
}
