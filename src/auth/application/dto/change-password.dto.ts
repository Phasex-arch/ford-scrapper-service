import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Senha atual, pra confirmar identidade' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senhaAtual!: string;

  @ApiProperty({ description: 'Nova senha' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  novaSenha!: string;
}
