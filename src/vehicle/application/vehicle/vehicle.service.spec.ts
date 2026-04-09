import { Test, TestingModule } from '@nestjs/testing';
import { VehicleService } from './vehicle.service.js';
import { VehicleRepository } from 'src/vehicle/infrastructure/repositories/vehicle.repository.js';

describe('VehicleService', () => {
  let service: VehicleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VehicleService, VehicleRepository],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
