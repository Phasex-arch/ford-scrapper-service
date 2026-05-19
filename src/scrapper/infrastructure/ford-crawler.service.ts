import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import type {
  CatalogEntry,
  ModelPageData,
  VersionPageData,
} from '../domain/scrapped-info.js';

const BASE_URL = 'https://www.ford.com.br';
const LISTING_URL = `${BASE_URL}/todos-os-veiculos/`;
const REQUEST_DELAY_MS = 600;

const CATEGORY_MAP: Record<string, string> = {
  picapes: 'Picape',
  'suvs-e-crossovers': 'SUV',
  performance: 'Performance',
  'veiculos-comerciais': 'Comercial',
  hibridos: 'Eletrificação',
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

@Injectable()
export class FordCrawlerService {
  private readonly logger = new Logger(FordCrawlerService.name);

  private async fetchPage(url: string): Promise<string> {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return res.text();
  }

  private resolveUrl(href: string): string {
    if (href.startsWith('http')) return href;
    return new URL(href, BASE_URL).toString();
  }

  private isVehiclePageUrl(url: string): boolean {
    const path = new URL(url).pathname;
    return (
      /^\/(picapes|suvs-e-crossovers|performance|veiculos-comerciais)\//.test(
        path,
      ) ||
      /\/hibridos\//.test(path) ||
      /\/content\/ford\/br\/pt_br\/home\/hibridos\//.test(path)
    );
  }

  private isVersionPageUrl(url: string): boolean {
    const path = new URL(url).pathname;
    return (
      path.includes('/compare-as-versoes/') ||
      path.split('/').filter(Boolean).length > 2
    );
  }

  private categoryFromUrl(url: string): string {
    const path = new URL(url).pathname;
    for (const [segment, cat] of Object.entries(CATEGORY_MAP)) {
      if (path.includes(`/${segment}/`)) return cat;
    }
    if (path.includes('/hibridos/') || path.includes('/hibridos'))
      return 'Eletrificação';
    return 'Outros';
  }

  private modelPageUrlFromVersionUrl(versionUrl: string): string {
    const parsed = new URL(versionUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return `${BASE_URL}/${segments[0]}/${segments[1]}.html`;
    }
    return versionUrl;
  }

  private extractPrice(text: string): number | null {
    const match = text.match(/R\$\s*([\d.,]+)/);
    if (!match) return null;
    const cleaned = match[1].replace(/\./g, '').replace(',', '.');
    const value = parseFloat(cleaned);
    return isNaN(value) ? null : value;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async crawlCatalog(): Promise<CatalogEntry[]> {
    this.logger.log('Crawling catalog page...');
    const html = await this.fetchPage(LISTING_URL);
    const $ = cheerio.load(html);
    const entries: CatalogEntry[] = [];
    const seenUrls = new Set<string>();

    const allLinks = $('a').toArray();

    for (let i = 0; i < allLinks.length; i++) {
      const $a = $(allLinks[i]);
      const text = $a.text().trim();
      const href = $a.attr('href');

      if (!href || !text.toLowerCase().includes('explore')) continue;

      const fullUrl = this.resolveUrl(href);
      if (!this.isVehiclePageUrl(fullUrl)) continue;
      if (seenUrls.has(fullUrl)) continue;
      seenUrls.add(fullUrl);

      let brModel: string | null = null;
      let modelYear: number | null = null;
      let brVersion: string | null = null;
      let price: number | null = null;

      for (let j = i + 1; j < Math.min(i + 5, allLinks.length); j++) {
        const nextHref = $(allLinks[j]).attr('href') ?? '';
        if (nextHref.includes('request-a-quote')) {
          try {
            const quoteUrl = new URL(this.resolveUrl(nextHref));
            brModel = quoteUrl.searchParams.get('BRModel');
            const yr = quoteUrl.searchParams.get('modelyear');
            modelYear = yr ? parseInt(yr, 10) : null;
            brVersion = quoteUrl.searchParams.get('BRVersion');
          } catch {}
          break;
        }
      }

      let $ctx = $a.parent();
      for (let depth = 0; depth < 4 && !price; depth++) {
        price = this.extractPrice($ctx.text());
        $ctx = $ctx.parent();
      }

      const name = brModel ?? this.nameFromUrl(fullUrl);
      const category = this.categoryFromUrl(fullUrl);
      const isVersion = this.isVersionPageUrl(fullUrl);

      entries.push({
        name,
        category,
        price,
        modelPageUrl: isVersion
          ? this.modelPageUrlFromVersionUrl(fullUrl)
          : fullUrl,
        versionPageUrl: isVersion ? fullUrl : null,
        modelYear,
        brVersion,
      });
    }

    this.logger.log(`Found ${entries.length} catalog entries`);
    return entries;
  }

  async crawlModelPage(url: string): Promise<ModelPageData> {
    this.logger.log(`Crawling model page: ${url}`);

    let html: string;
    try {
      html = await this.fetchPage(url);
    } catch {
      this.logger.warn(`Failed to fetch model page: ${url}`);
      return {
        fichaTecnicaPdfUrl: null,
        versionUrls: [],
        colors: [],
        imageUrls: [],
      };
    }

    const $ = cheerio.load(html);
    let fichaTecnicaPdfUrl: string | null = null;
    const versionUrls: string[] = [];
    const colors = new Set<string>();
    const imageUrls: string[] = [];

    $('a').each((_, el) => {
      if (fichaTecnicaPdfUrl) return;
      const href = $(el).attr('href') ?? '';
      if (!href) return;

      const hrefMatch = href.includes('ficha-tecnica') && href.endsWith('.pdf');

      const rawText = $(el).text().trim();
      const normalized = rawText
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const textMatch =
        normalized.includes('ficha tecnica') && href.endsWith('.pdf');

      if (hrefMatch || textMatch) {
        fichaTecnicaPdfUrl = this.resolveUrl(href);
      }
    });

    $('a').each((_, el) => {
      const href = $(el).attr('href') ?? '';
      const text = $(el).text().trim().toLowerCase();
      if (!href) return;

      const full = this.resolveUrl(href);
      const path = new URL(full).pathname;

      if (
        (text.includes('conheça') || text.includes('conheca')) &&
        this.isVehiclePageUrl(full) &&
        this.isVersionPageUrl(full)
      ) {
        if (!versionUrls.includes(full)) versionUrls.push(full);
      } else if (path.includes('/compare-as-versoes/')) {
        if (!versionUrls.includes(full)) versionUrls.push(full);
      }
    });

    const colorPattern =
      /^(Preto|Branco|Cinza|Azul|Prata|Vermelho|Laranja|Verde|Marrom|Bege|Amarelo|Dourado|Bronze|Grafite)\s/i;
    $('*').each((_, el) => {
      const text = $(el).children().length === 0 ? $(el).text().trim() : '';
      if (text && colorPattern.test(text) && text.length < 40) {
        colors.add(text);
      }
    });

    $('img').each((_, el) => {
      const src = $(el).attr('src') ?? '';
      if (src.includes('/content/dam/Ford/') && src.includes('/nameplate/')) {
        imageUrls.push(this.resolveUrl(src));
      }
    });

    this.logger.log(
      `Model page result — PDF: ${!!fichaTecnicaPdfUrl}, versions: ${versionUrls.length}, colors: ${colors.size}`,
    );

    return {
      fichaTecnicaPdfUrl,
      versionUrls,
      colors: [...colors],
      imageUrls: [...new Set(imageUrls)],
    };
  }

  async crawlVersionPage(url: string): Promise<VersionPageData> {
    this.logger.log(`Crawling version page: ${url}`);

    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    let versionName = '';
    $('h1, h2').each((_, el) => {
      const text = $(el).text().trim();
      if (text && !versionName && text.length < 100) {
        versionName = text;
      }
    });

    const subHeading = $('h2')
      .filter((_, el) => {
        const t = $(el).text().trim();
        return t.includes('(') && t.includes(')');
      })
      .first()
      .text()
      .trim();
    if (subHeading) versionName = subHeading;

    let priceText = '';
    $('*').each((_, el) => {
      const text = $(el).text().trim();
      if (text.match(/R\$\s*[\d.,]+/) && !priceText) {
        priceText = text;
      }
    });
    const price = this.extractPrice(priceText);

    let modelYear: number | null = null;
    const yearMatch = versionName.match(/\b(202\d)\b/);
    if (yearMatch) modelYear = parseInt(yearMatch[1], 10);

    const specs: Record<string, Record<string, string>> = {};
    const tables = $('table').toArray();

    for (const table of tables) {
      let sectionName = 'Geral';
      let $prev = $(table).prev();
      for (let depth = 0; depth < 5; depth++) {
        if ($prev.length === 0) {
          $prev = $(table).parent().prev();
          continue;
        }
        const heading =
          $prev.find('h3, h4, strong').first().text().trim() ||
          $prev.text().trim();
        if (heading && heading.length < 60) {
          sectionName = heading.toUpperCase();
          break;
        }
        $prev = $prev.prev();
      }

      const sectionData: Record<string, string> = {};
      $(table)
        .find('tr')
        .each((_, tr) => {
          const cells = $(tr).find('td, th').toArray();
          if (cells.length === 0) return;

          const key = $(cells[0]).text().trim();
          const value = cells.length > 1 ? $(cells[1]).text().trim() : '';

          if (key && !key.includes('---')) {
            sectionData[key] = value;
          }
        });

      if (Object.keys(sectionData).length > 0) {
        specs[sectionName] = { ...(specs[sectionName] ?? {}), ...sectionData };
      }
    }

    const motorInfo = this.extractMotorInfo(specs);

    const colors = new Set<string>();
    const colorPattern =
      /^(Preto|Branco|Cinza|Azul|Prata|Vermelho|Laranja|Verde|Marrom|Bege|Amarelo|Dourado|Bronze|Grafite)\s/i;
    $('*').each((_, el) => {
      const text = $(el).children().length === 0 ? $(el).text().trim() : '';
      if (text && colorPattern.test(text) && text.length < 40) {
        colors.add(text);
      }
    });

    return {
      versionName,
      price,
      modelYear,
      specs,
      colors: [...colors],
      motorInfo,
    };
  }

  private extractMotorInfo(specs: Record<string, Record<string, string>>) {
    const info = {
      description: null as string | null,
      fuel: null as string | null,
      powerCv: null as number | null,
      torqueNm: null as number | null,
      traction: null as string | null,
      transmission: null as string | null,
    };

    const allEntries = Object.values(specs).flatMap((s) => Object.entries(s));

    for (const [key, value] of allEntries) {
      const keyLower = key.toLowerCase();
      const valueLower = value.toLowerCase();

      if (keyLower.includes('motor') && !keyLower.includes('motorista')) {
        info.description = value || key.replace(/^motor\s*/i, '').trim() || key;
      }
      if (keyLower.includes('potência') || keyLower.includes('potencia')) {
        const m = (value || key).match(/(\d+)\s*cv/i);
        if (m) info.powerCv = parseInt(m[1], 10);
      }
      if (keyLower.includes('torque')) {
        const m = (value || key).match(/(\d+)\s*nm/i);
        if (m) info.torqueNm = parseInt(m[1], 10);
      }
      if (keyLower.includes('tração') || keyLower.includes('tracao')) {
        info.traction = value || null;
      }
      if (
        keyLower.includes('transmissão') ||
        keyLower.includes('transmissao')
      ) {
        info.transmission = value || null;
      }
      if (
        valueLower.includes('diesel') ||
        valueLower.includes('gasolina') ||
        valueLower.includes('flex') ||
        valueLower.includes('elétrico') ||
        valueLower.includes('eletrico') ||
        valueLower.includes('híbrido') ||
        valueLower.includes('hibrido')
      ) {
        if (!info.fuel) info.fuel = value;
      }
    }

    if (!info.fuel && info.description) {
      if (/diesel/i.test(info.description)) info.fuel = 'Diesel';
      else if (/gasolina/i.test(info.description)) info.fuel = 'Gasolina';
      else if (/flex/i.test(info.description)) info.fuel = 'Flex';
      else if (/el[eé]trico/i.test(info.description)) info.fuel = 'Elétrico';
      else if (/h[ií]brido/i.test(info.description)) info.fuel = 'Híbrido';
    }

    return info;
  }

  buildCandidatePdfUrls(
    modelPageUrl: string,
    modelYear: number | null,
  ): string[] {
    const parsed = new URL(modelPageUrl);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const slug = (segments[1] ?? segments[0] ?? '')
      .replace(/\.html$/, '')
      .toLowerCase();

    if (!slug) return [];

    const years = [
      modelYear ?? new Date().getFullYear(),
      new Date().getFullYear(),
      new Date().getFullYear() - 1,
    ];
    const uniqueYears = [...new Set(years)];

    const folderVariants = [
      slug,
      `nova-geracao-${slug}`,
      `novo-${slug}`,
      `nova-${slug}`,
    ];
    const cdnBase = `${BASE_URL}/content/dam/Ford/website-assets/latam/br/nameplate`;

    const candidates: string[] = [];
    for (const year of uniqueYears) {
      for (const folder of folderVariants) {
        candidates.push(
          `${cdnBase}/${year}/${folder}/pdf/fbr-${slug}-ficha-tecnica.pdf`,
        );
      }
    }

    this.logger.debug(
      `Generated ${candidates.length} candidate PDF URLs for ${slug}`,
    );
    return candidates;
  }

  private nameFromUrl(url: string): string {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    const last = segments.at(-1)?.replace(/\.html$/, '') ?? '';
    return last
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
