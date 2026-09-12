import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { ColaboradorAuthRepository } from '../infrastructure/repositories/colaborador-auth.repository.js';
import { SecurityEventLogger } from '../../common/security/security-event.logger.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from '../domain/authenticated-user.js';

interface SecurityContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly expiresInSeconds: number;

  constructor(
    private readonly colaboradorRepo: ColaboradorAuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly securityLogger: SecurityEventLogger,
  ) {
    const raw = this.config.get<string>('JWT_EXPIRES_IN') ?? '8h';
    this.expiresInSeconds = this.parseExpiresIn(raw);
  }

  async login(dto: LoginDto, ctx: SecurityContext = {}): Promise<AuthResponseDto> {
    const email = dto.email.toLowerCase();
    const colaborador = await this.colaboradorRepo.findByEmail(email);

    if (!colaborador || !colaborador.ativo) {
      await this.securityLogger.log({
        type: 'login_failed',
        userEmail: email,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        details: { reason: 'usuario_inexistente_ou_inativo' },
      });
      throw new UnauthorizedException('Credenciais invalidas');
    }

    const ok = await argon2.verify(colaborador.senha, dto.senha);
    if (!ok) {
      await this.securityLogger.log({
        type: 'login_failed',
        userEmail: email,
        userId: colaborador.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        details: { reason: 'senha_invalida' },
      });
      throw new UnauthorizedException('Credenciais invalidas');
    }

    await this.securityLogger.log({
      type: 'login_success',
      userEmail: email,
      userId: colaborador.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return this.buildAuthResponse(colaborador);
  }

  private buildAuthResponse(colaborador: {
    id: string;
    email: string;
    nome: string;
    role: JwtPayload['role'];
  }): AuthResponseDto {
    const payload: JwtPayload = {
      sub: colaborador.id,
      email: colaborador.email,
      role: colaborador.role,
      nome: colaborador.nome,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresInSeconds,
      user: {
        id: colaborador.id,
        nome: colaborador.nome,
        email: colaborador.email,
        role: colaborador.role,
      },
    };
  }

  private parseExpiresIn(raw: string): number {
    const match = /^(\d+)([smhd])?$/.exec(raw);
    if (!match) return 28_800;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86_400;
      default:
        return value;
    }
  }
}
