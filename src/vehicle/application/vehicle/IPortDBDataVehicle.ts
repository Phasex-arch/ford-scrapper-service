import type { Vehicle } from "src/vehicle/domain/vehicle.js";
import type { CreateVehicleDto } from "../dto/create-vehicle.dto.js";

export interface IPortDBDataVehicle {
    save(dto: CreateVehicleDto): Promise<Vehicle>;
    findBySlug(slug: string): Promise<Vehicle | null>;
    findAll(): Promise<Vehicle[]>;
    findById(id: string): Promise<Vehicle | null>;
    delete(id: string): Promise<void>;
}