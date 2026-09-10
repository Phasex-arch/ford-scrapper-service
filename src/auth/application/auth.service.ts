import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import argon2 from 'argon2';
import { ColaboradorAuthRepository } from '../infrastructure/repositories/colaborador-auth.repository.js';
import { SecurityEventLogger } from '../../common/security/security-event.logger.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { JwtPayload } from '../domain/authenticated-user.js';

interface SecurityContext {
  ip?: string;
  userAgent?: string;
}

/** Parametros de hash usados em todo o modulo — manter iguais ao seed. */
const ARGON2_OPTS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/**
 * Hash fixo de uma senha que nao pertence a ninguem. Serve para gastar, no
 * caminho "email inexistente", o mesmo tempo que o `argon2.verify` do caminho
 * "email existe" — sem isso o login e um oraculo de enumeracao de usuarios:
 * ~1ms para email desconhecido contra dezenas de ms para email conhecido.
 */
const HASH_DUMMY =
  '$argon2id$v=19$m=19456,t=2,p=1$Eu1mQfTc6xxx0eWzO5q7qQ$A/OckNVxYRbmB4VY3GW/o/6AtcDAgg6vrSQxrc2lHiQ';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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

  async register(
    dto: RegisterDto,
    ctx: SecurityContext = {},
  ): Promise<AuthResponseDto> {
    const cpfNormalized = dto.cpf.replace(/\D/g, '');
    if (cpfNormalized.length !== 11) {
      throw new BadRequestException('CPF invalido');
    }

    const existing = await this.colaboradorRepo.findByEmail(
      dto.email.toLowerCase(),
    );
    if (existing) {
      throw new ConflictException('Email ja cadastrado');
    }

    const senhaHash = await argon2.hash(dto.senha, ARGON2_OPTS);

    // A6: email, CPF e registro sao todos `@unique`. A checagem acima cobre o
    // email (e da a mensagem especifica), mas CPF/registro duplicados vinham do
    // Prisma como P2002 cru e viravam 500, apesar do @ApiResponse prometer 409.
    // Tratar o P2002 tambem fecha a janela de corrida entre o SELECT e o INSERT.
    let colaborador: Awaited<ReturnType<ColaboradorAuthRepository['create']>>;
    try {
      colaborador = await this.colaboradorRepo.create({
        nome: dto.nome.trim(),
        cpf: cpfNormalized,
        telefone: dto.telefone.trim(),
        email: dto.email.toLowerCase(),
        endereco: dto.endereco.trim(),
        registro: dto.registro.trim(),
        cargo: dto.cargo.trim(),
        role: dto.role,
        senhaHash,
      });
    } catch (err) {
      throw this.traduzirConflito(err);
    }

    this.logger.log(
      JSON.stringify({
        event: 'colaborador_registered',
        userId: colaborador.id,
        email: colaborador.email,
        role: colaborador.role,
        ip: ctx.ip,
      }),
    );

    return this.buildAuthResponse(colaborador);
  }

  async login(
    dto: LoginDto,
    ctx: SecurityContext = {},
  ): Promise<AuthResponseDto> {
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
      // Gasta o mesmo tempo do caminho "email existe" antes de responder.
      await argon2.verify(HASH_DUMMY, dto.senha).catch(() => false);
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

  /** Mapeia a violacao de unicidade do Prisma (P2002) para 409. */
  private traduzirConflito(err: unknown): unknown {
    const { code, meta } = (err ?? {}) as {
      code?: string;
      meta?: { target?: string[] | string };
    };
    if (code !== 'P2002') return err;

    const alvo = Array.isArray(meta?.target)
      ? meta.target.join(', ')
      : (meta?.target ?? 'campo unico');
    const rotulo =
      { email: 'Email', cpf: 'CPF', registro: 'Registro' }[alvo] ?? alvo;
    return new ConflictException(`${rotulo} ja cadastrado`);
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
