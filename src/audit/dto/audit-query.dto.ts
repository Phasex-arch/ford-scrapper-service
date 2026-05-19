import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class AuditQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z_]{1,40}$/, {
    message: 'action deve conter apenas letras maiúsculas e underscore',
  })
  action?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
