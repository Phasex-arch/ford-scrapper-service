import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { Role } from '../../../../generated/prisma/enums.js';

export interface ColaboradorListFilter {
  ativo?: boolean;
  role?: Role;
  search?: string;
  page: number;
  limit: number;
}

@Injectable()
export class ColaboradorRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter: ColaboradorListFilter) {
    const where = this.buildWhere(filter);
    return this.prisma.colaborador.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
  }

  count(filter: ColaboradorListFilter): Promise<number> {
    return this.prisma.colaborador.count({ where: this.buildWhere(filter) });
  }

  findById(id: string) {
    return this.prisma.colaborador.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.colaborador.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findByCpf(cpf: string) {
    return this.prisma.colaborador.findUnique({ where: { cpf } });
  }

  findByRegistro(registro: string) {
    return this.prisma.colaborador.findUnique({ where: { registro } });
  }

  create(data: {
    nome: string;
    cpf: string;
    telefone: string;
    email: string;
    endereco: string;
    registro: string;
    cargo: string;
    role?: Role;
    senhaHash: string;
    ativo?: boolean;
  }) {
    return this.prisma.colaborador.create({
      data: {
        nome: data.nome,
        cpf: data.cpf,
        telefone: data.telefone,
        email: data.email.toLowerCase(),
        endereco: data.endereco,
        registro: data.registro,
        cargo: data.cargo,
        role: data.role,
        ativo: data.ativo ?? true,
        senha: data.senhaHash,
      },
    });
  }

  update(
    id: string,
    data: Partial<{
      nome: string;
      telefone: string;
      email: string;
      endereco: string;
      cargo: string;
      role: Role;
      ativo: boolean;
      senha: string;
    }>,
  ) {
    return this.prisma.colaborador.update({
      where: { id },
      data: {
        ...data,
        email: data.email?.toLowerCase(),
      },
    });
  }

  softDelete(id: string) {
    return this.prisma.colaborador.update({
      where: { id },
      data: { ativo: false },
    });
  }

  private buildWhere(filter: ColaboradorListFilter) {
    const where: Record<string, unknown> = {};
    if (typeof filter.ativo === 'boolean') where.ativo = filter.ativo;
    if (filter.role) where.role = filter.role;
    if (filter.search && filter.search.trim().length > 0) {
      const q = filter.search.trim();
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { registro: { contains: q, mode: 'insensitive' } },
      ];
    }
    return where;
  }
}
