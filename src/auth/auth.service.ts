import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '../common/enums/role.enum.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { AuditService } from '../audit/audit.service.js';

const ARGON2_OPTS: argon2.Options = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 1 << 16,
  parallelism: 1,
};

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.accessSecret = config.get<string>('JWT_SECRET') ?? '';
    this.refreshSecret = config.get<string>('JWT_REFRESH_SECRET') ?? '';
    this.accessTtl = config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    this.refreshTtl = config.get<string>('JWT_REFRESH_TTL') ?? '7d';

    if (this.accessSecret.length < 32 || this.refreshSecret.length < 32) {
      throw new Error(
        'JWT_SECRET and JWT_REFRESH_SECRET must be at least 32 chars. ' +
          'Generate with: openssl rand -base64 48',
      );
    }
  }

  async register(
    dto: RegisterDto,
    actorRole: Role | null,
  ): Promise<{ id: string; email: string; role: Role }> {
    const requestedRole = dto.role ?? Role.USER;
    if (requestedRole !== Role.USER && actorRole !== Role.ADMIN) {
      throw new UnauthorizedException(
        'Only administrators may register elevated roles',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('email já cadastrado');
    }

    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: requestedRole,
      },
    });
    this.logger.log(`User registered email=${user.email} role=${user.role}`);
    return { id: user.id, email: user.email, role: user.role as Role };
  }

  async login(
    dto: LoginDto,
    ip: string | null,
    userAgent: string | null,
  ): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    // Always compare against a dummy hash if user missing to defeat timing oracles.
    const verifyTarget =
      user?.passwordHash ??
      '$argon2id$v=19$m=65536,t=3,p=1$ZHVtbXlzYWx0$bm90LXJlYWwtaGFzaC1mb3ItdGltaW5n';
    let ok = false;
    try {
      ok = await argon2.verify(verifyTarget, dto.password);
    } catch {
      ok = false;
    }

    if (!user || !ok) {
      await this.audit.record({
        userId: user?.id ?? null,
        action: 'AUTH_LOGIN_FAILED',
        resource: '/api/v1/auth/login',
        ip,
        userAgent,
        metadata: { email: dto.email.toLowerCase() },
      });
      await this.audit.detectBruteForce(ip, dto.email.toLowerCase());
      throw new UnauthorizedException('credenciais inválidas');
    }

    return this.issueTokens(user.id, user.email, user.role as Role);
  }

  async refresh(refreshToken: string): Promise<IssuedTokens> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.refreshSecret,
        algorithms: ['HS256'],
      });
    } catch {
      throw new UnauthorizedException('refresh token inválido ou expirado');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshHash) {
      throw new UnauthorizedException('refresh token revogado');
    }

    const ok = await argon2.verify(user.refreshHash, refreshToken);
    if (!ok) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshHash: null },
      });
      throw new UnauthorizedException(
        'refresh token reuse detectado — sessões revogadas',
      );
    }

    return this.issueTokens(user.id, user.email, user.role as Role);
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshHash: null },
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<IssuedTokens> {
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, role, jti: accessJti },
      {
        secret: this.accessSecret,
        expiresIn: this.accessTtl as unknown as number,
        algorithm: 'HS256',
      },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti: refreshJti },
      {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl as unknown as number,
        algorithm: 'HS256',
      },
    );

    const refreshHash = await argon2.hash(refreshToken, ARGON2_OPTS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshHash },
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: this.ttlToSeconds(this.accessTtl),
      refreshExpiresIn: this.ttlToSeconds(this.refreshTtl),
    };
  }

  private ttlToSeconds(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) throw new BadRequestException('invalid TTL format');
    const value = Number(match[1]);
    switch (match[2]) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }
}
