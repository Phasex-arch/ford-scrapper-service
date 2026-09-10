import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './application/auth.service.js';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy.js';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard.js';
import { RolesGuard } from './infrastructure/guards/roles.guard.js';
import { ColaboradorAuthRepository } from './infrastructure/repositories/colaborador-auth.repository.js';
import { ProductionDocsBlocker } from './infrastructure/production-docs.blocker.js';
import { assertJwtSecret } from './infrastructure/jwt-secret.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = assertJwtSecret(config.get<string>('JWT_SECRET'));
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
    ProductionDocsBlocker,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtStrategy, JwtModule],
})
export class AuthModule {}
