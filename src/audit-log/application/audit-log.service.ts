import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from '../infrastructure/repositories/audit-log.repository.js';

interface ListOptions {
  page: number;
  limit: number;
  resource?: string;
  action?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly repo: AuditLogRepository) {}

  async list(opts: ListOptions) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }
}
