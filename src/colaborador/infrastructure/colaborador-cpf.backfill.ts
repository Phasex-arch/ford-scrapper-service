import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AesGcmService } from '../../common/crypto/aes-gcm.service.js';
import { HashService } from '../../common/crypto/hash.service.js';

/**
 * Cifra no boot os CPFs que ainda estão em claro (cpfHash nulo): linhas
 * anteriores à migration colaborador_cpf_criptografado e as inseridas pelos
 * seeds. Idempotente — depois da primeira execução não encontra nada.
 */
@Injectable()
export class ColaboradorCpfBackfill implements OnApplicationBootstrap {
  private readonly logger = new Logger(ColaboradorCpfBackfill.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aes: AesGcmService,
    private readonly hash: HashService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.aes.isAvailable() || !this.hash.isAvailable()) {
      this.logger.warn(
        'DATA_ENCRYPTION_KEY/DATA_ENCRYPTION_PEPPER ausentes: CPFs em claro não serão cifrados',
      );
      return;
    }

    const pendentes = await this.prisma.colaborador.findMany({
      where: { cpfHash: null },
      select: { id: true, cpf: true },
    });
    for (const { id, cpf } of pendentes) {
      await this.prisma.colaborador.update({
        where: { id },
        data: {
          cpf: this.aes.encrypt(cpf),
          cpfHash: this.hash.lookupHash(cpf),
        },
      });
    }
    if (pendentes.length > 0) {
      this.logger.log(`${pendentes.length} CPF(s) de colaborador cifrados`);
    }
  }
}
