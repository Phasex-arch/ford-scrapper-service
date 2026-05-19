-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GERENTE', 'FUNCIONARIO');

-- CreateEnum
CREATE TYPE "ClienteStatus" AS ENUM ('ATIVO', 'INATIVO', 'POTENCIAL');

-- CreateEnum
CREATE TYPE "CondicaoVeiculo" AS ENUM ('NOVO', 'SEMINOVO');

-- CreateEnum
CREATE TYPE "SegmentoVeiculo" AS ENUM ('SUV', 'PICAPE', 'SEDAN', 'HATCH', 'OUTRO');

-- CreateEnum
CREATE TYPE "FinanciamentoStatus" AS ENUM ('APROVADO', 'ANALISE', 'PENDENTE', 'REPROVADO');

-- CreateEnum
CREATE TYPE "LeadUrgencia" AS ENUM ('URGENTE', 'ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "OrdemServicoStatus" AS ENUM ('PREVISTO', 'ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "OrdemServicoPrioridade" AS ENUM ('OK', 'RISCO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "TecnicoStatus" AS ENUM ('LIVRE', 'OCUPADO', 'PAUSA', 'AUSENTE');

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "registro" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'FUNCIONARIO',
    "senha" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "statusCode" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ultimaVisita" TIMESTAMP(3),
    "status" "ClienteStatus" NOT NULL DEFAULT 'ATIVO',
    "veiculosCount" INTEGER NOT NULL DEFAULT 0,
    "ltv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "iniciais" TEXT NOT NULL,
    "segmento" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avaliacao" (
    "id" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "detalhe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Avaliacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstoqueVeiculo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "versao" TEXT NOT NULL,
    "ano" TEXT NOT NULL,
    "motor" TEXT NOT NULL,
    "transmissao" TEXT NOT NULL,
    "condicao" "CondicaoVeiculo" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Disponivel',
    "preco" DOUBLE PRECISION NOT NULL,
    "segmento" "SegmentoVeiculo" NOT NULL,
    "cor" TEXT NOT NULL,
    "imagem" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "km" TEXT,
    "opcionais" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstoqueVeiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Financiamento" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "iniciais" TEXT NOT NULL,
    "veiculo" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "entrada" DOUBLE PRECISION NOT NULL,
    "prazo" INTEGER NOT NULL,
    "taxa" DOUBLE PRECISION NOT NULL,
    "parcela" DOUBLE PRECISION NOT NULL,
    "status" "FinanciamentoStatus" NOT NULL DEFAULT 'ANALISE',
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Financiamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "iniciais" TEXT NOT NULL,
    "veiculoInteresse" TEXT NOT NULL,
    "necessidade" TEXT NOT NULL,
    "urgencia" "LeadUrgencia" NOT NULL DEFAULT 'MEDIA',
    "valorEstimado" DOUBLE PRECISION NOT NULL,
    "telefone" TEXT NOT NULL,
    "insight" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "indicador" TEXT NOT NULL,
    "atual" DOUBLE PRECISION NOT NULL,
    "alvo" DOUBLE PRECISION NOT NULL,
    "unidade" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "lowerIsBetter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemServico" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "veiculo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tecnico" TEXT NOT NULL,
    "prazo" TEXT NOT NULL,
    "prioridade" "OrdemServicoPrioridade" NOT NULL DEFAULT 'OK',
    "valor" TEXT NOT NULL,
    "status" "OrdemServicoStatus" NOT NULL DEFAULT 'PREVISTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tecnico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "iniciais" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "status" "TecnicoStatus" NOT NULL DEFAULT 'LIVRE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tecnico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_cpf_key" ON "Colaborador"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_email_key" ON "Colaborador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_registro_key" ON "Colaborador"("registro");

-- CreateIndex
CREATE INDEX "Colaborador_email_idx" ON "Colaborador"("email");

-- CreateIndex
CREATE INDEX "Colaborador_registro_idx" ON "Colaborador"("registro");

-- CreateIndex
CREATE INDEX "Colaborador_ativo_idx" ON "Colaborador"("ativo");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_resource_idx" ON "AuditLog"("resource");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "Cliente"("codigo");

-- CreateIndex
CREATE INDEX "Cliente_status_idx" ON "Cliente"("status");

-- CreateIndex
CREATE INDEX "Cliente_segmento_idx" ON "Cliente"("segmento");

-- CreateIndex
CREATE INDEX "Cliente_nome_idx" ON "Cliente"("nome");

-- CreateIndex
CREATE INDEX "Avaliacao_nota_idx" ON "Avaliacao"("nota");

-- CreateIndex
CREATE UNIQUE INDEX "EstoqueVeiculo_codigo_key" ON "EstoqueVeiculo"("codigo");

-- CreateIndex
CREATE INDEX "EstoqueVeiculo_modelo_idx" ON "EstoqueVeiculo"("modelo");

-- CreateIndex
CREATE INDEX "EstoqueVeiculo_condicao_idx" ON "EstoqueVeiculo"("condicao");

-- CreateIndex
CREATE INDEX "EstoqueVeiculo_status_idx" ON "EstoqueVeiculo"("status");

-- CreateIndex
CREATE INDEX "EstoqueVeiculo_segmento_idx" ON "EstoqueVeiculo"("segmento");

-- CreateIndex
CREATE UNIQUE INDEX "Financiamento_codigo_key" ON "Financiamento"("codigo");

-- CreateIndex
CREATE INDEX "Financiamento_status_idx" ON "Financiamento"("status");

-- CreateIndex
CREATE INDEX "Financiamento_clienteNome_idx" ON "Financiamento"("clienteNome");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_codigo_key" ON "Lead"("codigo");

-- CreateIndex
CREATE INDEX "Lead_urgencia_idx" ON "Lead"("urgencia");

-- CreateIndex
CREATE INDEX "Lead_clienteNome_idx" ON "Lead"("clienteNome");

-- CreateIndex
CREATE UNIQUE INDEX "Meta_codigo_key" ON "Meta"("codigo");

-- CreateIndex
CREATE INDEX "Meta_indicador_idx" ON "Meta"("indicador");

-- CreateIndex
CREATE INDEX "Meta_periodo_idx" ON "Meta"("periodo");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemServico_numero_key" ON "OrdemServico"("numero");

-- CreateIndex
CREATE INDEX "OrdemServico_status_idx" ON "OrdemServico"("status");

-- CreateIndex
CREATE INDEX "OrdemServico_tecnico_idx" ON "OrdemServico"("tecnico");

-- CreateIndex
CREATE INDEX "Tecnico_status_idx" ON "Tecnico"("status");

-- CreateIndex
CREATE INDEX "Tecnico_especialidade_idx" ON "Tecnico"("especialidade");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Colaborador"("id") ON DELETE SET NULL ON UPDATE CASCADE;
