import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Vehicle } from 'src/vehicle/domain/vehicle.js';
import { IPortDBDataVehicle } from 'src/vehicle/application/vehicle/IPortDBDataVehicle.js';
import type { CreateVehicleDto } from 'src/vehicle/application/dto/create-vehicle.dto.js';
import type { VehicleFilterDto } from 'src/vehicle/application/dto/vehicle-filter.dto.js';

const VEHICLE_INCLUDE = {
    motorizacao: true,
    cores: true,
    imagens: true,
    fontes: true,
} as const;

@Injectable()
export class VehicleRepository implements IPortDBDataVehicle {
    constructor(private readonly prisma: PrismaService) {}

    async save(dto: CreateVehicleDto): Promise<Vehicle> {
        return this.prisma.vehicle.upsert({
            where: { slug: dto.slug },
            update: {
                categoria_principal: dto.categoria_principal,
                categoria_secundaria: dto.categoria_secundaria,
                tipo_veiculo: dto.tipo_veiculo,
                familia: dto.familia,
                modelo: dto.modelo,
                versao: dto.versao,
                ano_modelo: dto.ano_modelo,
                status: dto.status,
                preco_inicial: dto.preco_inicial,
                basePrice: dto.basePrice,
                currency: dto.currency,
                observacao: dto.observacao,
                updatedAt: new Date(),
                motorizacao: {
                    update: {
                        descricao: dto.motorizacao.descricao,
                        combustivel: dto.motorizacao.combustivel,
                        potencia_cv: dto.motorizacao.potencia_cv,
                        torque_nm: dto.motorizacao.torque_nm,
                        tracao: dto.motorizacao.tracao,
                        transmissao: dto.motorizacao.transmissao,
                    },
                },
                cores: {
                    deleteMany: {},
                    create: dto.cores.map((c) => ({
                        nome: c.nome,
                        codigo: c.codigo,
                        disponibilidade: c.disponibilidade,
                    })),
                },
                imagens: {
                    deleteMany: {},
                    create: dto.imagens.map((i) => ({
                        tipo: i.tipo,
                        url: i.url,
                    })),
                },
                fontes: {
                    update: {
                        modelo_url: dto.fontes.modelo_url,
                        versao_url: dto.fontes.versao_url,
                        ficha_tecnica_url: dto.fontes.ficha_tecnica_url,
                        cores_url: dto.fontes.cores_url,
                    },
                },
            },
            create: {
                slug: dto.slug,
                categoria_principal: dto.categoria_principal,
                categoria_secundaria: dto.categoria_secundaria,
                tipo_veiculo: dto.tipo_veiculo,
                familia: dto.familia,
                modelo: dto.modelo,
                versao: dto.versao,
                ano_modelo: dto.ano_modelo,
                status: dto.status,
                preco_inicial: dto.preco_inicial,
                basePrice: dto.basePrice,
                currency: dto.currency,
                observacao: dto.observacao,
                motorizacao: {
                    create: {
                        descricao: dto.motorizacao.descricao,
                        combustivel: dto.motorizacao.combustivel,
                        potencia_cv: dto.motorizacao.potencia_cv,
                        torque_nm: dto.motorizacao.torque_nm,
                        tracao: dto.motorizacao.tracao,
                        transmissao: dto.motorizacao.transmissao,
                    },
                },
                cores: {
                    create: dto.cores.map((c) => ({
                        nome: c.nome,
                        codigo: c.codigo,
                        disponibilidade: c.disponibilidade,
                    })),
                },
                imagens: {
                    create: dto.imagens.map((i) => ({
                        tipo: i.tipo,
                        url: i.url,
                    })),
                },
                fontes: {
                    create: {
                        modelo_url: dto.fontes.modelo_url,
                        versao_url: dto.fontes.versao_url,
                        ficha_tecnica_url: dto.fontes.ficha_tecnica_url,
                        cores_url: dto.fontes.cores_url,
                    },
                },
            },
            include: VEHICLE_INCLUDE,
        });
    }

