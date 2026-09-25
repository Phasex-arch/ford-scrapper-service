import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';

@Injectable()
export class ColaboradorAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.colaborador.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.colaborador.findUnique({ where: { id } });
  }

  countAdmins(): Promise<number> {
    return this.prisma.colaborador.count({ where: { role: 'ADMIN' } });
  }
}
