import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional()
  userEmail?: string | null;

  @ApiProperty()
  action!: string;

  @ApiProperty()
  resource!: string;

  @ApiPropertyOptional()
  resourceId?: string | null;

  @ApiPropertyOptional()
  statusCode?: number | null;

  @ApiProperty()
  timestamp!: Date;
}

interface AuditLogEntity {
  id: string;
  userEmail: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  statusCode: number | null;
  timestamp: Date;
}

export function toAuditLogResponse(a: AuditLogEntity): AuditLogResponseDto {
  return {
    id: a.id,
    userEmail: a.userEmail,
    action: a.action,
    resource: a.resource,
    resourceId: a.resourceId,
    statusCode: a.statusCode,
    timestamp: a.timestamp,
  };
}
