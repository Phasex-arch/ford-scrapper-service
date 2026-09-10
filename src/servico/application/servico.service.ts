import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ServicoListFilter,
  ServicoRepository,
} from '../infrastructure/servico.repository.js';
import type { CreateServicoDto } from './dto/create-servico.dto.js';
import type { UpdateServicoDto } from './dto/update-servico.dto.js';

/** Tentativas de geracao antes de desistir — colisao aqui e evento raro. */
const TENTATIVAS_NUMERO = 5;

/** A oficina numera as OS na faixa #48xx/#49xx; a sequencia continua dali. */
const NUMERO_BASE = 4900;

@Injectable()
export class ServicoService {
  constructor(private readonly repo: ServicoRepository) {}

  async list(opts: ServicoListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const os = await this.repo.findById(id);
    if (!os) throw new NotFoundException('Ordem de servico nao encontrada');
    return os;
  }

  async create(dto: CreateServicoDto) {
    if (dto.numero) {
      const existing = await this.repo.findByNumero(dto.numero);
      if (existing) throw new ConflictException('Numero de OS ja cadastrado');
      return this.repo.create({ ...dto, numero: dto.numero });
    }
    // O numero da OS e chave de negocio: gerado aqui, nao no navegador (duas abas
    // abertas geravam o mesmo '#' + (4900 + servicos.length + 1)).
    const base = await this.repo.totalRegistros();
    for (let i = 1; i <= TENTATIVAS_NUMERO; i++) {
      const numero = `#${NUMERO_BASE + base + i}`;
      try {
        return await this.repo.create({ ...dto, numero });
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    throw new ConflictException('Nao foi possivel gerar um numero de OS');
  }

  async update(id: string, dto: UpdateServicoDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }
}
