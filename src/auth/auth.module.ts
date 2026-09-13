import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './application/auth.service.js';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy.js';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard.js';
import { RolesGuard } from './infrastructure/guards/roles.guard.js';
import { ColaboradorAuthRepository } from './infrastructure/repositories/colaborador-auth.repository.js';
import { AuthController } from './presentation/auth.controller.js';
import { ColaboradorModule } from '../colaborador/colaborador.module.js';

@Module({
  imports: [
    ColaboradorModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET nao definido no ambiente');
        }
        const expiresIn = config.get<string>('JWT_EXPIRES_IN') ?? '8h';
        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as unknown as number,
            algorithm: 'HS256',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    ColaboradorAuthRepository,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtStrategy, JwtModule],
})
export class AuthModule {}
