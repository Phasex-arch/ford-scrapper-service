import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfDownloaderService {
  private readonly logger = new Logger(PdfDownloaderService.name);

  async downloadAsBase64(pdfUrl: string): Promise<string | null> {
    try {
      this.logger.log(`Downloading PDF: ${pdfUrl}`);

      const response = await fetch(pdfUrl, {
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

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

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
}
