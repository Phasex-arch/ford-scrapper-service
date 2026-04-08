import { Module } from '@nestjs/common';
import { ScrapperController } from './presentation/scrapper.controller.js';
import { ScrapperService } from './application/scrapper.js';
import { FordCrawlerService } from './infrastructure/ford-crawler.service.js';
import { PdfDownloaderService } from './infrastructure/pdf-downloader.service.js';
import { GeminiReaderService } from './infrastructure/gemini-reader.service.js';
import { PdfTextExtractorService } from './infrastructure/pdf-text-extractor.service.js';

@Module({
  controllers: [ScrapperController],
  providers: [
    ScrapperService,
    FordCrawlerService,
    PdfDownloaderService,
    GeminiReaderService,
    PdfTextExtractorService,
  ],
  exports: [ScrapperService],
})
export class ScrapperModule {}
