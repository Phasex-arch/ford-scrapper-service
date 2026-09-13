-- CreateTable
CREATE TABLE "ConfiguracaoConcessionaria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoConcessionaria_pkey" PRIMARY KEY ("id")
);
