import type { Vehicle } from './vehicle.js';
export interface IPortVehicle {
  getVehicleBySlug(slug: string): Promise<Vehicle | null>;
}
