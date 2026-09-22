-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "ordemServicoId" TEXT;

-- AlterTable
ALTER TABLE "Financiamento" ADD COLUMN     "estoqueVeiculoId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "clienteId" TEXT,
ADD COLUMN     "convertido" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Agendamento_ordemServicoId_key" ON "Agendamento"("ordemServicoId");

-- CreateIndex
CREATE INDEX "Financiamento_estoqueVeiculoId_idx" ON "Financiamento"("estoqueVeiculoId");

-- CreateIndex
CREATE INDEX "Lead_clienteId_idx" ON "Lead"("clienteId");

-- AddForeignKey
ALTER TABLE "Financiamento" ADD CONSTRAINT "Financiamento_estoqueVeiculoId_fkey" FOREIGN KEY ("estoqueVeiculoId") REFERENCES "EstoqueVeiculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

