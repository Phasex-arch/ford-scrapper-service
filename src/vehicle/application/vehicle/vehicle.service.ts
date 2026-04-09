import { Injectable } from '@nestjs/common';
import { Vehicle } from '../../domain/vehicle.js';
import { VehicleRepository } from '../../infrastructure/repositories/vehicle.repository.js';
import type { CreateVehicleDto } from '../dto/create-vehicle.dto.js';

@Injectable()
export class VehicleService {
    constructor(private readonly vehicleRepository: VehicleRepository) {}

    async save(dto: CreateVehicleDto): Promise<Vehicle> {
        return this.vehicleRepository.save(dto);
    }

    async findBySlug(slug: string): Promise<Vehicle | null> {
        return this.vehicleRepository.findBySlug(slug);
    }

    async findAll(): Promise<Vehicle[]> {
        return this.vehicleRepository.findAll();
    }

    async findById(id: string): Promise<Vehicle | null> {
        return this.vehicleRepository.findById(id);
    }

    async delete(id: string): Promise<void> {
        return this.vehicleRepository.delete(id);
    }
}
