import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum.js';

export class RegisterDto {
  @IsEmail({}, { message: 'email inválido' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(12, { message: 'senha deve ter ao menos 12 caracteres' })
  @MaxLength(128)
  @Matches(/[A-Z]/, {
    message: 'senha deve conter ao menos uma letra maiúscula',
  })
  @Matches(/[a-z]/, {
    message: 'senha deve conter ao menos uma letra minúscula',
  })
  @Matches(/[0-9]/, { message: 'senha deve conter ao menos um número' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'senha deve conter ao menos um caractere especial',
  })
  password!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
