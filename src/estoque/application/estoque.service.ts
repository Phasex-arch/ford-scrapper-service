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

/** Tentativas de geracao antes de desistir — colisao aqui e evento raro. */
const TENTATIVAS_CODIGO = 5;

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
    if (dto.codigo) {
      const existing = await this.repo.findByCodigo(dto.codigo);
      if (existing) throw new ConflictException('Codigo ja cadastrado');
      return this.repo.create({ ...dto, codigo: dto.codigo });
    }
    // Chave de negocio gerada no servidor; o @unique do banco resolve corrida.
    const base = await this.repo.totalRegistros();
    for (let i = 1; i <= TENTATIVAS_CODIGO; i++) {
      const codigo = `E${String(base + i).padStart(6, '0')}`;
      try {
        return await this.repo.create({ ...dto, codigo });
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    throw new ConflictException('Nao foi possivel gerar um codigo de estoque');
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
