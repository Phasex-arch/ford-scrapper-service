import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReservarEstoqueDto {
  @ApiProperty({ description: 'UUID do cliente que está reservando a unidade' })
  @IsUUID()
  clienteId!: string;
}
