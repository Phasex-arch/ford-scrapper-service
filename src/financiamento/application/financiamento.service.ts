import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinanciamentoListFilter,
  FinanciamentoRepository,
} from '../infrastructure/financiamento.repository.js';
import type { CreateFinanciamentoDto } from './dto/create-financiamento.dto.js';
import type { UpdateFinanciamentoDto } from './dto/update-financiamento.dto.js';

@Injectable()
export class FinanciamentoService {
  constructor(private readonly repo: FinanciamentoRepository) {}

  async list(opts: FinanciamentoListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Financiamento nao encontrado');
    return item;
  }

  async create(dto: CreateFinanciamentoDto) {
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo ja cadastrado');
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateFinanciamentoDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
