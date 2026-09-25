#!/usr/bin/env bash
# restore-db.sh — restaura um dump gerado por backup-db.sh. DESTRUTIVO: apaga
# e recria o schema public antes de restaurar. Confirma antes de executar.
#
# Uso:
#   BACKUP_PASSPHRASE=... ./scripts/restore-db.sh caminho/para/ford_20260913_140000.sql.gz.gpg
#
# A decifragem acontece ANTES de apagar qualquer coisa: senha errada ou
# arquivo adulterado (o GPG verifica integridade) aborta sem tocar no banco.

set -euo pipefail

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-ford-postgres}"
CLI="${CONTAINER_CLI:-podman}"
FILE="${1:-}"

if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: BACKUP_PASSPHRASE=... $0 <arquivo.sql.gz.gpg>" >&2
  echo "Backups disponíveis:" >&2
  ls -1 "$(dirname "${BASH_SOURCE[0]}")/../../backups"/ford_*.sql.gz.gpg 2>/dev/null >&2 || echo "  (nenhum encontrado)" >&2
  exit 1
fi

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "Erro: defina BACKUP_PASSPHRASE." >&2
  exit 1
fi

# Decifra pra um temporário primeiro (fora do banco): valida senha e integridade.
PLAIN="$(mktemp)"
trap 'rm -f "$PLAIN"' EXIT
chmod 600 "$PLAIN"
if ! gpg --batch --quiet --decrypt --pinentry-mode loopback --passphrase-file /dev/fd/3 \
     "$FILE" 3<<<"$BACKUP_PASSPHRASE" | gunzip > "$PLAIN"; then
  echo "Erro: não foi possível decifrar $FILE (senha errada ou arquivo corrompido). Banco intocado." >&2
  exit 1
fi

if ! "$CLI" ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
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
"$CLI" exec "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "Restaurando $FILE ..."
"$CLI" exec -i "$POSTGRES_CONTAINER" psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" < "$PLAIN"

echo "Restauração concluída. Reinicie o backend para reconectar limpo:"
echo "  $CLI compose restart backend"
