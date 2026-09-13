-- CreateEnum
CREATE TYPE "VeiculoClienteStatus" AS ENUM ('ATIVO', 'VENDIDO', 'SUBSTITUIDO');

-- CreateTable
CREATE TABLE "VeiculoCliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "estoqueVeiculoId" TEXT,
    "modelo" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "ano" TEXT NOT NULL,
    "cor" TEXT NOT NULL,
    "km" TEXT,
    "imagem" TEXT,
    "precoAquisicao" DOUBLE PRECISION NOT NULL,
    "dataAquisicao" TIMESTAMP(3) NOT NULL,
    "dataSaida" TIMESTAMP(3),
    "status" "VeiculoClienteStatus" NOT NULL DEFAULT 'ATIVO',
    "atual" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VeiculoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VeiculoCliente_clienteId_idx" ON "VeiculoCliente"("clienteId");

-- CreateIndex
CREATE INDEX "VeiculoCliente_estoqueVeiculoId_idx" ON "VeiculoCliente"("estoqueVeiculoId");

-- AddForeignKey
ALTER TABLE "VeiculoCliente" ADD CONSTRAINT "VeiculoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VeiculoCliente" ADD CONSTRAINT "VeiculoCliente_estoqueVeiculoId_fkey" FOREIGN KEY ("estoqueVeiculoId") REFERENCES "EstoqueVeiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
