import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { Role } from '../../../../generated/prisma/enums.js';
import { AesGcmService } from '../../../common/crypto/aes-gcm.service.js';
import { HashService } from '../../../common/crypto/hash.service.js';

export interface ColaboradorListFilter {
  ativo?: boolean;
  role?: Role;
  search?: string;
  page: number;
  limit: number;
}

/**
 * O CPF fica cifrado no banco (AES-256-GCM) e é buscado pelo blind index
 * `cpfHash`. Toda leitura que sai deste repositório já vem com o CPF em
 * claro — quem mascara para a resposta HTTP é o toColaboradorResponse.
 */
@Injectable()
export class ColaboradorRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesGcmService,
    private readonly hash: HashService,
  ) {}

  async findAll(filter: ColaboradorListFilter) {
    const where = this.buildWhere(filter);
    const rows = await this.prisma.colaborador.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    });
    return rows.map((c) => this.decryptCpf(c));
  }

  count(filter: ColaboradorListFilter): Promise<number> {
    return this.prisma.colaborador.count({ where: this.buildWhere(filter) });
  }

  async findById(id: string) {
    const c = await this.prisma.colaborador.findUnique({ where: { id } });
    return c && this.decryptCpf(c);
  }

  findByEmail(email: string) {
    return this.prisma.colaborador.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  findByCpf(cpf: string) {
    return this.prisma.colaborador.findUnique({
      where: { cpfHash: this.hash.lookupHash(cpf) },
    });
  }

  findByRegistro(registro: string) {
    return this.prisma.colaborador.findUnique({ where: { registro } });
  }

  async create(data: {
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
    const c = await this.prisma.colaborador.create({
      data: {
        nome: data.nome,
        cpf: this.aes.encrypt(data.cpf),
        cpfHash: this.hash.lookupHash(data.cpf),
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
    return this.decryptCpf(c);
  }

  async update(
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
    const c = await this.prisma.colaborador.update({
      where: { id },
      data: {
        ...data,
        email: data.email?.toLowerCase(),
      },
    });
    return this.decryptCpf(c);
  }

  async softDelete(id: string) {
    const c = await this.prisma.colaborador.update({
      where: { id },
      data: { ativo: false },
    });
    return this.decryptCpf(c);
  }

  /** Linhas com cpfHash nulo ainda não foram cifradas (ver ColaboradorCpfBackfill). */
  private decryptCpf<T extends { cpf: string; cpfHash: string | null }>(c: T): T {
    return c.cpfHash ? { ...c, cpf: this.aes.decrypt(c.cpf) } : c;
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
