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
    const existing = await this.repo.findByNumero(dto.numero);
    if (existing) throw new ConflictException('Numero de OS ja cadastrado');
    return this.repo.create(dto);
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
