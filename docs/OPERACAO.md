# Operação — Ford One

Runbook prático para quem for operar o stack em produção (mesmo que "produção"
ainda seja este mesmo servidor local). Cobre os 3 itens que estavam pendentes
antes de qualquer domínio real receber tráfego: credenciais, backup e TLS.

## 1. Rotação de credenciais

O admin inicial e o usuário do Postgres foram rotacionados em 2026-09-13 (as
senhas de demonstração documentadas no handoff original — `AdminFord@2026` e
`postgres:postgres` — não são mais válidas). As senhas atuais vivem só nos
arquivos `.env` (nunca commitados — ver `.gitignore`).

### Trocar a senha do admin novamente

1. Gere uma senha forte: `openssl rand -base64 18`
2. Rode um script one-off (não fica no repo) pra atualizar o hash no banco,
   usando o mesmo `argon2id` que o app usa — copie o padrão de
   `prisma/seed.ts` (`hashSenha`), aponte `DATABASE_URL` pro banco certo, e
   chame `prisma.colaborador.update({ where: { email }, data: { senha: hash } })`.
   Simplesmente mudar `ADMIN_SENHA` no `.env` **não** atualiza um usuário que
   já existe — o seed só define a senha na primeira criação (`upsert` com
   `update: {}`).
3. Atualize `ADMIN_SENHA` no `.env` da raiz (documentação/próximos seeds).

### Trocar a senha do Postgres

1. Gere uma senha forte: `openssl rand -base64 24`
2. Com o container rodando: `podman exec ford-postgres psql -U postgres -d postgres -c "ALTER USER postgres WITH PASSWORD 'nova-senha';"`
3. Atualize `POSTGRES_PASSWORD` no `.env` da raiz e `DATABASE_URL` no
   `ford-scrapper-service/.env` (dev local).
4. `podman compose up -d backend` — o `docker-compose.yaml` monta
   `DATABASE_URL` a partir de `POSTGRES_USER`/`POSTGRES_PASSWORD`, então só
   precisa recriar o container do backend, não do Postgres.

As senhas de demonstração dos usuários GERENTE/FUNCIONARIO
(`ricardo.costa@ford.com.br` / `patricia.oliveira@ford.com.br`, seed em
`prisma/seed.ts`) continuam com senha previsível de propósito — servem pra
demonstração de cada papel pro cliente. Trocar antes de qualquer uso com dado
real de cliente.

## 2. Backup e restore do Postgres

Scripts em `scripts/backup-db.sh` e `scripts/restore-db.sh`. Os dumps ficam
em `../backups/` (fora dos repositórios git, não são código).

- **Backup manual**: `./scripts/backup-db.sh`
- **Backup agendado**: instalado via `crontab` do host, todo dia às 03:00:
  ```
  0 3 * * * /mnt/Programas/Projetos/FORD/ford-scrapper-service/scripts/backup-db.sh >> /mnt/Programas/Projetos/FORD/backups/backup.log 2>&1
  ```
  Confirme que está ativo com `crontab -l`. Retenção padrão: 14 dias (ajustável via `RETENTION_DAYS`).
- **Restore**: `./scripts/restore-db.sh backups/ford_AAAAMMDD_HHMMSS.sql.gz`
  — pede confirmação explícita antes de apagar o schema atual.

Recomendação adicional (fora do escopo automatizável por aqui): copiar
periodicamente o conteúdo de `../backups/` pra fora desta máquina (outro
disco, storage na nuvem) — um backup que mora só no mesmo disco do banco não
protege contra falha de disco.

## 3. TLS

O stack roda atrás de um proxy Caddy (`caddy/Caddyfile`) que já está no
`docker-compose.yaml`. Hoje, sem domínio real:

- HTTPS local com certificado autoassinado em `https://localhost:8443`
  (portal), `:8444` (dealership), `:8445` (API) — acesse sempre por
  `localhost`, nunca por IP (127.0.0.1), pois o certificado é emitido
  especificamente pro hostname `localhost` e o TLS depende de SNI pra
  escolher o certificado certo.
- As portas HTTP diretas (8080/8081/3000) continuam funcionando em paralelo
  — nada foi removido do fluxo atual.

### Quando houver um domínio real

1. Aponte o DNS do domínio (e subdomínios, se usar um por serviço) pro IP
   deste servidor.
2. Em `caddy/Caddyfile`, troque `localhost:8443` (e as outras duas linhas)
   pelo domínio real, e **remova** a linha `tls internal` de cada bloco.
3. Em `docker-compose.yaml`, publique `"443:443"` e `"80:80"` no serviço
   `caddy` (hoje ficam de fora).
4. Rootless Podman não liga em portas < 1024 por padrão. Ou rode
   `sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80` (e persista em
   `/etc/sysctl.conf`), ou rode o Podman como root pra esse serviço.
5. `podman compose up -d caddy` — o Caddy detecta que não é mais um hostname
   local e emite certificado real via Let's Encrypt automaticamente (nenhuma
   config manual de certificado é necessária).
6. Opcional, mais seguro: pare de publicar as portas HTTP diretas
   (8080/8081/3000) pro mundo externo, deixando só o Caddy exposto — os
   frontends precisariam ser reconstruídos com `VITE_API_BASE_URL` apontando
   pro domínio HTTPS da API em vez de `http://localhost:3000/api`.
