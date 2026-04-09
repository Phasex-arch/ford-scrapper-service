import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import { Vehicle } from 'src/vehicle/domain/vehicle.js';
import { IPortDBDataVehicle } from 'src/vehicle/application/vehicle/IPortDBDataVehicle.js';
import type { CreateVehicleDto } from 'src/vehicle/application/dto/create-vehicle.dto.js';

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
            include: {
                motorizacao: true,
                cores: true,
                imagens: true,
                fontes: true,
            },
        });
    }

    async findBySlug(slug: string): Promise<Vehicle | null> {
        return this.prisma.vehicle.findUnique({
            where: { slug },
            include: {
                motorizacao: true,
                cores: true,
                imagens: true,
                fontes: true,
            },
        });
    }

    async findAll(): Promise<Vehicle[]> {
        return this.prisma.vehicle.findMany({
            include: {
                motorizacao: true,
                cores: true,
                imagens: true,
                fontes: true,
            },
        });
    }

    async findById(id: string): Promise<Vehicle | null> {
        return this.prisma.vehicle.findUnique({
            where: { id },
            include: {
                motorizacao: true,
                cores: true,
                imagens: true,
                fontes: true,
            },
        });
    }

    async delete(id: string): Promise<void> {
        await this.prisma.vehicle.delete({
            where: { id },
        });
    }
}