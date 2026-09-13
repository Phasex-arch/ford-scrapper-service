import {
  InternalServerErrorException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { LeadUrgencia } from '../../../generated/prisma/enums.js';
import { LeadRepository } from '../infrastructure/lead.repository.js';
import type { CreatePublicLeadDto } from './dto/create-public-lead.dto.js';

interface ResendResponse {
  id?: string;
  message?: string;
}

@Injectable()
export class PublicLeadService {
  private readonly logger = new Logger(PublicLeadService.name);

  constructor(
    private readonly leads: LeadRepository,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePublicLeadDto) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('RESEND_FROM_EMAIL');
    const notificationEmail = this.config.get<string>('LEAD_NOTIFICATION_EMAIL');
    if (!apiKey || !from || !notificationEmail) {
      throw new ServiceUnavailableException(
        'Contato indisponivel: notificacoes nao configuradas',
      );
    }

    const leadData = {
      codigo: `PUB-${randomUUID().slice(0, 12).toUpperCase()}`,
      clienteNome: dto.nome,
      iniciais: this.initials(dto.nome),
      veiculoInteresse: dto.veiculoInteresse,
      necessidade: dto.mensagem,
      urgencia: dto.urgencia ?? LeadUrgencia.MEDIA,
      valorEstimado: dto.valorEstimado ?? 0,
      telefone: dto.telefone,
      email: dto.email,
    };

    let lead;
    try {
      lead = await this.leads.create(leadData);
    } catch (error) {
      this.logger.error('Falha ao persistir lead publico', error);
      throw new InternalServerErrorException('Nao foi possivel registrar o contato');
    }

    try {
      await this.sendNotification({
        apiKey,
        from,
        to: notificationEmail,
        dto,
        leadId: lead.id,
      });
    } catch (error) {
      this.logger.error(`Falha ao notificar novo lead ${lead.id}`, error);
      throw new ServiceUnavailableException(
        'Contato registrado, mas a notificacao nao foi enviada',
      );
    }

    return { id: lead.id, message: 'Contato recebido com sucesso' };
  }

  private async sendNotification(input: {
    apiKey: string;
    from: string;
    to: string;
    dto: CreatePublicLeadDto;
    leadId: string;
  }): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: `Novo contato público — ${input.dto.veiculoInteresse} — ${input.dto.nome}`,
        text: [
          `Lead: ${input.leadId}`,
          `Nome: ${input.dto.nome}`,
          `Email: ${input.dto.email}`,
          `Telefone: ${input.dto.telefone}`,
          `Interesse: ${input.dto.veiculoInteresse}`,
          `Mensagem: ${input.dto.mensagem}`,
        ].join('\n'),
        reply_to: input.dto.email,
      }),
    });

    let body: ResendResponse = {};
    try {
      body = (await response.json()) as ResendResponse;
    } catch {
      // The status code below remains the source of truth for malformed responses.
    }
    if (!response.ok) {
      throw new Error(body.message ?? `Resend respondeu HTTP ${response.status}`);
    }
  }

  private initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();
  }
}
