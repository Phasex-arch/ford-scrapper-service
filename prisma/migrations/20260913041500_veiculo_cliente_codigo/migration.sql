-- AlterTable: tabela VeiculoCliente ainda esta vazia (criada na migracao
-- anterior), entao adicionar a coluna unique direto e seguro.
ALTER TABLE "VeiculoCliente" ADD COLUMN "codigo" TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX "VeiculoCliente_codigo_key" ON "VeiculoCliente"("codigo");
ALTER TABLE "VeiculoCliente" ALTER COLUMN "codigo" DROP DEFAULT;
