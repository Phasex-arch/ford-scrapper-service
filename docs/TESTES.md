# 04 — Testes automatizados

> Critério: **Testes Automatizados (15%)** — principais comportamentos da API, cenários de sucesso, erro e
> acesso não autorizado, e evidência da execução e do resultado.

## Como executar

```bash
cd ford-scrapper-service
npm install
npm test          # Jest + ts-jest (ESM) — não precisa de banco nem de servidor no ar
npx tsc --noEmit  # checagem de tipos (sem erros)
```

## Resultado da execução

**7 suítes · 47 testes · 47 passaram · 0 falhas** (execução de 25/09/2026).
Lista completa, teste a teste, em [`evidencias/npm-test.txt`](./evidencias/npm-test.txt).

| Suíte | Testes | Tipo | O que cobre |
|---|---|---|---|
| `src/http/api-http.spec.ts` | **20** | **HTTP (supertest)** | Autenticação, JWT, RBAC, erros e status codes **pela API de verdade** (abaixo) |
| `auth.service.spec.ts` | 6 | Unitário | Login válido/inválido/inativo/inexistente, troca de código de sessão (uso único) |
| `colaborador.service.spec.ts` | 6 | Unitário | Cadastro com hash, conflito de e-mail/CPF/registro (409), exclusão lógica |
| `dashboard.service.spec.ts` | 9 | Unitário | Cálculo de variações, conversão sem divisão por zero |
| `public-lead.service.spec.ts` | 4 | Unitário | Lead público, urgência derivada do valor, falha do e-mail |
| `vehicle.service.spec.ts` / `scrapper.service.spec.ts` | 2 | Unitário | Provedores instanciam |

## Testes HTTP (`src/http/api-http.spec.ts`)

Sobem os **controllers reais** (Auth, Health, Cliente, AuditLog) com a **pilha real de segurança** —
`JwtAuthGuard` global, `RolesGuard`, `JwtStrategy`, `ThrottlerGuard`, `ValidationPipe` e
`HttpExceptionFilter` — trocando apenas o banco por dublês. Cada teste faz uma requisição HTTP e confere
status e corpo (incluindo o formato padronizado de erro).

| Categoria | Cenário | Esperado |
|---|---|---|
| **Sucesso** | `GET /health` sem token | 200 |
| | Login válido | 200, `accessToken`, JWT com `sub`/`role` e `exp − iat = 3600 s` |
| | `GET /auth/me` com token | 200 |
| | FUNCIONARIO lista clientes | 200 + envelope de paginação |
| | GERENTE `DELETE /clientes/:id` | 204 sem corpo |
| | ADMIN `GET /audit-log` | 200 |
| | `POST /clientes` válido | 201 |
| **Erro** | Login com senha errada | 401 (formato padronizado) |
| | Login com e-mail inexistente | 401 com a **mesma** mensagem (não vaza existência) |
| | Login com e-mail malformado + campo extra | 400, `message` em lista |
| | `GET /clientes/:uuid` inexistente | 404 `Cliente nao encontrado` |
| | `GET /clientes/123` | 400 (UUID inválido) |
| | `POST /clientes` com corpo inválido | 400 com todos os campos inválidos |
| | 6 logins errados no mesmo minuto | 429 |
| **Não autorizado (401)** | Sem token | 401 |
| | Token malformado | 401 |
| | Token assinado com **outro segredo** | 401 |
| | Token **expirado** | 401 `Nao autenticado` |
| | Colaborador **desativado** depois de receber o token | 401 |
| **Sem permissão (403)** | FUNCIONARIO `DELETE /clientes/:id` | 403 |
| | GERENTE `GET /audit-log` (só ADMIN) | 403 |

## Evidência contra a API rodando

Além do Jest, os mesmos cenários foram executados com `curl` contra o stack local (banco real, 3 perfis reais):
[`evidencias/curl-auth.txt`](./evidencias/curl-auth.txt) — inclui o payload decodificado do JWT
(`duracao_horas: 8.0`), os 401/403/404/400/429 e o resumo do Swagger publicado.
O arquivo [`requests.http`](../requests.http) traz as mesmas
requisições prontas para reexecutar (VS Code REST Client).

## Outras melhorias feitas nesta sprint

- Tipagem dos mocks dos specs antigos corrigida: `npx tsc --noEmit` passou de 20+ erros para **0**.
- Removido o `test/app.e2e-spec.ts` do template do Nest (esperava `"Hello World!"` numa rota que não existe e
  exigia banco real); a suíte HTTP acima o substitui.
