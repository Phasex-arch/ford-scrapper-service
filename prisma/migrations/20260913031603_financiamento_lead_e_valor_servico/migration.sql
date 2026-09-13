/*
  Warnings:

  - Changed the type of `valor` on the `OrdemServico` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Financiamento" ADD COLUMN     "leadId" TEXT;

-- AlterTable: "R$ 1.840" vira 1840 (remove tudo que nao for digito antes de trocar o tipo,
-- preservando os valores existentes em vez de descartar a coluna)
ALTER TABLE "OrdemServico" ADD COLUMN "valor_tmp" DOUBLE PRECISION;
UPDATE "OrdemServico" SET "valor_tmp" = NULLIF(regexp_replace("valor", '[^0-9]', '', 'g'), '')::DOUBLE PRECISION;
ALTER TABLE "OrdemServico" DROP COLUMN "valor";
ALTER TABLE "OrdemServico" RENAME COLUMN "valor_tmp" TO "valor";
ALTER TABLE "OrdemServico" ALTER COLUMN "valor" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Financiamento_leadId_idx" ON "Financiamento"("leadId");

-- AddForeignKey
ALTER TABLE "Financiamento" ADD CONSTRAINT "Financiamento_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
