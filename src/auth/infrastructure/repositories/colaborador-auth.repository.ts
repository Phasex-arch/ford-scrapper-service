import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { Role } from '../../../../generated/prisma/enums.js';

export interface CreateColaboradorAuthData {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  registro: string;
  cargo: string;
  role?: Role;
  senhaHash: string;
}

@Injectable()
export class ColaboradorAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.colaborador.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.colaborador.findUnique({ where: { id } });
  }

  create(data: CreateColaboradorAuthData) {
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
        senha: data.senhaHash,
      },
    });
  }

  countAdmins(): Promise<number> {
    return this.prisma.colaborador.count({ where: { role: 'ADMIN' } });
  }
}
