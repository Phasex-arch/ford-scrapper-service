import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ColaboradorAuthRepository } from '../repositories/colaborador-auth.repository.js';
import { assertJwtSecret } from '../jwt-secret.js';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../domain/authenticated-user.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly colaboradorRepo: ColaboradorAuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: assertJwtSecret(config.get<string>('JWT_SECRET')),
    });
  }

  /**
   * P1-1: o JWT e apenas uma alegacao de identidade, nao de permissao. Montar o
   * usuario a partir do payload deixava um colaborador desativado (ou rebaixado)
   * com acesso total ate o token expirar — 8h por padrao.
   *
   * Custo: um `findUnique` por requisicao autenticada, por chave primaria e com
   * `select` enxuto (sem o hash da senha). E o preco de nao ter revogacao; uma
   * denylist em cache/Redis so se valeria a pena se o profiling apontar esse
   * SELECT, e a consistencia seria pior.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('Token invalido');
    }

    const colaborador = await this.colaboradorRepo.findById(payload.sub);
    if (!colaborador || !colaborador.ativo) {
      throw new UnauthorizedException('Token invalido');
    }

    // Papel vem do banco, nunca do token: rebaixamento vale na proxima request.
    return {
      id: colaborador.id,
      email: colaborador.email,
      role: colaborador.role,
      nome: colaborador.nome,
    };
  }
}
