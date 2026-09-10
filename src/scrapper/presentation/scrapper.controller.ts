import {
  ConflictException,
  Controller,
  Get,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums.js';
import { Roles } from '../../auth/infrastructure/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard.js';
import { ScrapperService } from '../application/scrapper.js';
import type { FordCatalogResponse } from '../domain/scrapped-info.js';
import { VehicleService } from '../../vehicle/application/vehicle/vehicle.service.js';
import { mapVehicleInfoToDto } from '../../vehicle/application/mappers/vehicle-info.mapper.js';

/**
 * Endpoints administrativos do scraper.
 *
 * P0-1: cada chamada roda um crawl completo do ford.com.br, baixa N PDFs e
 * gasta N chamadas pagas do Gemini. Sem `RolesGuard` qualquer papel autenticado
 * disparava isso, burlando o `@Roles(ADMIN)` do `POST /sync` equivalente — por
 * isso ADMIN apenas, com trava de execucao concorrente (o throttle global de
 * 60/min/IP deixaria 60 crawls empilhados).
 */
@ApiTags('Scrapper')
@ApiBearerAuth('JWT')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
@Controller('scrapper')
export class ScrapperController {
  private readonly logger = new Logger(ScrapperController.name);
  /** ponytail: trava em memoria; virar lock no banco se houver mais de uma instancia. */
  private static emExecucao = false;

  constructor(
    private readonly scrapperService: ScrapperService,
    private readonly vehicleService: VehicleService,
  ) {}

  @Get('ford')
  @ApiOperation({
    summary: 'Dispara o scraping da Ford e devolve o catálogo coletado (ADMIN)',
  })
  @ApiResponse({ status: 403, description: 'Papel sem permissão' })
  @ApiResponse({ status: 409, description: 'Já existe uma coleta em andamento' })
  async scrapeFord(): Promise<FordCatalogResponse> {
    this.logger.log('Ford scraping triggered via GET /scrapper/ford');
    const start = Date.now();
    const result = await this.comTrava(() => this.scrapperService.scrapeAll());
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    this.logger.log(
      `Scraping completed in ${elapsed}s — ${result.vehicles.length} vehicle(s) collected`,
    );
    return result;
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Sincroniza o resultado do scraper diretamente no banco (ADMIN)',
  })
  @ApiResponse({ status: 403, description: 'Papel sem permissão' })
  @ApiResponse({ status: 409, description: 'Já existe uma coleta em andamento' })
  async syncDataFromScrapper(): Promise<void> {
    this.logger.log('Syncing data from scrapper');
    const result = await this.comTrava(() => this.scrapperService.scrapeAll());
    for (const vehicleInfo of result.vehicles) {
      // Um veiculo reprovado na validacao nao derruba a coleta inteira.
      try {
        await this.vehicleService.save(mapVehicleInfoToDto(vehicleInfo));
      } catch (error) {
        this.logger.warn(
          `Veiculo ${vehicleInfo.slug} descartado: ${(error as Error).message}`,
        );
      }
    }
  }

  /** Uma coleta por vez: chamadas concorrentes recebem 409 em vez de empilhar. */
  private async comTrava<T>(acao: () => Promise<T>): Promise<T> {
    if (ScrapperController.emExecucao) {
      throw new ConflictException('Uma coleta já está em andamento');
    }
    ScrapperController.emExecucao = true;
    try {
      return await acao();
    } finally {
      ScrapperController.emExecucao = false;
    }
  }
}
