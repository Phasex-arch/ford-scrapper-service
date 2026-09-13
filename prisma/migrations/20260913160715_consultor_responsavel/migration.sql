-- AlterTable
ALTER TABLE "Financiamento" ADD COLUMN     "responsavelId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "responsavelId" TEXT;

-- CreateIndex
CREATE INDEX "Financiamento_responsavelId_idx" ON "Financiamento"("responsavelId");

-- CreateIndex
CREATE INDEX "Lead_responsavelId_idx" ON "Lead"("responsavelId");

-- AddForeignKey
ALTER TABLE "Financiamento" ADD CONSTRAINT "Financiamento_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
