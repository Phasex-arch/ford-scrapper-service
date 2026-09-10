import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { ColaboradorRepository } from '../infrastructure/repositories/colaborador.repository.js';
import type { AuthenticatedUser } from '../../auth/domain/authenticated-user.js';
import type { Role } from '../../../generated/prisma/enums.js';
import type { CreateColaboradorDto } from './dto/create-colaborador.dto.js';
import type { UpdateColaboradorDto } from './dto/update-colaborador.dto.js';

interface ListOptions {
  page: number;
  limit: number;
  ativo?: boolean;
  role?: Role;
  search?: string;
}

@Injectable()
export class ColaboradorService {
  constructor(private readonly repo: ColaboradorRepository) {}

  async list(opts: ListOptions) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundException('Colaborador nao encontrado');
    return c;
  }

  async create(dto: CreateColaboradorDto) {
    const cpfNormalized = dto.cpf.replace(/\D/g, '');
    const email = dto.email.toLowerCase();

    const [existingEmail, existingCpf, existingRegistro] = await Promise.all([
      this.repo.findByEmail(email),
      this.repo.findByCpf(cpfNormalized),
      this.repo.findByRegistro(dto.registro),
    ]);

    if (existingEmail) throw new ConflictException('Email ja cadastrado');
    if (existingCpf) throw new ConflictException('CPF ja cadastrado');
    if (existingRegistro) throw new ConflictException('Registro ja cadastrado');

    const senhaHash = await argon2.hash(dto.senha, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    return this.repo.create({
      nome: dto.nome.trim(),
      cpf: cpfNormalized,
      telefone: dto.telefone.trim(),
      email,
      endereco: dto.endereco.trim(),
      registro: dto.registro.trim(),
      cargo: dto.cargo.trim(),
      role: dto.role,
      ativo: dto.ativo,
      senhaHash,
    });
  }

  /**
   * P0-3: o PATCH aceitava `role`, `senha` e `ativo` de qualquer ADMIN ou
   * GERENTE, sem nenhuma checagem de autorizacao. Um GERENTE se promovia a
   * ADMIN em uma requisicao, ou tomava a conta de um ADMIN trocando a senha.
   *
   * P1-5: ninguem — nem o proprio ADMIN — pode deixar o sistema sem ADMIN
   * ativo, porque `POST /auth/register` exige ADMIN e nao haveria volta.
   */
  async update(id: string, dto: UpdateColaboradorDto, ator: AuthenticatedUser) {
    const alvo = await this.findById(id);
    const atorEhAdmin = ator.role === 'ADMIN';

    if (!atorEhAdmin) {
      if (alvo.role === 'ADMIN') {
        throw new ForbiddenException(
          'Apenas um ADMIN pode alterar outro ADMIN',
        );
      }
      if (dto.role !== undefined) {
        throw new ForbiddenException('Apenas um ADMIN pode alterar papeis');
      }
      if (dto.ativo !== undefined) {
        throw new ForbiddenException(
          'Apenas um ADMIN pode ativar ou desativar colaboradores',
        );
      }
      // Trocar a propria senha continua liberado; a de outra pessoa, nao.
      if (dto.senha !== undefined && alvo.id !== ator.id) {
        throw new ForbiddenException(
          'Apenas um ADMIN pode redefinir a senha de outro colaborador',
        );
      }
    }

    const perdendoAdmin =
      alvo.role === 'ADMIN' &&
      alvo.ativo &&
      (dto.ativo === false || (dto.role !== undefined && dto.role !== 'ADMIN'));
    if (perdendoAdmin) await this.assertNaoEhUltimoAdmin();

    if (dto.email) {
      const existing = await this.repo.findByEmail(dto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email ja cadastrado');
      }
    }

    const data: Parameters<ColaboradorRepository['update']>[1] = {};
    if (dto.nome !== undefined) data.nome = dto.nome.trim();
    if (dto.telefone !== undefined) data.telefone = dto.telefone.trim();
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.endereco !== undefined) data.endereco = dto.endereco.trim();
    if (dto.cargo !== undefined) data.cargo = dto.cargo.trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.ativo !== undefined) data.ativo = dto.ativo;
    if (dto.senha) {
      data.senha = await argon2.hash(dto.senha, {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });
    }

    return this.repo.update(id, data);
  }

  async delete(id: string) {
    const alvo = await this.findById(id);
    if (alvo.role === 'ADMIN' && alvo.ativo) {
      await this.assertNaoEhUltimoAdmin();
    }
    return this.repo.softDelete(id);
  }

  /** P1-5: desativar/rebaixar o ultimo ADMIN ativo trancaria todo mundo fora. */
  private async assertNaoEhUltimoAdmin(): Promise<void> {
    if ((await this.repo.countActiveAdmins()) <= 1) {
      throw new ConflictException(
        'O sistema precisa de ao menos um ADMIN ativo',
      );
    }
  }
}
