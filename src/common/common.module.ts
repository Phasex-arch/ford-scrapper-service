import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AesGcmService } from './crypto/aes-gcm.service.js';
import { HashService } from './crypto/hash.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [AesGcmService, HashService, PrismaService],
  exports: [AesGcmService, HashService, PrismaService],
})
export class CommonModule {}
