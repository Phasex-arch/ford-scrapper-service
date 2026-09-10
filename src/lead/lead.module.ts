import { Module } from '@nestjs/common';
import { LeadService } from './application/lead.service.js';
import { LeadRepository } from './infrastructure/lead.repository.js';
import { LeadController } from './presentation/lead.controller.js';
import { PublicLeadController } from './presentation/public-lead.controller.js';
import { PublicLeadService } from './application/public-lead.service.js';

@Module({
  controllers: [LeadController, PublicLeadController],
  providers: [LeadService, PublicLeadService, LeadRepository],
  exports: [LeadService, LeadRepository],
})
export class LeadModule {}
