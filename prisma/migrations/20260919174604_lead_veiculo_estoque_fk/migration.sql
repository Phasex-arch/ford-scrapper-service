-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "estoqueVeiculoId" TEXT;

-- CreateIndex
CREATE INDEX "Lead_estoqueVeiculoId_idx" ON "Lead"("estoqueVeiculoId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_estoqueVeiculoId_fkey" FOREIGN KEY ("estoqueVeiculoId") REFERENCES "EstoqueVeiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

