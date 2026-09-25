#!/usr/bin/env bash
# backup-db.sh — dump completo do Postgres do Ford One, comprimido e CIFRADO
# (GPG simétrico AES-256, com verificação de integridade), com retenção
# automática. Pensado pra rodar via cron do host (ver docs/OPERACAO.md).
# O dump tem CPF (já cifrado), telefone e e-mail de clientes: nunca vai pro
# disco em claro.
#
# Uso:
#   ./scripts/backup-db.sh
#
# Variável obrigatória:
#   BACKUP_PASSPHRASE — senha do backup (openssl rand -base64 32). Guardar fora
#                       do servidor (cofre de senhas): sem ela o backup é inútil.
#
# Variáveis de ambiente opcionais:
#   BACKUP_DIR       — onde salvar os dumps (default: ../backups na raiz do projeto)
#   RETENTION_DAYS    — quantos dias manter backups antigos (default: 14)
#   POSTGRES_CONTAINER — nome do container (default: ford-postgres)
#   CONTAINER_CLI     — podman ou docker (default: podman)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-ford-postgres}"
CLI="${CONTAINER_CLI:-podman}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUT_FILE="$BACKUP_DIR/ford_${TIMESTAMP}.sql.gz.gpg"

if [ -z "${BACKUP_PASSPHRASE:-}" ]; then
  echo "Erro: defina BACKUP_PASSPHRASE — o backup não é gravado em claro." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
umask 077

if ! "$CLI" ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  echo "Erro: container '$POSTGRES_CONTAINER' não está rodando." >&2
  exit 1
fi

echo "Gerando dump de $POSTGRES_CONTAINER em $OUT_FILE ..."
"$CLI" exec "$POSTGRES_CONTAINER" pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" \
  | gzip \
  | gpg --batch --yes --quiet --symmetric --cipher-algo AES256 \
        --pinentry-mode loopback --passphrase-file /dev/fd/3 \
        --output "$OUT_FILE" 3<<<"$BACKUP_PASSPHRASE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "Backup concluído: $OUT_FILE ($SIZE)"

echo "Removendo backups com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -name 'ford_*.sql.gz*' -mtime "+$RETENTION_DAYS" -print -delete

echo "Backups atuais em $BACKUP_DIR:"
ls -lh "$BACKUP_DIR" | grep 'ford_' || echo "(nenhum)"
