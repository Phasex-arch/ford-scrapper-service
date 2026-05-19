import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '../enums/role.enum.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  jti?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    return request.user;
  },
);
