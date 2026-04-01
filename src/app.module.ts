import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScrapperModule } from './scrapper/scrapper.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ScrapperModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
