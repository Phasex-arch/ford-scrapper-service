import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import argon2 from 'argon2';
import { AuthService } from '../application/auth.service.js';
import { AuthResponseDto } from '../application/dto/auth-response.dto.js';
import { LoginDto } from '../application/dto/login.dto.js';
import { UpdateProfileDto } from '../application/dto/update-profile.dto.js';
import { ChangePasswordDto } from '../application/dto/change-password.dto.js';
import { Public } from '../infrastructure/decorators/public.decorator.js';
import { CurrentUser } from '../infrastructure/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../domain/authenticated-user.js';
import { ColaboradorService } from '../../colaborador/application/colaborador.service.js';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly colaboradorService: ColaboradorService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autenticar colaborador e obter token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.login(dto, {
      ip: this.extractIp(req),
      userAgent: req.headers['user-agent']?.toString(),
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário autenticado' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    const c = await this.colaboradorService.findById(user.id);
    return {
      id: c.id,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone,
      cargo: c.cargo,
      role: c.role,
    };
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar o próprio perfil (nome, telefone, email, cargo)' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Perfil atualizado' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const c = await this.colaboradorService.update(userId, dto);
    return {
      id: c.id,
      nome: c.nome,
      email: c.email,
      telefone: c.telefone,
      cargo: c.cargo,
      role: c.role,
    };
  }

  @Patch('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trocar a própria senha' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Senha alterada' })
  @ApiResponse({ status: 401, description: 'Senha atual incorreta' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    const c = await this.colaboradorService.findById(userId);
    const valid = await argon2.verify(c.senha, dto.senhaAtual);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    await this.colaboradorService.update(userId, { senha: dto.novaSenha });
    return { ok: true };
  }

  private extractIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress;
  }
}
