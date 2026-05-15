import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MetaListFilter,
  MetaRepository,
} from '../infrastructure/meta.repository.js';
import type { CreateMetaDto } from './dto/create-meta.dto.js';
import type { UpdateMetaDto } from './dto/update-meta.dto.js';

@Injectable()
export class MetaService {
  constructor(private readonly repo: MetaRepository) {}

  async list(opts: MetaListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const meta = await this.repo.findById(id);
    if (!meta) throw new NotFoundException('Meta nao encontrada');
    return meta;
  }

  async create(dto: CreateMetaDto) {
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo de meta ja cadastrado');
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateMetaDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
