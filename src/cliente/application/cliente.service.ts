import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClienteRepository } from '../infrastructure/cliente.repository.js';
import type { ClienteStatus } from '../../../generated/prisma/enums.js';
import type { CreateClienteDto } from './dto/create-cliente.dto.js';
import type { UpdateClienteDto } from './dto/update-cliente.dto.js';

/** Tentativas de geracao antes de desistir — colisao aqui e evento raro. */
const TENTATIVAS_CODIGO = 5;

interface ListOptions {
  page: number;
  limit: number;
  status?: ClienteStatus;
  segmento?: string;
  search?: string;
}

@Injectable()
export class ClienteService {
  constructor(private readonly repo: ClienteRepository) {}

  async list(opts: ListOptions) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException('Cliente nao encontrado');
    return c;
  }

  async create(dto: CreateClienteDto) {
    if (dto.codigo) {
      const existing = await this.repo.findByCodigo(dto.codigo);
      if (existing) throw new ConflictException('Codigo de cliente ja cadastrado');
      return this.repo.create({ ...dto, codigo: dto.codigo });
    }
    return this.criarComCodigoGerado(dto);
  }

  /**
   * Chave de negocio e do servidor: sequencia a partir do total existente. O
   * `@unique` do banco e a autoridade sob concorrencia, por isso o retry — duas
   * abas criando ao mesmo tempo nao colidem mais em `C${Date.now()}`.
   */
  private async criarComCodigoGerado(dto: CreateClienteDto) {
    const base = await this.repo.totalRegistros();
    for (let i = 1; i <= TENTATIVAS_CODIGO; i++) {
      const codigo = `C${String(base + i).padStart(6, '0')}`;
      try {
        return await this.repo.create({ ...dto, codigo });
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    throw new ConflictException('Nao foi possivel gerar um codigo de cliente');
  }

  async update(id: string, dto: UpdateClienteDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
