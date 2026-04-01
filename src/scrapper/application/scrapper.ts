import { Injectable, Logger } from '@nestjs/common';
import { FordCrawlerService } from '../infrastructure/ford-crawler.service.js';
import { PdfDownloaderService } from '../infrastructure/pdf-downloader.service.js';
import { GeminiReaderService } from '../infrastructure/gemini-reader.service.js';
import type {
  FordCatalogResponse,
  VehicleInfo,
  CatalogEntry,
  ModelPageData,
} from '../domain/scrapped-info.js';

const CONCURRENCY = 3;
const HTML_WARNING =
  'Nenhum arquivo ficha-tecnica.pdf encontrado na página do modelo. Dados extraídos via HTML da página de versão — recomenda-se conferência manual.';

@Injectable()
export class ScrapperService {
  private readonly logger = new Logger(ScrapperService.name);

  constructor(
    private readonly crawler: FordCrawlerService,
    private readonly pdfDownloader: PdfDownloaderService,
    private readonly geminiReader: GeminiReaderService,
  ) {}

  async scrapeAll(): Promise<FordCatalogResponse> {
    this.logger.log('Starting full Ford Brasil scrape...');

    const catalogEntries = await this.crawler.crawlCatalog();

    const modelGroups = this.groupByModel(catalogEntries);
    this.logger.log(`Found ${modelGroups.size} unique model(s) to process`);

    const allVehicles: VehicleInfo[] = [];
    const modelKeys = [...modelGroups.keys()];

    for (let i = 0; i < modelKeys.length; i += CONCURRENCY) {
      const batch = modelKeys.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map((key) => this.processModel(key, modelGroups.get(key)!)),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allVehicles.push(...result.value);
        } else {
          this.logger.error('Model processing failed', result.reason);
        }
      }
    }

    return {
      brand: 'Ford',
      market: 'Brasil',
      collected_at: new Date().toISOString(),
      source: 'https://www.ford.com.br/',
      vehicles: allVehicles,
    };
  }

  private groupByModel(entries: CatalogEntry[]): Map<string, CatalogEntry[]> {
    const groups = new Map<string, CatalogEntry[]>();
    for (const entry of entries) {
      const key = entry.modelPageUrl;
      const list = groups.get(key) ?? [];
      list.push(entry);
      groups.set(key, list);
    }
    return groups;
  }

  private async processModel(
    modelPageUrl: string,
    entries: CatalogEntry[],
  ): Promise<VehicleInfo[]> {
    const primary = entries[0];
    this.logger.log(`Processing model: ${primary.name} (${modelPageUrl})`);

    let modelData: ModelPageData;
    try {
      modelData = await this.crawler.crawlModelPage(modelPageUrl);
    } catch (err) {
      this.logger.error(`Failed to crawl model page: ${modelPageUrl}`, (err as Error).message);
      modelData = { fichaTecnicaPdfUrl: null, versionUrls: [], colors: [], imageUrls: [] };
    }

    if (modelData.fichaTecnicaPdfUrl) {
      return this.processWithPdf(primary, modelData, modelPageUrl);
    }

    return this.processWithHtml(entries, modelData, modelPageUrl);
  }

  private async processWithPdf(
    entry: CatalogEntry,
    modelData: ModelPageData,
    modelPageUrl: string,
  ): Promise<VehicleInfo[]> {
    const base64 = await this.pdfDownloader.downloadAsBase64(modelData.fichaTecnicaPdfUrl!);
    if (!base64) {
      this.logger.warn(`PDF download failed, falling back to HTML for ${entry.name}`);
      return this.processWithHtml([entry], modelData, modelPageUrl);
    }

    try {
      const extracts = await this.geminiReader.extractSpecsFromPdf(base64, {
        modelName: entry.name,
        category: entry.category,
      });

      return extracts.map((extract) => {
        const slug = this.buildSlug(extract.modelo, extract.versao);
        return {
          id: slug,
          categoria_principal: entry.category,
          categoria_secundaria: null,
          tipo_veiculo: extract.tipo_veiculo ?? entry.category,
          familia: extract.modelo ?? entry.name,
          modelo: extract.modelo ?? entry.name,
          versao: extract.versao ?? 'Base',
          ano_modelo: extract.ano_modelo ?? entry.modelYear ?? new Date().getFullYear(),
          status: 'Ativo',
          preco_inicial: extract.preco_inicial ?? entry.price,
          moeda: 'BRL',
          motorizacao: {
            descricao: extract.motorizacao?.descricao ?? null,
            combustivel: extract.motorizacao?.combustivel ?? null,
            potencia_cv: extract.motorizacao?.potencia_cv ?? null,
            torque_nm: extract.motorizacao?.torque_nm ?? null,
            tracao: extract.motorizacao?.tracao ?? null,
            transmissao: extract.motorizacao?.transmissao ?? null,
          },
          cores: (extract.cores ?? []).map((c) => ({
            nome: c.nome,
            codigo: c.codigo ?? null,
            disponibilidade: 'Disponível',
          })),
          imagens: modelData.imageUrls.slice(0, 3).map((url, idx) => ({
            tipo: idx === 0 ? 'principal' : 'galeria',
            url,
          })),
          fontes: {
            modelo_url: modelPageUrl,
            versao_url: null,
            ficha_tecnica_url: modelData.fichaTecnicaPdfUrl,
            cores_url: modelPageUrl,
          },
          observacao: null,
        };
      });
    } catch (err) {
      this.logger.error(`Gemini extraction failed for ${entry.name}`, (err as Error).message);
      return this.processWithHtml([entry], modelData, modelPageUrl);
    }
  }

  private async processWithHtml(
    entries: CatalogEntry[],
    modelData: ModelPageData,
    modelPageUrl: string,
  ): Promise<VehicleInfo[]> {
    const versionUrls =
      modelData.versionUrls.length > 0
        ? modelData.versionUrls
        : entries.filter((e) => e.versionPageUrl).map((e) => e.versionPageUrl!);

    if (versionUrls.length === 0) {
      this.logger.warn(`No version URLs found for ${entries[0].name}, building from catalog data`);
      return entries.map((entry) => this.buildVehicleFromCatalog(entry, modelData, modelPageUrl));
    }

    const vehicles: VehicleInfo[] = [];

    for (const versionUrl of versionUrls) {
      try {
        const versionData = await this.crawler.crawlVersionPage(versionUrl);
        const entry = entries[0];
        const slug = this.buildSlug(entry.name, versionData.versionName);

        vehicles.push({
          id: slug,
          categoria_principal: entry.category,
          categoria_secundaria: null,
          tipo_veiculo: entry.category,
          familia: entry.name,
          modelo: entry.name,
          versao: versionData.versionName || entry.brVersion || 'Base',
          ano_modelo:
            versionData.modelYear ?? entry.modelYear ?? new Date().getFullYear(),
          status: 'Ativo',
          preco_inicial: versionData.price ?? entry.price,
          moeda: 'BRL',
          motorizacao: {
            descricao: versionData.motorInfo.description,
            combustivel: versionData.motorInfo.fuel,
            potencia_cv: versionData.motorInfo.powerCv,
            torque_nm: versionData.motorInfo.torqueNm,
            tracao: versionData.motorInfo.traction,
            transmissao: versionData.motorInfo.transmission,
          },
          cores: (versionData.colors.length > 0 ? versionData.colors : modelData.colors).map(
            (c) => ({
              nome: c,
              codigo: null,
              disponibilidade: 'Disponível',
            }),
          ),
          imagens: modelData.imageUrls.slice(0, 3).map((url, idx) => ({
            tipo: idx === 0 ? 'principal' : 'galeria',
            url,
          })),
          fontes: {
            modelo_url: modelPageUrl,
            versao_url: versionUrl,
            ficha_tecnica_url: null,
            cores_url: versionUrl,
          },
          observacao: HTML_WARNING,
        });
      } catch (err) {
        this.logger.error(`Failed to crawl version: ${versionUrl}`, (err as Error).message);
      }
    }

    return vehicles;
  }

  private buildVehicleFromCatalog(
    entry: CatalogEntry,
    modelData: ModelPageData,
    modelPageUrl: string,
  ): VehicleInfo {
    return {
      id: this.buildSlug(entry.name, entry.brVersion ?? 'base'),
      categoria_principal: entry.category,
      categoria_secundaria: null,
      tipo_veiculo: entry.category,
      familia: entry.name,
      modelo: entry.name,
      versao: entry.brVersion ?? 'Base',
      ano_modelo: entry.modelYear ?? new Date().getFullYear(),
      status: 'Ativo',
      preco_inicial: entry.price,
      moeda: 'BRL',
      motorizacao: {
        descricao: null,
        combustivel: null,
        potencia_cv: null,
        torque_nm: null,
        tracao: null,
        transmissao: null,
      },
      cores: modelData.colors.map((c) => ({
        nome: c,
        codigo: null,
        disponibilidade: 'Disponível',
      })),
      imagens: modelData.imageUrls.slice(0, 3).map((url, idx) => ({
        tipo: idx === 0 ? 'principal' : 'galeria',
        url,
      })),
      fontes: {
        modelo_url: modelPageUrl,
        versao_url: entry.versionPageUrl,
        ficha_tecnica_url: null,
        cores_url: modelPageUrl,
      },
      observacao: HTML_WARNING,
    };
  }

  private buildSlug(model: string, version: string): string {
    const raw = `${model}-${version}`;
    return raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
