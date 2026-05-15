import { Injectable, NotFoundException } from '@nestjs/common';
import {
  TecnicoListFilter,
  TecnicoRepository,
} from '../infrastructure/tecnico.repository.js';
import type { CreateTecnicoDto } from './dto/create-tecnico.dto.js';
import type { UpdateTecnicoDto } from './dto/update-tecnico.dto.js';

@Injectable()
export class TecnicoService {
  constructor(private readonly repo: TecnicoRepository) {}

  async list(opts: TecnicoListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundException('Tecnico nao encontrado');
    return t;
  }

  create(dto: CreateTecnicoDto) {
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateTecnicoDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
