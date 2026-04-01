import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface GeminiVehicleExtract {
  modelo: string;
  versao: string;
  ano_modelo: number | null;
  tipo_veiculo: string | null;
  preco_inicial: number | null;
  motorizacao: {
    descricao: string | null;
    combustivel: string | null;
    potencia_cv: number | null;
    torque_nm: number | null;
    tracao: string | null;
    transmissao: string | null;
  };
  cores: { nome: string; codigo: string | null }[];
}

const EXTRACTION_PROMPT = `You are a vehicle data extraction specialist. Analyze this Ford Brasil vehicle technical specification PDF (ficha técnica).

Extract information for EVERY version/variant found in the document.
Return a JSON array where each element has this exact structure:

[
  {
    "modelo": "Model name (e.g., Ranger, Maverick, Territory)",
    "versao": "Full version name (e.g., XLT 3.0 V6 Diesel 4WD AT)",
    "ano_modelo": 2026,
    "tipo_veiculo": "Vehicle type (e.g., Picape Média, SUV Compacto, Sedan, Van)",
    "preco_inicial": 285900,
    "motorizacao": {
      "descricao": "Engine description (e.g., 3.0L V6 Diesel Turbo)",
      "combustivel": "Diesel",
      "potencia_cv": 250,
      "torque_nm": 600,
      "tracao": "4WD",
      "transmissao": "Automática de 10 velocidades"
    },
    "cores": [
      { "nome": "Branco Artico", "codigo": null },
      { "nome": "Azul Belize", "codigo": null }
    ]
  }
]

IMPORTANT RULES:
- Return ONLY the raw JSON array. No markdown code fences, no comments, no explanations.
- Use null for values that are not present in the document.
- Prices must be numbers without currency symbols or thousand separators. Example: R$ 285.900 becomes 285900.
- Power in cv (cavalos), torque in Nm.
- If colors are listed per version, associate them correctly. If listed globally, include them in all versions.
- Extract ALL versions found in the PDF.`;

@Injectable()
export class GeminiReaderService {
  private readonly logger = new Logger(GeminiReaderService.name);
  private readonly ai: GoogleGenAI;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_KEY');
    if (!apiKey) throw new Error('GEMINI_KEY not configured');
    this.ai = new GoogleGenAI({ apiKey });
  }

  async extractSpecsFromPdf(
    base64Pdf: string,
    context?: { modelName?: string; category?: string },
  ): Promise<GeminiVehicleExtract[]> {
    const contextHint = context?.modelName
      ? `\nContext: this PDF is for the Ford ${context.modelName} (${context.category ?? 'unknown category'}).`
      : '';

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        this.logger.log(
          `Sending PDF to Gemini (attempt ${attempt}, ~${Math.round(base64Pdf.length / 1370)} KB)`,
        );

        const response = await this.ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Pdf,
                  },
                },
                { text: EXTRACTION_PROMPT + contextHint },
              ],
            },
          ],
        });

        const raw = response.text?.trim() ?? '';
        const parsed = this.parseJsonResponse(raw);

        if (parsed.length === 0) {
          this.logger.warn('Gemini returned zero vehicles, retrying...');
          continue;
        }

        this.logger.log(`Gemini extracted ${parsed.length} version(s)`);
        return parsed;
      } catch (error) {
        this.logger.error(`Gemini attempt ${attempt} failed`, (error as Error).message);
        if (attempt === 2) throw error;
      }
    }

    return [];
  }

  private parseJsonResponse(raw: string): GeminiVehicleExtract[] {
    let cleaned = raw;
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    cleaned = cleaned.trim();

    if (!cleaned.startsWith('[')) {
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
      }
    }

    try {
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) return [parsed];
      return parsed;
    } catch (e) {
      this.logger.error('Failed to parse Gemini JSON response', cleaned.substring(0, 200));
      return [];
    }
  }
}
