import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstoqueListFilter,
  EstoqueRepository,
} from '../infrastructure/estoque.repository.js';
import type { CreateEstoqueDto } from './dto/create-estoque.dto.js';
import type { UpdateEstoqueDto } from './dto/update-estoque.dto.js';

@Injectable()
export class EstoqueService {
  constructor(private readonly repo: EstoqueRepository) {}

  async list(opts: EstoqueListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Item de estoque nao encontrado');
    return item;
  }

  async create(dto: CreateEstoqueDto) {
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo ja cadastrado');
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateEstoqueDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
