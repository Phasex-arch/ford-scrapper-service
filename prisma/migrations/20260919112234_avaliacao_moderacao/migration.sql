-- CreateEnum
CREATE TYPE "AvaliacaoStatus" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- AlterTable
ALTER TABLE "Avaliacao" ADD COLUMN     "status" "AvaliacaoStatus" NOT NULL DEFAULT 'PENDENTE';

-- Avaliações que já existiam antes da moderação existir estavam todas
-- publicamente visíveis — tratar como já aprovadas evita que a introdução
-- da moderação apague depoimentos reais que já estavam no ar.
UPDATE "Avaliacao" SET "status" = 'APROVADA';

-- CreateIndex
CREATE INDEX "Avaliacao_status_idx" ON "Avaliacao"("status");

