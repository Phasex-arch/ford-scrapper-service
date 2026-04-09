import type { Vehicle } from "src/vehicle/domain/vehicle.js";
import type { IPortVehicle } from "src/vehicle/domain/IPortVehicle.js";
import { VehicleRepository } from "../../infrastructure/repositories/vehicle.repository.js";
import { PrismaService } from "prisma/prisma.service.js";

export class IAdapterVehicle implements IPortVehicle {
    private readonly vehicleRepository: VehicleRepository;
    constructor() {
        this.vehicleRepository = new VehicleRepository(new PrismaService());
    }

    async getVehicleBySlug(slug: string): Promise<Vehicle | null>{
        return await this.vehicleRepository.findBySlug(slug);
    }
}