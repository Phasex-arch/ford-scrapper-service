import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ColaboradorAuthRepository } from '../repositories/colaborador-auth.repository.js';
import type { AuthenticatedUser, JwtPayload } from '../../domain/authenticated-user.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly colaboradorRepo: ColaboradorAuthRepository,
  ) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET nao definido no ambiente');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Verifica o colaborador no banco a cada request (não confia só na
   * assinatura do JWT) — sem isso, desativar um colaborador não tinha
   * nenhum efeito prático até o token expirar sozinho (até 8h depois).
   * Também pega mudança de role em tempo real (ex.: rebaixamento de ADMIN).
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Token invalido');
    }
    const colaborador = await this.colaboradorRepo.findById(payload.sub);
    if (!colaborador || !colaborador.ativo) {
      throw new UnauthorizedException('Colaborador inativo ou removido');
    }
    return {
      id: colaborador.id,
      email: colaborador.email,
      role: colaborador.role,
      nome: colaborador.nome,
    };
  }
}
