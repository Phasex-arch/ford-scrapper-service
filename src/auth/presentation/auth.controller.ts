import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
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
import { AuthService } from '../application/auth.service.js';
import { AuthResponseDto } from '../application/dto/auth-response.dto.js';
import { LoginDto } from '../application/dto/login.dto.js';
import { RegisterDto } from '../application/dto/register.dto.js';
import { Public } from '../infrastructure/decorators/public.decorator.js';
import { CurrentUser } from '../infrastructure/decorators/current-user.decorator.js';
import { Roles } from '../infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../infrastructure/guards/roles.guard.js';
import { Role } from '../../../generated/prisma/enums.js';
import type { AuthenticatedUser } from '../domain/authenticated-user.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Autenticar colaborador e obter token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Credenciais invalidas' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponseDto> {
    return this.authService.login(dto, {
      ip: this.extractIp(req),
      userAgent: req.headers['user-agent']?.toString(),
    });
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @Post('register')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Registrar novo colaborador (somente ADMIN)',
    description:
      'Cria um colaborador autenticavel. Apenas administradores podem registrar novos usuarios.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 403, description: 'Apenas administradores' })
  @ApiResponse({ status: 409, description: 'Email ja cadastrado' })
  register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto, {
      ip: this.extractIp(req),
      userAgent: req.headers['user-agent']?.toString(),
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuario autenticado' })
  @ApiResponse({ status: 200 })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private extractIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? req.socket.remoteAddress;
  }
}
