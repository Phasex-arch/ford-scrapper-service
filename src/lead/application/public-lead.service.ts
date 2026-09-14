import {
  InternalServerErrorException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { LeadUrgencia } from '../../../generated/prisma/enums.js';
import { LeadRepository } from '../infrastructure/lead.repository.js';
import type { CreatePublicLeadDto } from './dto/create-public-lead.dto.js';

@Injectable()
export class PublicLeadService {
  private readonly logger = new Logger(PublicLeadService.name);

  constructor(
    private readonly leads: LeadRepository,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreatePublicLeadDto) {
    const gmailUser = this.config.get<string>('GMAIL_USER');
    const gmailAppPassword = this.config.get<string>('GMAIL_APP_PASSWORD');
    if (!gmailUser || !gmailAppPassword) {
      throw new ServiceUnavailableException(
        'Contato indisponivel: envio de confirmacao nao configurado',
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
      await this.sendConfirmation({ gmailUser, gmailAppPassword, dto });
    } catch (error) {
      this.logger.error(`Falha ao confirmar lead ${lead.id} por email`, error);
      throw new ServiceUnavailableException(
        'Contato registrado, mas a confirmacao por email nao foi enviada',
      );
    }

    return { id: lead.id, message: 'Contato recebido com sucesso' };
  }

  /**
   * Confirmação enviada direto pra quem preencheu o formulário — não pra
   * concessionária. Usa Gmail SMTP (não Resend): sem domínio próprio
   * verificado, o Resend só entrega pro dono da conta, o que inviabilizaria
   * confirmar o recebimento pra clientes de verdade.
   */
  private async sendConfirmation(input: {
    gmailUser: string;
    gmailAppPassword: string;
    dto: CreatePublicLeadDto;
  }): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: input.gmailUser, pass: input.gmailAppPassword },
    });

    await transporter.sendMail({
      from: `Ford One <${input.gmailUser}>`,
      to: input.dto.email,
      subject: 'Recebemos seu contato — Ford One',
      text: [
        `Olá, ${input.dto.nome}!`,
        '',
        `Recebemos sua mensagem sobre o ${input.dto.veiculoInteresse} e nossa equipe entrará em contato em breve.`,
        '',
        `Mensagem enviada: "${input.dto.mensagem}"`,
        '',
        'Ford One',
      ].join('\n'),
      html: this.buildConfirmationHtml(input.dto),
    });
  }

  /** HTML com estilo inline (exigência de clientes de email) e escape manual
   * dos campos preenchidos pelo próprio visitante — eles não passam por
   * nenhum sanitizador antes de chegar aqui. */
  private buildConfirmationHtml(dto: CreatePublicLeadDto): string {
    const nome = this.escapeHtml(dto.nome);
    const veiculo = this.escapeHtml(dto.veiculoInteresse);
    // O front junta a cidade à mensagem com uma quebra de linha (pra ficar
    // registrado no painel da concessionária) — sem isso, HTML colapsa o
    // "\n" e tudo aparece grudado numa linha só na confirmação do cliente.
    const mensagem = this.escapeHtml(dto.mensagem).replace(/\n/g, '<br>');

    return `
<div style="background-color:#f3f4f8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e5ef;">
    <div style="background-color:#00095b;padding:20px 24px;">
      <span style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:0.3px;">Ford One</span>
    </div>
    <div style="padding:28px 24px;color:#0d0f1a;">
      <p style="margin:0 0 16px;font-size:16px;">Olá, <strong>${nome}</strong>!</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333333;">
        Recebemos sua mensagem sobre o <strong>${veiculo}</strong> e nossa equipe entrará em contato em breve.
      </p>
      <div style="background-color:#f3f4f8;border-left:3px solid #1700f4;border-radius:4px;padding:14px 16px;margin:0 0 20px;">
        <p style="margin:0;font-size:13px;color:#4b5268;text-transform:uppercase;letter-spacing:0.3px;">Sua mensagem</p>
        <p style="margin:6px 0 0;font-size:14px;color:#0d0f1a;line-height:1.5;">${mensagem}</p>
      </div>
      <p style="margin:0;font-size:13px;color:#9196ae;">Esta é uma confirmação automática — não é necessário responder este email.</p>
    </div>
    <div style="background-color:#f3f4f8;padding:14px 24px;border-top:1px solid #e2e5ef;">
      <span style="font-size:12px;color:#9196ae;">Ford One</span>
    </div>
  </div>
</div>`.trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
