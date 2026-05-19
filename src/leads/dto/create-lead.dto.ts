import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/^[\p{L}\s.'-]+$/u, { message: 'nome contém caracteres inválidos' })
  nome!: string;

  @IsEmail({}, { message: 'email inválido' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @Matches(/^\d{11}$/, { message: 'cpf deve conter 11 dígitos numéricos' })
  cpf!: string;

  @IsString()
  @Matches(/^\d{10,13}$/, { message: 'telefone deve conter 10-13 dígitos' })
  telefone!: string;

  @IsString()
  @Matches(/^[A-HJ-NPR-Z0-9]{17}$/i, { message: 'vin inválido' })
  vin!: string;

  @IsOptional()
  @IsBoolean()
  consent?: boolean;
}