    async findBySlug(slug: string): Promise<Vehicle | null> {
        return this.prisma.vehicle.findUnique({
            where: { slug },
            include: VEHICLE_INCLUDE,
        });
    }

    async findAll(): Promise<Vehicle[]> {
        return this.prisma.vehicle.findMany({
            include: VEHICLE_INCLUDE,
        });
    }

    async findById(id: string): Promise<Vehicle | null> {
        return this.prisma.vehicle.findUnique({
            where: { id },
            include: VEHICLE_INCLUDE,
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.vehicle.delete({
            where: { id },
        });
    }

    async findWithFilters(filters: VehicleFilterDto): Promise<Vehicle[]> {
        const where = this.buildWhereClause(filters);
        const orderBy = this.buildOrderBy(filters.sort);
        const page = filters.page ?? 1;
        const limit = filters.limit ?? 20;

        return this.prisma.vehicle.findMany({
            where,
            orderBy,
            skip: (page - 1) * limit,
            take: limit,
            include: VEHICLE_INCLUDE,
        });
    }

    async countWithFilters(filters: VehicleFilterDto): Promise<number> {
        const where = this.buildWhereClause(filters);
        return this.prisma.vehicle.count({ where });
    }

    async findDistinctCategories(): Promise<{ categoria_principal: string; count: number }[]> {
        const groups = await this.prisma.vehicle.groupBy({
            by: ['categoria_principal'],
            _count: { id: true },
            orderBy: { categoria_principal: 'asc' },
        });

        return groups.map((g) => ({
            categoria_principal: g.categoria_principal,
            count: g._count.id,
        }));
    }

    async findDistinctModels(): Promise<{ modelo: string; familia: string; count: number }[]> {
        const groups = await this.prisma.vehicle.groupBy({
            by: ['modelo', 'familia'],
            _count: { id: true },
            orderBy: { modelo: 'asc' },
        });

        return groups.map((g) => ({
            modelo: g.modelo,
            familia: g.familia,
            count: g._count.id,
        }));
    }

    async findDistinctVersions(): Promise<{ versao: string; modelo: string; count: number }[]> {
        const groups = await this.prisma.vehicle.groupBy({
            by: ['versao', 'modelo'],
            _count: { id: true },
            orderBy: { versao: 'asc' },
        });

        return groups.map((g) => ({
            versao: g.versao,
            modelo: g.modelo,
            count: g._count.id,
        }));
    }

    async findDistinctColors(): Promise<{ nome: string; count: number }[]> {
        const groups = await this.prisma.cor.groupBy({
            by: ['nome'],
            _count: { id: true },
            orderBy: { nome: 'asc' },
        });

        return groups.map((g) => ({
            nome: g.nome,
            count: g._count.id,
        }));
    }

    async search(query: string, page: number, limit: number): Promise<Vehicle[]> {
        const where = this.buildSearchWhere(query);
        return this.prisma.vehicle.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: VEHICLE_INCLUDE,
        });
    }

    async searchCount(query: string): Promise<number> {
        const where = this.buildSearchWhere(query);
        return this.prisma.vehicle.count({ where });
    }

    async getStats(): Promise<Record<string, unknown>> {
        const [
            totalVehicles,
            categories,
            models,
            versions,
            colors,
            priceStats,
            lastSync,
        ] = await Promise.all([
            this.prisma.vehicle.count(),
            this.prisma.vehicle.groupBy({ by: ['categoria_principal'], _count: { id: true } }),
            this.prisma.vehicle.groupBy({ by: ['modelo'], _count: { id: true } }),
            this.prisma.vehicle.groupBy({ by: ['versao'], _count: { id: true } }),
            this.prisma.cor.groupBy({ by: ['nome'], _count: { id: true } }),
            this.prisma.vehicle.aggregate({
                _min: { preco_inicial: true },
                _max: { preco_inicial: true },
                _avg: { preco_inicial: true },
            }),
            this.prisma.syncRun.findFirst({
                orderBy: { startedAt: 'desc' },
            }),
        ]);

        return {
            total_vehicles: totalVehicles,
            total_categories: categories.length,
            total_models: models.length,
            total_versions: versions.length,
            total_colors: colors.length,
            price_range: {
                min: priceStats._min.preco_inicial,
                max: priceStats._max.preco_inicial,
                avg: priceStats._avg.preco_inicial
                    ? Math.round(priceStats._avg.preco_inicial)
                    : null,
            },
            categories_breakdown: categories.map((c) => ({
                name: c.categoria_principal,
                count: c._count.id,
            })),
            last_sync: lastSync
                ? {
                      id: lastSync.id,
                      status: lastSync.status,
                      vehicles_found: lastSync.vehiclesFound,
                      vehicles_saved: lastSync.vehiclesSaved,
                      started_at: lastSync.startedAt.toISOString(),
                      completed_at: lastSync.completedAt?.toISOString() ?? null,
                      duration_ms: lastSync.durationMs,
                  }
                : null,
        };
    }

