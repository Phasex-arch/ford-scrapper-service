import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { LeadUrgencia } from '../../../generated/prisma/enums.js';
import { PublicLeadService } from './public-lead.service.js';

describe('PublicLeadService', () => {
  const dto = {
    nome: 'Maria Silva',
    email: 'maria@example.com',
    telefone: '(11) 99999-9999',
    veiculoInteresse: 'Ford Territory',
    mensagem: 'Quero uma proposta',
  };

  /** Tipos explícitos: `jest.fn()` sem genérico infere parâmetros `never` sob
   *  @jest/globals, e aí `mockResolvedValue` não compila. */
  type FetchMock = jest.Mock<() => Promise<unknown>>;

  function setup(fetchMock: FetchMock) {
    const repository = {
      create: jest.fn<() => Promise<{ id: string }>>().mockResolvedValue({ id: 'lead-id' }),
    };
    const config = {
      get: jest.fn((key: string) =>
        ({
          RESEND_API_KEY: 're_test',
          RESEND_FROM_EMAIL: 'site@example.com',
          LEAD_NOTIFICATION_EMAIL: 'sales@example.com',
        })[key],
      ),
    } as unknown as ConfigService;
    global.fetch = fetchMock as unknown as typeof fetch;
    return {
      service: new PublicLeadService(repository as never, config),
      repository,
    };
  }

  it('persists the lead and sends the Resend notification', async () => {
    const fetchMock = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'email-id' }),
    });
    const { service, repository } = setup(fetchMock);

    await expect(service.create(dto)).resolves.toEqual({
      id: 'lead-id',
      message: 'Contato recebido com sucesso',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteNome: 'Maria Silva',
        urgencia: LeadUrgencia.MEDIA,
        necessidade: 'Quero uma proposta',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test',
        }),
      }),
    );
  });

  it('returns an explicit unavailable error when Resend fails', async () => {
    const fetchMock = jest.fn<() => Promise<unknown>>().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn<() => Promise<unknown>>().mockResolvedValue({ message: 'provider error' }),
    });
    const { service } = setup(fetchMock);

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
