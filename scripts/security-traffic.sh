#!/usr/bin/env bash
# Gera tráfego de segurança para popular o dashboard e disparar os alertas
# (evidência da Sprint 3 — Cyber, atividade 3).
#
#   ADMIN_SENHA=... [FUNC_EMAIL=... FUNC_SENHA=...] scripts/security-traffic.sh
#
# Fase 1: 5 logins falhos → security_event brute_force_suspected (alerta);
#         o 6º esbarra no @Throttle do login (5/min) → 429.
# Fase 2: espera a janela do throttle zerar (61s) e gera tráfego legítimo,
#         401 com token inválido e 403 (FUNCIONARIO em /audit-log, se houver
#         credenciais).
set -euo pipefail

API="${API:-http://localhost:3000/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@ford.com.br}"
: "${ADMIN_SENHA:?defina ADMIN_SENHA (a mesma usada no seed)}"

status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
login() {
  curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"senha\":\"$2\"}"
}
token_of() { login "$1" "$2" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p'; }

echo "== Fase 1: brute force em $ADMIN_EMAIL"
for i in 1 2 3 4 5 6; do
  code=$(status -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"senha\":\"errada-$i\"}")
  echo "  tentativa $i → $code"
done

echo "== Aguardando 61s a janela do throttle do login..."
sleep 61

echo "== Fase 2: tráfego legítimo e negado"
TOKEN=$(token_of "$ADMIN_EMAIL" "$ADMIN_SENHA")
[ -n "$TOKEN" ] || { echo "login do admin falhou — rodou o seed?" >&2; exit 1; }
for _ in $(seq 1 10); do
  echo "  GET /clientes (admin) → $(status "$API/clientes" -H "Authorization: Bearer $TOKEN")"
done
for _ in $(seq 1 5); do
  echo "  GET /clientes (token inválido) → $(status "$API/clientes" -H 'Authorization: Bearer isso.nao.e-um-jwt')"
done

if [ -n "${FUNC_EMAIL:-}" ] && [ -n "${FUNC_SENHA:-}" ]; then
  FTOKEN=$(token_of "$FUNC_EMAIL" "$FUNC_SENHA")
  for _ in $(seq 1 3); do
    echo "  GET /audit-log (FUNCIONARIO) → $(status "$API/audit-log" -H "Authorization: Bearer $FTOKEN")"
  done
else
  echo "  (sem FUNC_EMAIL/FUNC_SENHA: pulando o cenário de 403)"
fi

echo "== Pronto. Veja o Grafana (dashboard 'Ford One — Segurança da API') e"
echo "   http://localhost:9090/alerts (BruteForceSuspected deve estar firing)."
