import { Module } from '@nestjs/common';
import { LeadService } from './application/lead.service.js';
import { LeadRepository } from './infrastructure/lead.repository.js';
import { LeadController } from './presentation/lead.controller.js';

@Module({
  controllers: [LeadController],
  providers: [LeadService, LeadRepository],
  exports: [LeadService, LeadRepository],
})
export class LeadModule {}
