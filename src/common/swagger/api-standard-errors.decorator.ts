import { applyDecorators } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/**
 * Formato padronizado de TODA resposta de erro da API — é exatamente o
 * payload montado por HttpExceptionFilter (src/common/filters).
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 401, description: 'Status HTTP' })
  statusCode!: number;

  @ApiProperty({
    example: 'Nao autenticado',
    description: 'Mensagem, ou lista de mensagens quando é erro de validação (400)',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  message!: string | string[];

  @ApiProperty({ example: 'UnauthorizedException', description: 'Nome da exceção' })
  error!: string;

  @ApiProperty({ example: '/api/clientes', description: 'URL requisitada' })
  path!: string;

  @ApiProperty({ example: '2026-09-25T13:00:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({ description: 'Eco do header X-Request-Id, quando enviado' })
  requestId?: string;
}

/**
 * Documenta no Swagger os erros comuns a todo endpoint protegido (401 sem/
 * com token inválido, 403 sem permissão do perfil, 404 recurso inexistente)
 * — usado no nível da classe do controller, vale pra todas as rotas dele.
 */
export const ApiStandardErrors = () =>
  applyDecorators(
    ApiUnauthorizedResponse({ description: 'Token ausente, inválido ou expirado', type: ErrorResponseDto }),
    ApiForbiddenResponse({ description: 'Perfil sem permissão para este recurso', type: ErrorResponseDto }),
    ApiNotFoundResponse({ description: 'Recurso não encontrado', type: ErrorResponseDto }),
  );
