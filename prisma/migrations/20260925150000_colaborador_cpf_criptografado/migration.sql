-- CPF do colaborador passa a ser gravado cifrado (AES-256-GCM, IV aleatório),
-- então a unicidade sai de "cpf" e vai para o blind index "cpfHash".
-- Linhas existentes ficam com cpfHash NULL e são cifradas pelo backfill no boot
-- (ColaboradorCpfBackfill).
DROP INDEX "Colaborador_cpf_key";

ALTER TABLE "Colaborador" ADD COLUMN "cpfHash" TEXT;

CREATE UNIQUE INDEX "Colaborador_cpfHash_key" ON "Colaborador"("cpfHash");
