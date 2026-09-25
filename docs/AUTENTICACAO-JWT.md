# 02 — Autenticação, autorização e JWT

> Critérios: **Autenticação e Autorização (20%)** e **JWT (15%)**.
> Todos os trechos abaixo citam o código real (este repositório (`ford-scrapper-service`)); as respostas de exemplo são
> capturas da API rodando localmente — ver [`evidencias/curl-auth.txt`](./evidencias/curl-auth.txt).

## 1. Autenticação (quem é você?)

**Endpoint:** `POST /api/auth/login` — `src/auth/presentation/auth.controller.ts` (`@Public`, `200`).

```http
POST /api/auth/login
{ "email": "admin@ford.com.br", "senha": "••••••••" }

200 → { "accessToken": "<JWT>", "user": { "id": "...", "email": "...", "role": "ADMIN", "nome": "..." } }
401 → credenciais inválidas (mesma mensagem para senha errada e e-mail inexistente)
400 → corpo inválido        429 → mais de 5 tentativas por minuto
```

Como o servidor decide (`src/auth/application/auth.service.ts`):

1. Busca o colaborador pelo e-mail; se não existe **ou** está inativo → `401 Credenciais invalidas`
   (mensagem única, para não revelar quais e-mails existem).
2. Confere a senha com **argon2id** (`memoryCost 19456, timeCost 2, parallelism 1`) — a senha nunca é
   guardada em texto puro nem de forma reversível.
3. Registra o evento (`login_success` / `login_failed`) no log de segurança, persistido na tabela de auditoria
   (`src/common/security/security-event.logger.ts`); 5 falhas do mesmo e-mail+IP em 5 min emitem o alerta
   `brute_force_suspected` no log.
4. Assina e devolve o JWT.

Proteção contra força bruta: `@Throttle` de **5 tentativas/min** no login e limite global de
**60 req/min** por IP (`ThrottlerGuard` em `src/app.module.ts`).

## 2. JWT (como o token funciona)

| Aspecto | Implementação | Onde |
|---|---|---|
| **Geração** | `JwtService.sign` no login/exchange, algoritmo **HS256**, segredo `JWT_SECRET` (a aplicação **não sobe** sem ele; em produção recusa segredo fraco/de exemplo) | `src/auth/auth.module.ts:20-34`, `src/main.ts` |
| **Conteúdo (payload)** | `sub` (id do colaborador), `email`, `role`, `nome`, `iat`, `exp` — **sem senha nem dado sensível** | `src/auth/domain/authenticated-user.ts` |
| **Expiração** | `JWT_EXPIRES_IN` (padrão e produção: **8h**). `ignoreExpiration: false` → token expirado é recusado | `auth.module.ts`, `jwt.strategy.ts` |
| **Validação** | `passport-jwt`, token no header `Authorization: Bearer`, verificação de assinatura + expiração | `src/auth/infrastructure/strategies/jwt.strategy.ts` |
| **Revalidação a cada request** | `validate()` **recarrega o colaborador no banco**: se foi desativado/removido → `401`; o `role` usado é o **atual** do banco, não o que estava dentro do token (rebaixar um ADMIN vale imediatamente) | `jwt.strategy.ts` (`validate`) |
| **Proteção dos recursos** | `JwtAuthGuard` registrado como `APP_GUARD` **global**: tudo exige token, exceto rotas marcadas `@Public()` (padrão seguro: esquecer o decorator **fecha** a rota, não abre) | `src/app.module.ts`, `jwt-auth.guard.ts` |
| **Falha** | sem token / malformado / assinatura errada / expirado → `401 Nao autenticado` (não revela o motivo; o motivo real — `expired_token` ou `invalid_token` — vai só para o log de segurança) | `jwt-auth.guard.ts` (`handleRequest`) |

Payload real de um token emitido pela API (capturado, sem a assinatura):

```json
{ "sub": "40fb6796-…", "email": "admin@ford.com.br", "role": "ADMIN", "nome": "Administrador Geral",
  "iat": 1790343064, "exp": 1790371864, "duracao_horas": 8.0 }
```

**Troca de sessão entre aplicações sem expor o JWT na URL:** o portal chama
`POST /auth/exchange-code` (autenticado) e recebe um código de **uso único que expira em 30 s**; o painel o
troca por um JWT em `POST /auth/exchange` (público, só funciona uma vez). Ver `exchange-code.service.ts`.

Fora de escopo (e assumido): não há *refresh token* nem *logout* no servidor — a sessão vale até `exp`
(8h) ou até o colaborador ser desativado (efeito imediato pela revalidação acima).

## 3. Autorização (o que você pode fazer?)

Três perfis (enum `Role` em `prisma/schema.prisma`), declarados **por rota** com `@Roles(...)` e
aplicados pelo `RolesGuard` (`src/auth/infrastructure/guards/roles.guard.ts`). Perfil sem permissão → `403`
`Permissao insuficiente para este recurso` + evento `access_denied` no log de segurança.

| Perfil | Pode | Não pode (exemplos verificados) |
|---|---|---|
| **FUNCIONARIO** | Operar o dia a dia: ler/criar/editar clientes, leads, agendamentos, ordens de serviço, estoque (ler/reservar), avaliações; ver o dashboard; consultar o catálogo | Excluir clientes/OS/agendamentos; ver Receita e Desempenho; gerenciar colaboradores; ler o log de auditoria |
| **GERENTE** | Tudo do FUNCIONARIO + excluir clientes/agendamentos/OS, cadastrar/editar estoque, ver Receita/Desempenho, listar/editar colaboradores, histórico de sincronização, `/scrapper/ford` | Criar/remover colaboradores; excluir itens de estoque; disparar sincronização; ler o log de auditoria |
| **ADMIN** | Tudo, incluindo criar/remover colaboradores, excluir estoque/técnicos/metas/financiamentos, `POST /sync` e `GET /audit-log` | — |

A matriz completa **endpoint × perfil** (88 operações, gerada a partir do código e conferida contra o
OpenAPI publicado) está em [REST.md](./REST.md#matriz-completa).

### Endpoints públicos × protegidos

| Públicos (sem token) | Protegidos |
|---|---|
| `GET /health` · `POST /auth/login` · `POST /auth/exchange` · `POST /public/leads` (formulário do portal) · `GET /avaliacoes`, `/avaliacoes/stats`, `/avaliacoes/:uuid` e `POST /avaliacoes` | **Todo o resto** — exigem `Authorization: Bearer <JWT>` e, conforme a rota, um dos perfis acima |

### Demonstração (respostas reais)

| Chamada | Resultado |
|---|---|
| `GET /api/clientes` sem token | `401 Nao autenticado` |
| `GET /api/clientes` com `Bearer isso.nao.e-um-jwt` | `401 Nao autenticado` |
| `GET /api/clientes?limit=1` como FUNCIONARIO | `200` (lista paginada) |
| `GET /api/audit-log` como FUNCIONARIO | `403 Permissao insuficiente para este recurso` |
| `GET /api/audit-log` como GERENTE | `403` |
| `GET /api/audit-log` como ADMIN | `200` |
| `DELETE /api/clientes/:id` como FUNCIONARIO | `403` |

Os mesmos cenários rodam automatizados em `src/http/api-http.spec.ts` — ver [TESTES.md](./TESTES.md).
