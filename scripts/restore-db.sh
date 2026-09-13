#!/usr/bin/env bash
# restore-db.sh — restaura um dump gerado por backup-db.sh. DESTRUTIVO: apaga
# e recria o schema public antes de restaurar. Confirma antes de executar.
#
# Uso:
#   ./scripts/restore-db.sh caminho/para/ford_20260913_140000.sql.gz

set -euo pipefail

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-ford-postgres}"
FILE="${1:-}"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: $0 <arquivo.sql.gz>" >&2
  echo "Backups disponíveis:" >&2
  ls -1 "$(dirname "${BASH_SOURCE[0]}")/../../backups"/ford_*.sql.gz 2>/dev/null >&2 || echo "  (nenhum encontrado)" >&2
  exit 1
fi

if ! podman ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  echo "Erro: container '$POSTGRES_CONTAINER' não está rodando." >&2
  exit 1
fi

echo "ATENÇÃO: isso vai APAGAR todos os dados atuais de '${POSTGRES_DB:-postgres}' em $POSTGRES_CONTAINER"
echo "e restaurar a partir de: $FILE"
read -r -p "Digite 'restaurar' para confirmar: " CONFIRM
if [ "$CONFIRM" != "restaurar" ]; then
  echo "Cancelado."
  exit 1
fi

echo "Recriando schema public..."
podman exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Restaurando $FILE ..."
gunzip -c "$FILE" | podman exec -i "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}"

echo "Restauração concluída. Reinicie o backend para reconectar limpo:"
echo "  podman compose restart backend"
