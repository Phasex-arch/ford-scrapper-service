#!/usr/bin/env bash
# backup-db.sh — dump completo do Postgres do Ford One, comprimido, com
# retenção automática. Pensado pra rodar via cron do host (ver docs/OPERACAO.md).
#
# Uso:
#   ./scripts/backup-db.sh
#
# Variáveis de ambiente opcionais:
#   BACKUP_DIR       — onde salvar os dumps (default: ../backups na raiz do projeto)
#   RETENTION_DAYS    — quantos dias manter backups antigos (default: 14)
#   POSTGRES_CONTAINER — nome do container (default: ford-postgres)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-ford-postgres}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/ford_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

if ! podman ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  echo "Erro: container '$POSTGRES_CONTAINER' não está rodando." >&2
  exit 1
fi

echo "Gerando dump de $POSTGRES_CONTAINER em $OUT_FILE ..."
podman exec "$POSTGRES_CONTAINER" pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" \
  | gzip > "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "Backup concluído: $OUT_FILE ($SIZE)"

echo "Removendo backups com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -name 'ford_*.sql.gz' -mtime "+$RETENTION_DAYS" -print -delete

echo "Backups atuais em $BACKUP_DIR:"
ls -lh "$BACKUP_DIR" | grep 'ford_' || echo "(nenhum)"
