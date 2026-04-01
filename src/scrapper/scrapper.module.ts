import { Module } from '@nestjs/common';
import { ScrapperController } from './presentation/scrapper.controller.js';
import { ScrapperService } from './application/scrapper.js';
import { FordCrawlerService } from './infrastructure/ford-crawler.service.js';
import { PdfDownloaderService } from './infrastructure/pdf-downloader.service.js';
import { GeminiReaderService } from './infrastructure/gemini-reader.service.js';

@Module({
  controllers: [ScrapperController],
  providers: [ScrapperService, FordCrawlerService, PdfDownloaderService, GeminiReaderService],
  exports: [ScrapperService],
})
export class ScrapperModule {}
