import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AesGcmService } from '../common/crypto/aes-gcm.service.js';
import { HashService } from '../common/crypto/hash.service.js';
import { stripXss } from '../common/sanitizers/string.sanitizer.js';
import type { CreateLeadDto } from './dto/create-lead.dto.js';

const DEFAULT_RETENTION_DAYS = 365 * 2;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly retentionDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesGcmService,
    private readonly hash: HashService,
    config: ConfigService,
  ) {
    const raw = config.get<string>('LEAD_RETENTION_DAYS');
    this.retentionDays = raw
      ? Math.max(1, parseInt(raw, 10))
      : DEFAULT_RETENTION_DAYS;
  }

  async create(dto: CreateLeadDto, actorUserId: string) {
    const cpfHash = this.hash.lookupHash(dto.cpf);
    const existing = await this.prisma.lead.findUnique({ where: { cpfHash } });
    if (existing && !existing.anonymizedAt) {
      throw new ConflictException('lead já cadastrado');
    }

    const retainUntil = new Date(
      Date.now() + this.retentionDays * 24 * 60 * 60 * 1000,
    );

    const lead = await this.prisma.lead.create({
      data: {
        nome: stripXss(dto.nome).slice(0, 120),
        email: dto.email.toLowerCase(),
        cpfEncrypted: this.aes.encrypt(dto.cpf),
        cpfHash,
        telefoneEnc: this.aes.encrypt(dto.telefone),
        vinSharePseudo: this.hash.pseudonymize(dto.vin, 'vin'),
        consent: dto.consent ?? false,
        consentAt: dto.consent ? new Date() : null,
        retainUntil,
        createdBy: actorUserId,
      },
    });

    return this.toResponse(lead);
  }

  async list(page: number, limit: number, email?: string) {
    const where = email ? { email: { equals: email.toLowerCase() } } : {};
    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return {
      pagination: { page, limit, total },
      leads: leads.map((l) => this.toResponse(l)),
    };
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('lead não encontrado');
    return this.toResponse(lead);
  }

  /**
   * Decrypt PII for the lead owner / ADMIN flows. Wrapper guarantees we
   * never accidentally return ciphertext via `toResponse`.
   */
  async findOneWithPii(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('lead não encontrado');
    if (lead.anonymizedAt) {
      return { ...this.toResponse(lead), cpf: null, telefone: null };
    }
    return {
      ...this.toResponse(lead),
      cpf: this.aes.decrypt(lead.cpfEncrypted),
      telefone: this.aes.decrypt(lead.telefoneEnc),
    };
  }

  /**
   * Pseudonymized export for ML / dashboards (slide 21).
   * Returns NO `nome`, `email`, `cpf` or `telefone`. The `pseudo_id`
   * lets analysts join across snapshots while keeping the dataset
   * compliant with LGPD anonymization-by-design.
   */
  async exportPseudonymized() {
    const leads = await this.prisma.lead.findMany({
      where: { anonymizedAt: null },
      select: {
        id: true,
        vinSharePseudo: true,
        consent: true,
        createdAt: true,
      },
    });
    return leads.map((l) => ({
      pseudo_id: this.hash.pseudonymize(l.id, 'lead'),
      vin_share_pseudo: l.vinSharePseudo,
      consent: l.consent,
      created_at: l.createdAt.toISOString(),
    }));
  }

  /**
   * Irreversible anonymization (slide 20-21).
   * Overwrites PII columns with deterministic placeholders so reports
   * keep their integrity but no real identifier remains.
   */
  async anonymize(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('lead não encontrado');

    const anonId = this.hash.pseudonymize(lead.id, 'lead-anon');
    await this.prisma.lead.update({
      where: { id },
      data: {
        nome: '[ANONIMIZADO]',
        email: `anon+${anonId.slice(0, 16)}@anonymized.local`,
        cpfEncrypted: this.aes.encrypt('00000000000'),
        cpfHash: anonId,
        telefoneEnc: this.aes.encrypt('00000000000'),
        anonymizedAt: new Date(),
      },
    });
    this.logger.log(`Lead ${id} anonymized`);
    return { id, anonymized: true };
  }

  /**
   * Physical delete — only for explicit "esquecimento" requests (LGPD art. 18 VI).
   */
  async delete(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('lead não encontrado');
    await this.prisma.lead.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * LGPD retention sweep: any lead whose `retainUntil` is in the past
   * is anonymized (kept for aggregate stats, no PII).
   */
  async runRetentionSweep(): Promise<number> {
    const candidates = await this.prisma.lead.findMany({
      where: {
        retainUntil: { lt: new Date() },
        anonymizedAt: null,
      },
      select: { id: true },
    });
    for (const c of candidates) {
      await this.anonymize(c.id);
    }
    this.logger.log(`Retention sweep anonymized ${candidates.length} lead(s)`);
    return candidates.length;
  }

  private toResponse(lead: {
    id: string;
    nome: string;
    email: string;
    consent: boolean;
    consentAt: Date | null;
    retainUntil: Date;
    anonymizedAt: Date | null;
    createdAt: Date;
    createdBy: string;
    vinSharePseudo: string;
  }) {
    return {
      id: lead.id,
      nome: lead.nome,
      email: lead.email,
      consent: lead.consent,
      consent_at: lead.consentAt?.toISOString() ?? null,
      retain_until: lead.retainUntil.toISOString(),
      anonymized_at: lead.anonymizedAt?.toISOString() ?? null,
      created_at: lead.createdAt.toISOString(),
      created_by: lead.createdBy,
      vin_share_pseudo: lead.vinSharePseudo,
    };
  }
}
