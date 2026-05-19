import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import type { GeminiVehicleExtract } from './gemini-reader.service.js';

@Injectable()
export class PdfTextExtractorService {
  private readonly logger = new Logger(PdfTextExtractorService.name);

  async extractFromBase64(
    base64Pdf: string,
    context?: { modelName?: string; category?: string },
  ): Promise<GeminiVehicleExtract[]> {
    let text: string;
    try {
      const data = new Uint8Array(Buffer.from(base64Pdf, 'base64'));
      const parser = new PDFParse({ data });
      const result = await parser.getText();
      text = result.text;
      await parser.destroy();
    } catch (err) {
      this.logger.error('pdf-parse failed', (err as Error).message);
      return [];
    }

    if (!text || text.trim().length < 50) {
      this.logger.warn('PDF text extraction returned very little content');
      return [];
    }

    this.logger.log(
      `Extracted ${text.length} chars from PDF, parsing locally...`,
    );
    return this.parseVehicleText(text, context);
  }

  private parseVehicleText(
    text: string,
    context?: { modelName?: string; category?: string },
  ): GeminiVehicleExtract[] {
    const modelName = context?.modelName ?? this.extractModelName(text);
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const powerCv =
      this.findNumber(text, /pot[eê]ncia[:\s]*(\d+)\s*cv/i) ??
      this.findNumber(text, /(\d+)\s*cv/i);
    const torqueNm =
      this.findNumber(text, /torque[:\s]*(\d+)\s*nm/i) ??
      this.findNumber(text, /(\d+)\s*nm/i);
    const traction = this.findPattern(text, /tra[çc][aã]o[:\s]*([^\n,]+)/i);
    const transmission = this.findPattern(
      text,
      /transmiss[aã]o[:\s]*([^\n,]+)/i,
    );
    const motorDesc = this.findPattern(text, /motor[:\s]*([^\n]{5,60})/i);
    const fuel = this.detectFuel(text);
    const price = this.findPrice(text);
    const year =
      this.findNumber(text, /ano[- ]?modelo[:\s]*(\d{4})/i) ??
      this.findNumber(text, /\b(202[4-9])\b/);
    const colors = this.extractColors(lines);
    const versions = this.extractVersionNames(lines, modelName);

    if (versions.length === 0) {
      return [
        {
          modelo: modelName,
          versao: 'Base',
          ano_modelo: year,
          tipo_veiculo: context?.category ?? null,
          preco_inicial: price,
          motorizacao: {
            descricao: motorDesc,
            combustivel: fuel,
            potencia_cv: powerCv,
            torque_nm: torqueNm,
            tracao: traction,
            transmissao: transmission,
          },
          cores: colors.map((c) => ({ nome: c, codigo: null })),
        },
      ];
    }

    return versions.map((v) => ({
      modelo: modelName,
      versao: v,
      ano_modelo: year,
      tipo_veiculo: context?.category ?? null,
      preco_inicial: price,
      motorizacao: {
        descricao: motorDesc,
        combustivel: fuel,
        potencia_cv: powerCv,
        torque_nm: torqueNm,
        tracao: traction,
        transmissao: transmission,
      },
      cores: colors.map((c) => ({ nome: c, codigo: null })),
    }));
  }

  private extractModelName(text: string): string {
    const match = text.match(
      /(?:ford\s+)?([A-Z][a-záéíóúãõ]+(?:\s+[A-Z][a-záéíóúãõ]*)*)/,
    );
    return match?.[1] ?? 'Ford';
  }

  private extractVersionNames(lines: string[], modelName: string): string[] {
    const versions = new Set<string>();
    const versionPattern = new RegExp(
      `(${this.escapeRegex(modelName)}\\s+(?:XL[TS]?|Limited|Titanium|Lariat|Black|Tremor|Raptor|Wildtrak|Sport|SEL|ST)[^\\n]{0,40})`,
      'gi',
    );
    const fullText = lines.join('\n');
    const matches = fullText.matchAll(versionPattern);
    for (const m of matches) {
      const clean = m[1].trim().replace(/\s{2,}/g, ' ');
      if (clean.length < 80) versions.add(clean);
    }
    return [...versions];
  }

  private extractColors(lines: string[]): string[] {
    const colorPattern =
      /^(Preto|Branco|Cinza|Azul|Prata|Vermelho|Laranja|Verde|Marrom|Bege|Amarelo|Dourado|Bronze|Grafite)\s+\w/i;
    const colors = new Set<string>();
    for (const line of lines) {
      if (colorPattern.test(line) && line.length < 40) {
        colors.add(line);
      }
    }
    return [...colors];
  }

  private findNumber(text: string, pattern: RegExp): number | null {
    const m = text.match(pattern);
    return m ? parseInt(m[1], 10) : null;
  }

  private findPattern(text: string, pattern: RegExp): string | null {
    const m = text.match(pattern);
    return m ? m[1].trim() : null;
  }

  private findPrice(text: string): number | null {
    const m = text.match(/R\$\s*([\d.]+(?:,\d{2})?)/);
    if (!m) return null;
    const cleaned = m[1].replace(/\./g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  }

  private detectFuel(text: string): string | null {
    const lower = text.toLowerCase();
    if (/\bdiesel\b/.test(lower)) return 'Diesel';
    if (/\bgasolina\b/.test(lower)) return 'Gasolina';
    if (/\bflex\b/.test(lower)) return 'Flex';
    if (/\bel[eé]trico\b/.test(lower)) return 'Elétrico';
    if (/\bh[ií]brido\b/.test(lower)) return 'Híbrido';
    return null;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
