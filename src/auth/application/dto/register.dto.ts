import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../../generated/prisma/enums.js';

export class RegisterDto {
  @ApiProperty({ example: 'Ricardo Costa' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  nome!: string;

  @ApiProperty({ example: '123.456.789-09' })
  @IsString()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, {
    message: 'CPF deve estar em formato valido (xxx.xxx.xxx-xx)',
  })
  cpf!: string;

  @ApiProperty({ example: '(11) 98765-4321' })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  telefone!: string;

  @ApiProperty({ example: 'ricardo@ford.com.br' })
  @IsEmail()
  @MaxLength(120)
  email!: string;

  @ApiProperty({ example: 'Rua Henry Ford, 100 - Sao Paulo/SP' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  endereco!: string;

  @ApiProperty({ example: 'FRD-00045' })
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  registro!: string;

  @ApiProperty({ example: 'Gerente Comercial' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  cargo!: string;

  @ApiPropertyOptional({ enum: Role, example: Role.FUNCIONARIO })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ example: 'SenhaForte123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  senha!: string;
}
