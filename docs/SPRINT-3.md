# Sprint 3 — Arquitetura orientada a serviços e web services

Projeto **Ford One**
(portal público + painel da concessionária + esta API REST em NestJS/PostgreSQL).

## Onde está cada critério

| Critério (peso) | Documento | Código / evidência |
|---|---|---|
| **Arquitetura da solução (20%)** — diagrama, responsabilidades, fluxo de comunicação e autenticação | [architecture/SOLUCAO.md](./architecture/SOLUCAO.md) (+ [DIAGRAMS.md](./architecture/DIAGRAMS.md)) | Camadas `presentation/application/infrastructure` em `src/<módulo>/`; pipeline em `src/main.ts` e `src/app.module.ts` |
| **Autenticação e autorização (20%)** — controle de acesso, endpoints públicos/protegidos, perfis | [AUTENTICACAO-JWT.md](./AUTENTICACAO-JWT.md) | `src/auth/`, `@Roles`/`@Public`; [evidencias/curl-auth.txt](./evidencias/curl-auth.txt) |
| **JWT (15%)** — geração/validação, proteção dos recursos, expiração | [AUTENTICACAO-JWT.md](./AUTENTICACAO-JWT.md#2-jwt-como-o-token-funciona) | `src/auth/auth.module.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`; payload real (8h) em [evidencias/curl-auth.txt](./evidencias/curl-auth.txt) |
| **Maturidade REST nível 2 (20%)** — recursos, métodos HTTP, status codes | [REST.md](./REST.md) | Matriz das 88 operações e tabela de status; controllers em `src/*/presentation/` |
| **Testes automatizados (15%)** — sucesso, erro, não autorizado, evidência | [TESTES.md](./TESTES.md) | `src/http/api-http.spec.ts` (20 testes HTTP) + specs de service; [evidencias/npm-test.txt](./evidencias/npm-test.txt): 7 suítes, 47 testes, 0 falhas |
| **Documentação e tratamento de erros (10%)** — OpenAPI, erro padronizado, README | [ERROS-E-SWAGGER.md](./ERROS-E-SWAGGER.md) | Swagger em `/api/docs`; `src/common/swagger/`, `src/common/filters/http-exception.filter.ts`; [README](../README.md) |

## Como executar e testar

Instalação, variáveis de ambiente, execução local e via Docker Compose estão no [README](../README.md).
Resumo:

```bash
npm install
cp .env.example .env     # defina JWT_SECRET (>= 32 caracteres) e as senhas dos usuários seed
docker compose up -d postgres
npm run prisma:generate && npx prisma migrate deploy
npm run start:dev        # API em http://localhost:3000/api · Swagger em /api/docs

npm test                 # 47 testes (unitários + HTTP), sem precisar de banco
npx tsc --noEmit         # checagem de tipos
```

Dados de demonstração (opcional): `docker exec -i <container-do-postgres> psql -U postgres -d postgres < prisma/seed_full.sql` (`ford-scrapper-postgres` neste repo; `ford-postgres` no compose completo do workspace).

Usuários de teste (senha = variáveis `*_SENHA` do `.env`): `admin@ford.com.br` (ADMIN),
`ricardo.costa@ford.com.br` (GERENTE), `patricia.oliveira@ford.com.br` (FUNCIONARIO).

Requisições prontas (incluindo 401/403/404): [`requests.http`](../requests.http).
Produção: https://ford-backend-pdvb.onrender.com/api/docs

## O que foi ajustado nesta sprint

- **Novo** `src/http/api-http.spec.ts` — 20 testes HTTP: sucesso, erro, 401, 403, 404, 429.
- **Swagger:** decorator `@ApiStandardErrors()` (401/403/404 + schema de erro padronizado) nos 16
  controllers protegidos; `@ApiProperty` nos DTOs de query do catálogo.
- **`requests.http`** reescrito (apontava para `/api/v1`, inexistente).
- **README** corrigido: tabela de endpoints com a proteção real e seção "Autenticação e autorização".
- **Testes:** mocks tipados (`tsc` de 20+ erros para 0); removido o e2e quebrado do template do Nest.
