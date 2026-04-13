import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ScrapperService } from '../scrapper/application/scrapper.js';
import { VehicleService } from '../vehicle/application/vehicle/vehicle.service.js';
import { mapVehicleInfoToDto } from '../vehicle/application/mappers/vehicle-info.mapper.js';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scrapperService: ScrapperService,
    private readonly vehicleService: VehicleService,
  ) { }

  async executeSyncRun() {
    const syncRun = await this.prisma.syncRun.create({
      data: {
        status: 'running',
      },
    });

    const startTime = Date.now();
    const errors: string[] = [];
    let vehiclesFound = 0;
    let vehiclesSaved = 0;

    try {
      this.logger.log(`Sync run ${syncRun.id} started`);

      const result = await this.scrapperService.scrapeAll();
      vehiclesFound = result.vehicles.length;
      this.logger.log(`Scraping completed — ${vehiclesFound} vehicle(s) found`);

      for (const vehicleInfo of result.vehicles) {
        try {
          const dto = mapVehicleInfoToDto(vehicleInfo);
          await this.vehicleService.save(dto);
          vehiclesSaved++;
        } catch (err) {
          const errorMsg = `Failed to save vehicle ${vehicleInfo.slug}: ${(err as Error).message}`;
          this.logger.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const durationMs = Date.now() - startTime;
      const updatedRun = await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: errors.length > 0 ? 'completed_with_errors' : 'completed',
          vehiclesFound,
          vehiclesSaved,
          errors,
          completedAt: new Date(),
          durationMs,
        },
      });

      this.logger.log(
        `Sync run ${syncRun.id} completed in ${durationMs}ms — saved: ${vehiclesSaved}/${vehiclesFound}`,
      );

      return {
        sync_run_id: updatedRun.id,
        status: updatedRun.status,
        vehicles_found: vehiclesFound,
        vehicles_saved: vehiclesSaved,
        errors_count: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: durationMs,
        started_at: updatedRun.startedAt.toISOString(),
        completed_at: updatedRun.completedAt?.toISOString(),
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errorMsg = (err as Error).message;
      errors.push(errorMsg);

      await this.prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: 'failed',
          vehiclesFound,
          vehiclesSaved,
          errors,
          completedAt: new Date(),
          durationMs,
        },
      });

      this.logger.error(`Sync run ${syncRun.id} failed: ${errorMsg}`);

      return {
        sync_run_id: syncRun.id,
        status: 'failed',
        vehicles_found: vehiclesFound,
        vehicles_saved: vehiclesSaved,
        errors_count: errors.length,
        errors,
        duration_ms: durationMs,
        started_at: syncRun.startedAt.toISOString(),
        completed_at: new Date().toISOString(),
      };
    }
  }

  async getSyncHistory(limit: number = 10) {
    const runs = await this.prisma.syncRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    return runs.map((run) => ({
      id: run.id,
      status: run.status,
      vehicles_found: run.vehiclesFound,
      vehicles_saved: run.vehiclesSaved,
      errors_count: run.errors.length,
      duration_ms: run.durationMs,
      started_at: run.startedAt.toISOString(),
      completed_at: run.completedAt?.toISOString() ?? null,
    }));
  }
}
