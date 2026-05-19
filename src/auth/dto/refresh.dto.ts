import { IsString, Matches } from 'class-validator';

export class RefreshDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_\-.]{20,2048}$/, { message: 'refreshToken inválido' })
  refreshToken!: string;
}
