import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
    constructor() {
        const adapter = new PrismaPg({
            connectionString: process.env.DATABASE_URL as string,
        });
        super({ adapter });
    }

    /**
     * Fecha o pool do driver no shutdown. Sem isto o processo não encerra:
     * as conexões ficam abertas em SIGTERM (e a suíte de testes pendura).
     */
    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }
}
