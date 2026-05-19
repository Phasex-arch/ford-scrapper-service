import type { Vehicle } from 'src/vehicle/domain/vehicle.js';
import type { CreateVehicleDto } from '../dto/create-vehicle.dto.js';
import type { VehicleFilterDto } from '../dto/vehicle-filter.dto.js';

export interface IPortDBDataVehicle {
  save(dto: CreateVehicleDto): Promise<Vehicle>;
  findBySlug(slug: string): Promise<Vehicle | null>;
  findAll(): Promise<Vehicle[]>;
  findById(id: string): Promise<Vehicle | null>;
  delete(id: string): Promise<void>;
  findWithFilters(filters: VehicleFilterDto): Promise<Vehicle[]>;
  countWithFilters(filters: VehicleFilterDto): Promise<number>;
  findDistinctCategories(): Promise<
    { categoria_principal: string; count: number }[]
  >;
  findDistinctModels(): Promise<
    { modelo: string; familia: string; count: number }[]
  >;
  findDistinctVersions(): Promise<
    { versao: string; modelo: string; count: number }[]
  >;
  findDistinctColors(): Promise<{ nome: string; count: number }[]>;
  search(query: string, page: number, limit: number): Promise<Vehicle[]>;
  searchCount(query: string): Promise<number>;
  getStats(): Promise<Record<string, unknown>>;
  getAllSources(): Promise<
    {
      modelo_url: string;
      versao_url: string | null;
      ficha_tecnica_url: string | null;
      cores_url: string;
    }[]
  >;
  deleteAll(): Promise<number>;
}
