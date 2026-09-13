import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AgendamentoListFilter,
  AgendamentoRepository,
} from '../infrastructure/agendamento.repository.js';
import type { CreateAgendamentoDto } from './dto/create-agendamento.dto.js';
import type { UpdateAgendamentoDto } from './dto/update-agendamento.dto.js';

@Injectable()
export class AgendamentoService {
  constructor(private readonly repo: AgendamentoRepository) {}

  async list(opts: AgendamentoListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException('Agendamento nao encontrado');
    return a;
  }

  create(dto: CreateAgendamentoDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateAgendamentoDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
