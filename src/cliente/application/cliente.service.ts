import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  constructor(private readonly repo: ClienteRepository) {}

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
}
