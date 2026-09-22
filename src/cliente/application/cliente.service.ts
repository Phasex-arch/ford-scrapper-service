import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ClienteRepository } from '../infrastructure/cliente.repository.js';
import type { ClienteStatus } from '../../../generated/prisma/enums.js';
import type { CreateClienteDto } from './dto/create-cliente.dto.js';
import type { UpdateClienteDto } from './dto/update-cliente.dto.js';

interface ListOptions {
  page: number;
  limit: number;
  status?: ClienteStatus;
  segmento?: string;
  search?: string;
}

@Injectable()
export class ClienteService {
  constructor(
    private readonly repo: ClienteRepository,
    private readonly prisma: PrismaService,
  ) {}

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
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo de cliente ja cadastrado');
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateClienteDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  /**
   * Histórico de cadastro duplicado mesclado (ver FinanciamentoService.
   * aprovar) — quando um lead com e-mail/telefone já cadastrado é
   * convertido, o nome/telefone antigos ficam registrados aqui antes de
   * serem atualizados com o contato mais recente, pra não sumir sem
   * explicação.
   */
  async getHistoricoMesclagem(id: string) {
    await this.findById(id);
    return this.prisma.auditLog.findMany({
      where: { resource: 'Cliente', resourceId: id, action: 'cliente_merge_duplicado' },
      orderBy: { timestamp: 'desc' },
    });
  }
}
