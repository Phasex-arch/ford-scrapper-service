import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import argon2 from 'argon2';
import { AuthService } from './auth.service.js';
import { ExchangeCodeService } from './exchange-code.service.js';

describe('AuthService', () => {
  const colaborador = {
    id: 'colab-1',
    email: 'admin@ford.com.br',
    nome: 'Administrador Geral',
    role: 'ADMIN' as const,
    ativo: true,
    senha: '',
  };

  async function setup(overrides: Partial<typeof colaborador> = {}) {
    const senhaHash = await argon2.hash('Senha@Forte123', {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const repo = {
      findByEmail: jest.fn<(...args: any[]) => any>().mockResolvedValue({ ...colaborador, senha: senhaHash, ...overrides }),
    };
    const jwtService = { sign: jest.fn<(...args: any[]) => any>().mockReturnValue('signed.jwt.token') };
    const config = { get: jest.fn<(...args: any[]) => any>().mockReturnValue('8h') };
    const securityLogger = { log: jest.fn<(...args: any[]) => any>().mockResolvedValue(undefined) };
    const exchangeCodeService = new ExchangeCodeService();

    const service = new AuthService(
      repo as never,
      jwtService as never,
      config as never,
      securityLogger as never,
      exchangeCodeService,
    );

    return { service, repo, jwtService, securityLogger, exchangeCodeService };
  }

  it('authenticates with correct credentials and returns a signed token', async () => {
    const { service, securityLogger } = await setup();

    const result = await service.login({ email: 'admin@ford.com.br', senha: 'Senha@Forte123' });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user).toEqual(
      expect.objectContaining({ email: 'admin@ford.com.br', role: 'ADMIN' }),
    );
    expect(securityLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'login_success' }),
    );
  });

  it('rejects a wrong password without revealing which check failed', async () => {
    const { service, securityLogger } = await setup();

    await expect(
      service.login({ email: 'admin@ford.com.br', senha: 'senha-errada' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(securityLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'login_failed', details: { reason: 'senha_invalida' } }),
    );
  });

  it('rejects login for an inactive colaborador', async () => {
    const { service, securityLogger } = await setup({ ativo: false });

    await expect(
      service.login({ email: 'admin@ford.com.br', senha: 'Senha@Forte123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(securityLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ details: { reason: 'usuario_inexistente_ou_inativo' } }),
    );
  });

  it('rejects login for an email that does not exist', async () => {
    const { service, repo } = await setup();
    repo.findByEmail.mockResolvedValue(null as never);

    await expect(
      service.login({ email: 'ninguem@ford.com.br', senha: 'qualquer' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('exchanges a freshly created code for a real token exactly once', async () => {
    const { service } = await setup();

    const { code } = service.createExchangeCode({
      id: 'colab-1',
      email: 'admin@ford.com.br',
      role: 'ADMIN',
      nome: 'Administrador Geral',
    });

    const result = service.exchangeCode(code);
    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user.email).toBe('admin@ford.com.br');

    expect(() => service.exchangeCode(code)).toThrow(UnauthorizedException);
  });

  it('rejects an exchange code that was never issued', async () => {
    const { service } = await setup();
    expect(() => service.exchangeCode('00000000-0000-0000-0000-000000000000')).toThrow(
      UnauthorizedException,
    );
  });
});
