import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class ExchangeCodeDto {
  @ApiProperty({ description: 'Código de uso único retornado por POST /auth/exchange-code' })
  @IsString()
  @IsUUID()
  code!: string;
}
