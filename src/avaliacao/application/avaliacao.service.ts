import { Injectable, NotFoundException } from '@nestjs/common';
import { AvaliacaoRepository } from '../infrastructure/avaliacao.repository.js';
import type { AvaliacaoStatus } from '../../../generated/prisma/enums.js';
import type { CreateAvaliacaoDto } from './dto/create-avaliacao.dto.js';
import type { UpdateAvaliacaoDto } from './dto/update-avaliacao.dto.js';

interface ListOptions {
  page: number;
  limit: number;
  notaMin?: number;
  notaMax?: number;
}

@Injectable()
export class AvaliacaoService {
  constructor(private readonly repo: AvaliacaoRepository) {}

  /** Listagem pública — só o que já foi moderado e aprovado (ver auditoria,
   * seção 2: antes qualquer avaliação criada pelo endpoint público ficava
   * visível na hora, sem revisão nenhuma). */
  async list(opts: ListOptions) {
    const [data, total] = await Promise.all([
      this.repo.findAll({ ...opts, status: 'APROVADA' }),
      this.repo.count({ ...opts, status: 'APROVADA' }),
    ]);
    return { data, total };
  }

  /** Listagem interna (staff) — todos os status, pra moderar. */
  async listTodas(opts: ListOptions & { status?: AvaliacaoStatus }) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const a = await this.repo.findById(id);
    if (!a) throw new NotFoundException('Avaliacao nao encontrada');
    return a;
  }

  /** Versão pública do findById — pendente/rejeitada não existe pra fora. */
  async findByIdPublic(id: string) {
    const a = await this.findById(id);
    if (a.status !== 'APROVADA') throw new NotFoundException('Avaliacao nao encontrada');
    return a;
  }

  create(dto: CreateAvaliacaoDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateAvaliacaoDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  stats() {
    return this.repo.stats();
  }
}
