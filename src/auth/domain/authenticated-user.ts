import type { Role } from '../../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  nome: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  nome: string;
  iat?: number;
  exp?: number;
}
