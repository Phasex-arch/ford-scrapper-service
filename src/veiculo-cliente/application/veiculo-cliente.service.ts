import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ClienteService } from '../../cliente/application/cliente.service.js';
import { VeiculoClienteRepository } from '../infrastructure/veiculo-cliente.repository.js';
import type { CreateVeiculoClienteDto } from './dto/create-veiculo-cliente.dto.js';
import type { UpdateVeiculoClienteDto } from './dto/update-veiculo-cliente.dto.js';

@Injectable()
export class VeiculoClienteService {
  constructor(
    private readonly repo: VeiculoClienteRepository,
    private readonly clienteService: ClienteService,
  ) {}

  async listByCliente(clienteId: string) {
    await this.clienteService.findById(clienteId); // 404 se o cliente não existir
    return this.repo.findAllByCliente(clienteId);
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Veiculo do cliente nao encontrado');
    return item;
  }

  async create(clienteId: string, dto: CreateVeiculoClienteDto) {
    await this.clienteService.findById(clienteId);
    const existing = await this.repo.findByCodigo(dto.codigo);
    if (existing) throw new ConflictException('Codigo ja cadastrado');
    const created = await this.repo.create(clienteId, dto);
    await this.repo.ajustarAgregadosCliente(clienteId, 1, dto.precoAquisicao);
    return created;
  }

  /** Se precoAquisicao mudar, o LTV do cliente acompanha a diferença — não
   * fica preso ao valor original da compra registrada. */
  async update(id: string, dto: UpdateVeiculoClienteDto) {
    const atual = await this.findById(id);
    const atualizado = await this.repo.update(id, dto);
    if (dto.precoAquisicao !== undefined && dto.precoAquisicao !== atual.precoAquisicao) {
      await this.repo.ajustarAgregadosCliente(atual.clienteId, 0, dto.precoAquisicao - atual.precoAquisicao);
    }
    return atualizado;
  }

  async delete(id: string) {
    const item = await this.findById(id);
    await this.repo.delete(id);
    await this.repo.ajustarAgregadosCliente(item.clienteId, -1, -item.precoAquisicao);
    return item;
  }
}
