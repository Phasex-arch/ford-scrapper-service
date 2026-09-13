import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { UpdateConcessionariaDto } from '../application/dto/update-concessionaria.dto.js';

const PADRAO = {
  nome: 'Ford SP Centro',
  cnpj: '12.345.678/0001-99',
  endereco: 'Av. Paulista, 1000 — São Paulo/SP',
  telefone: '(11) 3000-4000',
};

@Injectable()
export class ConfiguracoesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findConcessionaria() {
    const existing = await this.prisma.configuracaoConcessionaria.findFirst();
    if (existing) return existing;
    // Nenhuma configuração salva ainda — cria a linha singleton com valores
    // padrão na primeira leitura, pra sempre haver algo real pra editar.
    return this.prisma.configuracaoConcessionaria.create({ data: PADRAO });
  }

  async updateConcessionaria(dto: UpdateConcessionariaDto) {
    const current = await this.findConcessionaria();
    return this.prisma.configuracaoConcessionaria.update({
      where: { id: current.id },
      data: dto,
    });
  }
}
