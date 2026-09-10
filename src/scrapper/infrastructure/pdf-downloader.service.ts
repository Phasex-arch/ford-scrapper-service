import { Injectable, Logger } from '@nestjs/common';

/** Apenas https e hosts da Ford: a URL vem de um `href` de pagina rastreada. */
const HOST_PERMITIDO = /(^|\.)ford\.com\.br$/;
/** Teto de bytes: a ficha tecnica maior da Ford fica na casa de 1 MB. */
const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class PdfDownloaderService {
  private readonly logger = new Logger(PdfDownloaderService.name);

  /**
   * SSRF de segunda ordem: o alvo e um `href` extraido do HTML rastreado, sem
   * nenhuma restricao de origem no `resolveUrl` do crawler. Dai a allowlist de
   * esquema + host, redirect manual (um 3xx poderia sair do dominio ou apontar
   * para IP interno) e leitura com teto de bytes, em vez de `arrayBuffer()`
   * sobre um corpo de tamanho arbitrario.
   */
  async downloadAsBase64(pdfUrl: string): Promise<string | null> {
    if (!this.urlPermitida(pdfUrl)) {
      this.logger.warn(`PDF recusado (origem nao permitida): ${pdfUrl}`);
      return null;
    }

    try {
      this.logger.log(`Downloading PDF: ${pdfUrl}`);

      const response = await fetch(pdfUrl, {
        redirect: 'manual',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          Accept: 'application/pdf,*/*',
        },
      });

      if (!response.ok) {
        this.logger.warn(`PDF download failed (${response.status}): ${pdfUrl}`);
        return null;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (
        !contentType.includes('pdf') &&
        !contentType.includes('octet-stream')
      ) {
        this.logger.warn(
          `Unexpected content-type "${contentType}" for ${pdfUrl}`,
        );
      }

      const declarado = Number(response.headers.get('content-length') ?? 0);
      if (declarado > MAX_BYTES) {
        this.logger.warn(`PDF recusado (${declarado} bytes declarados): ${pdfUrl}`);
        return null;
      }

      const buffer = await this.lerComTeto(response);
      if (!buffer) {
        this.logger.warn(`PDF recusado (passou de ${MAX_BYTES} bytes): ${pdfUrl}`);
        return null;
      }
      const base64 = buffer.toString('base64');

      this.logger.log(
        `PDF downloaded (${Math.round(buffer.byteLength / 1024)} KB)`,
      );
      return base64;
    } catch (error) {
      this.logger.error(
        `Failed to download PDF: ${pdfUrl}`,
        (error as Error).message,
      );
      return null;
    }
  }

  private urlPermitida(pdfUrl: string): boolean {
    try {
      const url = new URL(pdfUrl);
      return url.protocol === 'https:' && HOST_PERMITIDO.test(url.hostname);
    } catch {
      return false;
    }
  }

  /** Aborta no meio do download se o corpo passar do teto. */
  private async lerComTeto(response: Response): Promise<Buffer | null> {
    const reader = response.body?.getReader();
    if (!reader) return Buffer.alloc(0);

    const partes: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      partes.push(value);
    }
    return Buffer.concat(partes);
  }
}
