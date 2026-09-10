import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { ClienteStatus } from '../../../generated/prisma/enums.js';
import type { CreateClienteDto } from '../application/dto/create-cliente.dto.js';
import type { UpdateClienteDto } from '../application/dto/update-cliente.dto.js';

export interface ClienteListFilter {
  page: number;
  limit: number;
  status?: ClienteStatus;
  segmento?: string;
  search?: string;
}

@Injectable()
export class ClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: ClienteListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.cliente.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: ClienteListFilter) {
    return this.prisma.cliente.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.cliente.findUnique({ where: { id } });
  }

  findByCodigo(codigo: string) {
    return this.prisma.cliente.findUnique({ where: { codigo } });
  }

  /** Total de registros — base da sequencia de `codigo` gerada no servidor. */
  totalRegistros() {
    return this.prisma.cliente.count();
  }

  create(dto: CreateClienteDto & { codigo: string }) {
    return this.prisma.cliente.create({
      data: {
        ...dto,
        ultimaVisita: dto.ultimaVisita ? new Date(dto.ultimaVisita) : null,
      },
    });
  }

  update(id: string, dto: UpdateClienteDto) {
    return this.prisma.cliente.update({
      where: { id },
      data: {
        ...dto,
        ultimaVisita: dto.ultimaVisita ? new Date(dto.ultimaVisita) : undefined,
      },
    });
  }

  delete(id: string) {
    return this.prisma.cliente.delete({ where: { id } });
  }

  private buildWhere(filter: ClienteListFilter) {
    const where: Record<string, unknown> = {};
    if (filter.status) where.status = filter.status;
    if (filter.segmento) where.segmento = filter.segmento;
    if (filter.search && filter.search.trim()) {
      const q = filter.search.trim();
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { codigo: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}
