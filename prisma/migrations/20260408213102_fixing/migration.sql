/*
  Warnings:

  - You are about to drop the `Brand` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Color` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Model` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SourceRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Specification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Version` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VersionColor` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_versionId_fkey";

-- DropForeignKey
ALTER TABLE "Model" DROP CONSTRAINT "Model_brandId_fkey";

-- DropForeignKey
ALTER TABLE "Model" DROP CONSTRAINT "Model_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "SourceRecord" DROP CONSTRAINT "SourceRecord_versionId_fkey";

-- DropForeignKey
ALTER TABLE "Specification" DROP CONSTRAINT "Specification_versionId_fkey";

-- DropForeignKey
ALTER TABLE "Version" DROP CONSTRAINT "Version_modelId_fkey";

-- DropForeignKey
ALTER TABLE "VersionColor" DROP CONSTRAINT "VersionColor_colorId_fkey";

-- DropForeignKey
ALTER TABLE "VersionColor" DROP CONSTRAINT "VersionColor_versionId_fkey";

-- DropTable
DROP TABLE "Brand";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Color";

-- DropTable
DROP TABLE "Image";

-- DropTable
DROP TABLE "Model";

-- DropTable
DROP TABLE "SourceRecord";

-- DropTable
DROP TABLE "Specification";

-- DropTable
DROP TABLE "Version";

-- DropTable
DROP TABLE "VersionColor";

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoria_principal" TEXT NOT NULL,
    "categoria_secundaria" TEXT,
    "tipo_veiculo" TEXT NOT NULL,
    "familia" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "ano_modelo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Ativo',
    "preco_inicial" DOUBLE PRECISION,
    "basePrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "observacao" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motorizacaoId" TEXT NOT NULL,
    "fontesId" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motorizacao" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "combustivel" TEXT NOT NULL,
    "potencia_cv" INTEGER NOT NULL,
    "torque_nm" INTEGER NOT NULL,
    "tracao" TEXT NOT NULL,
    "transmissao" TEXT NOT NULL,

    CONSTRAINT "Motorizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "disponibilidade" TEXT NOT NULL DEFAULT 'Disponível',
    "vehicleId" TEXT,

    CONSTRAINT "Cor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Imagem" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "vehicleId" TEXT,

    CONSTRAINT "Imagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fontes" (
    "id" TEXT NOT NULL,
    "modelo_url" TEXT NOT NULL,
    "versao_url" TEXT,
    "ficha_tecnica_url" TEXT,
    "cores_url" TEXT NOT NULL,

    CONSTRAINT "Fontes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_slug_key" ON "Vehicle"("slug");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_motorizacaoId_fkey" FOREIGN KEY ("motorizacaoId") REFERENCES "Motorizacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_fontesId_fkey" FOREIGN KEY ("fontesId") REFERENCES "Fontes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cor" ADD CONSTRAINT "Cor_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Imagem" ADD CONSTRAINT "Imagem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
