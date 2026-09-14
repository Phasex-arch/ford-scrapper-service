import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { LeadUrgencia } from '../../../generated/prisma/enums.js';

const sendMailMock = jest.fn();
const createTransportMock = jest.fn(() => ({ sendMail: sendMailMock }));

// nodemailer é importado direto (não injetado no construtor), então em ESM
// precisa de unstable_mockModule + import dinâmico do serviço depois do mock.
jest.unstable_mockModule('nodemailer', () => ({
  default: { createTransport: createTransportMock },
}));

const { PublicLeadService } = await import('./public-lead.service.js');

describe('PublicLeadService', () => {
  const dto = {
    nome: 'Maria Silva',
    email: 'maria@example.com',
    telefone: '(11) 99999-9999',
    veiculoInteresse: 'Ford Territory',
    mensagem: 'Quero uma proposta',
  };

  function setup() {
    const repository = { create: jest.fn().mockResolvedValue({ id: 'lead-id' }) };
    const config = {
      get: jest.fn((key: string) =>
        ({
          GMAIL_USER: 'concessionaria@gmail.com',
          GMAIL_APP_PASSWORD: 'app-password-de-teste',
        })[key],
      ),
    } as unknown as ConfigService;
    sendMailMock.mockReset();
    createTransportMock.mockClear();
    return {
      service: new PublicLeadService(repository as never, config),
      repository,
    };
  }

  it('persiste o lead e confirma o recebimento por email pro próprio cliente que entrou em contato', async () => {
    const { service, repository } = setup();
    sendMailMock.mockResolvedValue({ messageId: 'email-id' });

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
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: { user: 'concessionaria@gmail.com', pass: 'app-password-de-teste' },
      }),
    );
    // A confirmação vai pro cliente (dto.email), não pra concessionária.
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'maria@example.com' }),
    );
  });

  it('retorna erro explícito quando o envio via Gmail falha', async () => {
    const { service } = setup();
    sendMailMock.mockRejectedValue(new Error('SMTP error'));

    await expect(service.create(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('recusa o contato antes de persistir se as credenciais do Gmail não estiverem configuradas', async () => {
    const repository = { create: jest.fn() };
    const config = { get: jest.fn(() => undefined) } as unknown as ConfigService;
    const service = new PublicLeadService(repository as never, config);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
