import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { CreateVeiculoClienteDto } from '../application/dto/create-veiculo-cliente.dto.js';
import type { UpdateVeiculoClienteDto } from '../application/dto/update-veiculo-cliente.dto.js';

@Injectable()
export class VeiculoClienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByCliente(clienteId: string) {
    return this.prisma.veiculoCliente.findMany({
      where: { clienteId },
      orderBy: { dataAquisicao: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.veiculoCliente.findUnique({ where: { id } });
  }

  findByCodigo(codigo: string) {
    return this.prisma.veiculoCliente.findUnique({ where: { codigo } });
  }

  create(clienteId: string, dto: CreateVeiculoClienteDto) {
    return this.prisma.veiculoCliente.create({
      data: {
        ...dto,
        clienteId,
        dataAquisicao: new Date(dto.dataAquisicao),
        dataSaida: dto.dataSaida ? new Date(dto.dataSaida) : undefined,
      },
    });
  }

  update(id: string, dto: UpdateVeiculoClienteDto) {
    return this.prisma.veiculoCliente.update({
      where: { id },
      data: {
        ...dto,
        dataAquisicao: dto.dataAquisicao ? new Date(dto.dataAquisicao) : undefined,
        dataSaida: dto.dataSaida ? new Date(dto.dataSaida) : undefined,
      },
    });
  }

  delete(id: string) {
    return this.prisma.veiculoCliente.delete({ where: { id } });
  }

  incrementVeiculosCount(clienteId: string, delta: number) {
    return this.prisma.cliente.update({
      where: { id: clienteId },
      data: { veiculosCount: { increment: delta } },
    });
  }
}
