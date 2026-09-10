import { Test, TestingModule } from '@nestjs/testing';
import { VehicleService } from './vehicle.service.js';
import { VehicleRepository } from '../../infrastructure/repositories/vehicle.repository.js';
import { PrismaService } from '../../../../prisma/prisma.service.js';

describe('VehicleService', () => {
  let service: VehicleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        VehicleRepository,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
