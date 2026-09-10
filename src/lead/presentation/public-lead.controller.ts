import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../auth/infrastructure/decorators/public.decorator.js';
import { PublicLeadService } from '../application/public-lead.service.js';
import { CreatePublicLeadDto } from '../application/dto/create-public-lead.dto.js';

@ApiTags('Contato público')
@Controller('public/leads')
export class PublicLeadController {
  constructor(private readonly service: PublicLeadService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Enviar contato público',
    description:
      'Cria um lead e envia uma notificação por email. Limitado a 3 requisições por minuto por origem.',
  })
  @ApiResponse({ status: 201, description: 'Contato registrado e notificado' })
  @ApiResponse({ status: 400, description: 'Payload inválido' })
  @ApiResponse({ status: 429, description: 'Limite de requisições excedido' })
  @ApiResponse({ status: 500, description: 'Falha ao persistir o lead' })
  @ApiResponse({ status: 503, description: 'Email indisponível' })
  create(@Body() dto: CreatePublicLeadDto) {
    return this.service.create(dto);
  }
}
