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

  function setup(fetchMock: jest.Mock) {
    const repository = { create: jest.fn<(...args: any[]) => any>().mockResolvedValue({ id: 'lead-id' }) };
    const config = {
      get: jest.fn((key: string) =>
        ({
          BREVO_API_KEY: 'brevo-key-de-teste',
          BREVO_SENDER_EMAIL: 'concessionaria@gmail.com',
        })[key],
      ),
    } as unknown as ConfigService;
    global.fetch = fetchMock as unknown as typeof fetch;
    return {
      service: new PublicLeadService(repository as never, config),
      repository,
    };
  }

  it('persiste o lead e confirma o recebimento por email pro próprio cliente que entrou em contato', async () => {
    const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn<(...args: any[]) => any>().mockResolvedValue({ messageId: 'email-id' }),
    });
    const { service, repository } = setup(fetchMock);

    await expect(service.create(dto)).resolves.toEqual({
      id: 'lead-id',
      message: 'Contato recebido com sucesso',
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteNome: 'Maria Silva',
        // Sem valorEstimado informado (0) → urgência mais baixa, derivada
        // automaticamente — não é mais MEDIA fixo pra todo lead que entra.
        urgencia: LeadUrgencia.BAIXA,
        necessidade: 'Quero uma proposta',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        headers: expect.objectContaining({ 'api-key': 'brevo-key-de-teste' }),
      }),
    );
    // A confirmação vai pro cliente (dto.email), não pra concessionária.
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual([{ email: 'maria@example.com', name: 'Maria Silva' }]);
    expect(body.sender).toEqual({ email: 'concessionaria@gmail.com', name: 'Ford One' });
  });

  it('deriva urgência mais alta pra leads de valor estimado alto, mesmo sem o form pedir isso ao visitante', async () => {
    const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue({
      ok: true,
      status: 201,
      json: jest.fn<(...args: any[]) => any>().mockResolvedValue({ messageId: 'email-id' }),
    });
    const { service, repository } = setup(fetchMock);

    await service.create({ ...dto, valorEstimado: 350_000 });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ urgencia: LeadUrgencia.URGENTE }),
    );
  });

  it('retorna erro explícito quando o envio via Brevo falha', async () => {
    const fetchMock = jest.fn<(...args: any[]) => any>().mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn<(...args: any[]) => any>().mockResolvedValue({ message: 'Key not found' }),
    });
    const { service } = setup(fetchMock);

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('recusa o contato antes de persistir se as credenciais do Brevo não estiverem configuradas', async () => {
    const repository = { create: jest.fn<(...args: any[]) => any>() };
    const config = { get: jest.fn(() => undefined) } as unknown as ConfigService;
    const service = new PublicLeadService(repository as never, config);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
