import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../../generated/prisma/enums.js';

export class ColaboradorResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nome!: string;

  @ApiProperty({ description: 'CPF mascarado (***.***.***-##)' })
  cpf!: string;

  @ApiProperty()
  telefone!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  endereco!: string;

  @ApiProperty()
  registro!: string;

  @ApiProperty()
  cargo!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty()
  ativo!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

interface ColaboradorEntity {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  registro: string;
  cargo: string;
  role: Role;
  ativo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toColaboradorResponse(
  c: ColaboradorEntity,
): ColaboradorResponseDto {
  return {
    id: c.id,
    nome: c.nome,
    cpf: maskCpf(c.cpf),
    telefone: c.telefone,
    email: c.email,
    endereco: c.endereco,
    registro: c.registro,
    cargo: c.cargo,
    role: c.role,
    ativo: c.ativo,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function maskCpf(cpf: string): string {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
