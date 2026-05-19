import { Injectable } from '@nestjs/common';
import { Vehicle } from '../../domain/vehicle.js';
import { VehicleRepository } from '../../infrastructure/repositories/vehicle.repository.js';
import type { CreateVehicleDto } from '../dto/create-vehicle.dto.js';
import type { VehicleFilterDto } from '../dto/vehicle-filter.dto.js';

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

  async findWithFilters(filters: VehicleFilterDto): Promise<Vehicle[]> {
    return this.vehicleRepository.findWithFilters(filters);
  }

  async countWithFilters(filters: VehicleFilterDto): Promise<number> {
    return this.vehicleRepository.countWithFilters(filters);
  }

  async findDistinctCategories(): Promise<
    { categoria_principal: string; count: number }[]
  > {
    return this.vehicleRepository.findDistinctCategories();
  }

  async findDistinctModels(): Promise<
    { modelo: string; familia: string; count: number }[]
  > {
    return this.vehicleRepository.findDistinctModels();
  }

  async findDistinctVersions(): Promise<
    { versao: string; modelo: string; count: number }[]
  > {
    return this.vehicleRepository.findDistinctVersions();
  }

  async findDistinctColors(): Promise<{ nome: string; count: number }[]> {
    return this.vehicleRepository.findDistinctColors();
  }

  async search(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<Vehicle[]> {
    return this.vehicleRepository.search(query, page, limit);
  }

  async searchCount(query: string): Promise<number> {
    return this.vehicleRepository.searchCount(query);
  }

  async getStats(): Promise<Record<string, unknown>> {
    return this.vehicleRepository.getStats();
  }

  async getAllSources(): Promise<
    {
      modelo_url: string;
      versao_url: string | null;
      ficha_tecnica_url: string | null;
      cores_url: string;
    }[]
  > {
    return this.vehicleRepository.getAllSources();
  }

  async deleteAll(): Promise<number> {
    return this.vehicleRepository.deleteAll();
  }
}
