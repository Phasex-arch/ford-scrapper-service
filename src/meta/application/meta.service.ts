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

/** Tentativas de geracao antes de desistir — colisao aqui e evento raro. */
const TENTATIVAS_CODIGO = 5;

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

  /** `atual` e o realizado: nasce em 0 e nunca vem do cliente na criacao. */
  async create(dto: CreateMetaDto) {
    if (dto.codigo) {
      const existing = await this.repo.findByCodigo(dto.codigo);
      if (existing) throw new ConflictException('Codigo de meta ja cadastrado');
      return this.repo.create({ ...dto, codigo: dto.codigo, atual: 0 });
    }
    // Chave de negocio gerada no servidor; o @unique do banco resolve corrida.
    const base = await this.repo.totalRegistros();
    for (let i = 1; i <= TENTATIVAS_CODIGO; i++) {
      const codigo = `M${String(base + i).padStart(6, '0')}`;
      try {
        return await this.repo.create({ ...dto, codigo, atual: 0 });
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    throw new ConflictException('Nao foi possivel gerar um codigo de meta');
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
