-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "vehiclesFound" INTEGER NOT NULL DEFAULT 0,
    "vehiclesSaved" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vehicle_categoria_principal_idx" ON "Vehicle"("categoria_principal");

-- CreateIndex
CREATE INDEX "Vehicle_modelo_idx" ON "Vehicle"("modelo");

-- CreateIndex
CREATE INDEX "Vehicle_familia_idx" ON "Vehicle"("familia");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");
