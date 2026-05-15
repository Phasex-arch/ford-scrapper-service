import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LeadListFilter,
  LeadRepository,
} from '../infrastructure/lead.repository.js';
import type { CreateLeadDto } from './dto/create-lead.dto.js';
import type { UpdateLeadDto } from './dto/update-lead.dto.js';

@Injectable()
export class LeadService {
  constructor(private readonly repo: LeadRepository) {}

  async list(opts: LeadListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const lead = await this.repo.findById(id);
    if (!lead) throw new NotFoundException('Lead nao encontrado');
    return lead;
  }

  async create(dto: CreateLeadDto) {
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo ja cadastrado');
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateLeadDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
