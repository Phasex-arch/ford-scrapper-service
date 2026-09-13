import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { ColaboradorService } from './colaborador.service.js';

describe('ColaboradorService', () => {
  const dto = {
    nome: '  Maria Consultora  ',
    cpf: '123.456.789-00',
    telefone: '(11) 98888-7777',
    email: 'Maria@Ford.com.br',
    endereco: 'Av. Paulista, 1000',
    registro: 'FRD-VEN-010',
    cargo: 'Vendedora',
    role: 'FUNCIONARIO' as const,
    ativo: true,
    senha: 'Senha@Forte123',
  };

  function setup() {
    const repo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByCpf: jest.fn().mockResolvedValue(null),
      findByRegistro: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue({ id: 'colab-1' }),
      create: jest.fn().mockResolvedValue({ id: 'colab-1' }),
      update: jest.fn().mockResolvedValue({ id: 'colab-1' }),
      softDelete: jest.fn().mockResolvedValue({ id: 'colab-1', ativo: false }),
    };
    return { service: new ColaboradorService(repo as never), repo };
  }

  it('creates a colaborador with normalized fields and a hashed password', async () => {
    const { service, repo } = setup();

    await service.create(dto);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: 'Maria Consultora',
        cpf: '12345678900',
        email: 'maria@ford.com.br',
        registro: 'FRD-VEN-010',
      }),
    );
    const senhaHash = (repo.create.mock.calls[0][0] as { senhaHash: string }).senhaHash;
    expect(senhaHash).not.toBe(dto.senha);
    expect(senhaHash).toMatch(/^\$argon2id\$/);
  });

  it('rejects creation when the email is already registered', async () => {
    const { service, repo } = setup();
    repo.findByEmail.mockResolvedValue({ id: 'outro' } as never);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the CPF is already registered', async () => {
    const { service, repo } = setup();
    repo.findByCpf.mockResolvedValue({ id: 'outro' } as never);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects creation when the registro is already taken', async () => {
    const { service, repo } = setup();
    repo.findByRegistro.mockResolvedValue({ id: 'outro' } as never);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('throws when updating a colaborador that does not exist', async () => {
    const { service, repo } = setup();
    repo.findById.mockResolvedValue(null);

    await expect(service.update('inexistente', { nome: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('soft-deletes instead of removing the row', async () => {
    const { service, repo } = setup();

    const result = await service.delete('colab-1');

    expect(repo.softDelete).toHaveBeenCalledWith('colab-1');
    expect(result.ativo).toBe(false);
  });
});