    async getAllSources(): Promise<
        {
            modelo_url: string;
            versao_url: string | null;
            ficha_tecnica_url: string | null;
            cores_url: string;
        }[]
    > {
        const fontes = await this.prisma.fontes.findMany({
            select: {
                modelo_url: true,
                versao_url: true,
                ficha_tecnica_url: true,
                cores_url: true,
            },
        });
        return fontes;
    }

    async deleteAll(): Promise<number> {
        // Delete in order respecting FK constraints
        await this.prisma.cor.deleteMany();
        await this.prisma.imagem.deleteMany();
        const result = await this.prisma.vehicle.deleteMany();
        await this.prisma.motorizacao.deleteMany();
        await this.prisma.fontes.deleteMany();
        return result.count;
    }

    private buildWhereClause(filters: VehicleFilterDto) {
        const where: Record<string, unknown> = {};

        if (filters.categoria) {
            where.categoria_principal = {
                contains: filters.categoria,
                mode: 'insensitive',
            };
        }
        if (filters.modelo) {
            where.modelo = {
                contains: filters.modelo,
                mode: 'insensitive',
            };
        }
        if (filters.versao) {
            where.versao = {
                contains: filters.versao,
                mode: 'insensitive',
            };
        }
        if (filters.tipo_veiculo) {
            where.tipo_veiculo = {
                contains: filters.tipo_veiculo,
                mode: 'insensitive',
            };
        }
        if (filters.combustivel) {
            where.motorizacao = {
                combustivel: { contains: filters.combustivel, mode: 'insensitive' },
            };
        }
        if (filters.tracao) {
            where.motorizacao = {
                ...((where.motorizacao as Record<string, unknown>) ?? {}),
                tracao: { contains: filters.tracao, mode: 'insensitive' },
            };
        }
        if (filters.transmissao) {
            where.motorizacao = {
                ...((where.motorizacao as Record<string, unknown>) ?? {}),
                transmissao: { contains: filters.transmissao, mode: 'insensitive' },
            };
        }
        if (filters.cor) {
            where.cores = {
                some: {
                    nome: { contains: filters.cor, mode: 'insensitive' },
                },
            };
        }
        if (filters.preco_min !== undefined || filters.preco_max !== undefined) {
            const preco: Record<string, number> = {};
            if (filters.preco_min !== undefined) preco.gte = filters.preco_min;
            if (filters.preco_max !== undefined) preco.lte = filters.preco_max;
            where.preco_inicial = preco;
        }

        return where;
    }

    private buildOrderBy(sort?: string) {
        if (sort === 'preco_asc') return { preco_inicial: 'asc' as const };
        if (sort === 'preco_desc') return { preco_inicial: 'desc' as const };
        return { modelo: 'asc' as const };
    }

    private buildSearchWhere(query: string) {
        return {
            OR: [
                { modelo: { contains: query, mode: 'insensitive' as const } },
                { versao: { contains: query, mode: 'insensitive' as const } },
                { familia: { contains: query, mode: 'insensitive' as const } },
                { categoria_principal: { contains: query, mode: 'insensitive' as const } },
                { tipo_veiculo: { contains: query, mode: 'insensitive' as const } },
            ],
        };
    }
}