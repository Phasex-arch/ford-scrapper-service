-- AlterTable
ALTER TABLE "EstoqueVeiculo" ADD COLUMN     "reservadoAte" TIMESTAMP(3),
ADD COLUMN     "reservadoClienteId" TEXT;

-- CreateIndex
CREATE INDEX "EstoqueVeiculo_reservadoClienteId_idx" ON "EstoqueVeiculo"("reservadoClienteId");

-- AddForeignKey
ALTER TABLE "EstoqueVeiculo" ADD CONSTRAINT "EstoqueVeiculo_reservadoClienteId_fkey" FOREIGN KEY ("reservadoClienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

