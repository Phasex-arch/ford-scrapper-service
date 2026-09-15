-- AlterTable
ALTER TABLE "Meta" ADD COLUMN     "responsavelId" TEXT;

-- CreateIndex
CREATE INDEX "Meta_responsavelId_idx" ON "Meta"("responsavelId");

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
