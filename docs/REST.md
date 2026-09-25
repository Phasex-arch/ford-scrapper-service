# 03 — Maturidade REST (nível 2 de Richardson)

> Critério: **Maturidade REST — Nível 2 (20%)** — APIs orientadas a recursos, uso adequado dos métodos
> HTTP e status codes coerentes com cada operação.

## 1. O que é o nível 2 e como a API se enquadra

| Nível | Exigência | Situação |
|---|---|---|
| 0 | Um endpoint só, tudo via `POST` | Superado |
| 1 | **Recursos** com URLs próprias | ✅ `/clientes`, `/leads`, `/servicos`, `/estoque`, `/financiamentos`... |
| 2 | **Verbos HTTP** com a semântica correta + **status codes** coerentes | ✅ (esta entrega) |
| 3 | HATEOAS (links de navegação nas respostas) | Não implementado — a rubrica pede até o nível 2 |

## 2. Recursos e métodos

- **URLs são substantivos no plural**, hierárquicas quando há relação de posse:
  `/clientes/:uuid`, `/clientes/:clienteId/veiculos` (veículos *de* um cliente), `/veiculos-cliente/:id`.
- **Prefixo único** `/api` (sem versionamento na URL); identificação por UUID no caminho.
- **Sem verbos nos caminhos** para o CRUD; o verbo é o método HTTP.

| Método | Uso na API | Idempotente | Qtd. de operações |
|---|---|---|---|
| `GET` | Ler (lista paginada ou item). **Nunca** altera estado | Sim | 44 |
| `POST` | Criar recurso (`201`) e ações que não cabem num CRUD (`/estoque/:uuid/reservar`) | Não | 19 |
| `PATCH` | Atualização **parcial** (o painel só manda os campos alterados) | Sim | 14 |
| `DELETE` | Remover (`204`, sem corpo) | Sim | 11 |
| `PUT` | Não usado — todas as edições são parciais, então `PATCH` é o verbo correto | — | 0 |

Coleções aceitam **filtros e paginação por query string** (`?page=1&limit=20&status=ATIVO&search=...`) e
devolvem sempre o mesmo envelope (`src/common/dto/pagination.dto.ts`):

```json
{ "pagination": { "total": 13, "page": 1, "limit": 1, "totalPages": 13, "hasNext": true, "hasPrev": false },
  "data": [ ... ] }
```

### Exceções assumidas (e por quê)

| Caminho | Motivo |
|---|---|
| `POST /estoque/:uuid/reservar`, `/liberar-reserva`, `POST /leads/:uuid/contato` | Ações de negócio sobre um recurso (com efeitos colaterais: prazo de reserva, marca de contato) — modeladas como `POST` em sub-recurso de ação, padrão aceito quando a operação não é CRUD. |
| `PATCH /auth/change-password`, `POST /auth/exchange(-code)` | Operações de conta/sessão, não recursos persistidos. |
| `GET /scrapper/ford` | Dispara coleta externa (nome herdado do módulo de scraping). Restrito a ADMIN/GERENTE. |

## 3. Status codes usados

| Código | Quando | Exemplo real |
|---|---|---|
| **200 OK** | Leitura ou atualização bem-sucedida; login | `GET /clientes`, `PATCH /clientes/:id`, `POST /auth/login` |
| **201 Created** | `POST` que cria recurso | `POST /clientes`, `POST /public/leads` |
| **204 No Content** | `DELETE` bem-sucedido (sem corpo) | `DELETE /clientes/:id` (GERENTE) |
| **400 Bad Request** | Corpo/parâmetro inválido (DTO, UUID malformado) | `GET /clientes/123`, login com e-mail inválido |
| **401 Unauthorized** | Sem token, token inválido ou expirado, credencial errada | `GET /clientes` sem `Authorization` |
| **403 Forbidden** | Autenticado, mas o perfil não pode | `GET /audit-log` como FUNCIONARIO |
| **404 Not Found** | Recurso inexistente | `GET /clientes/1111…` |
| **409 Conflict** | Violação de unicidade (código, e-mail ou CPF duplicado) | criar lead ou item de estoque com código já existente |
| **429 Too Many Requests** | Limite de taxa excedido | 6º login errado no minuto |
| **500 / 503** | Falha interna / dependência indisponível (ex.: e-mail não configurado) | mensagem genérica, sem stack trace |

Todos os erros (4xx/5xx) saem no **mesmo formato** — ver [ERROS-E-SWAGGER.md](./ERROS-E-SWAGGER.md).
Cada linha da tabela acima foi exercitada nos testes ([TESTES.md](./TESTES.md)) e/ou em chamadas reais
([`evidencias/curl-auth.txt`](./evidencias/curl-auth.txt)).

<a id="matriz-completa"></a>
## 4. Matriz completa: endpoint × acesso × status de sucesso

Gerada a partir dos controllers (`@Roles`, `@Public`, `@HttpCode`) e conferida contra o OpenAPI publicado em
`/api/docs-json` (88 operações). "JWT (qualquer perfil)" = exige token, sem restrição de perfil.

| Recurso | Método | Caminho (`/api` + …) | Acesso | Sucesso |
|---|---|---|---|---|
| Agendamentos | GET | `/agendamentos` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Agendamentos | POST | `/agendamentos` | ADMIN, GERENTE, FUNCIONARIO | 201 |
| Agendamentos | GET | `/agendamentos/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Agendamentos | PATCH | `/agendamentos/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Agendamentos | DELETE | `/agendamentos/:uuid` | ADMIN, GERENTE | 204 |
| Auditoria | GET | `/audit-log` | ADMIN | 200 |
| Autenticação | PATCH | `/auth/change-password` | JWT (qualquer perfil) | 200 |
| Autenticação | POST | `/auth/exchange` | Pública | 200 |
| Autenticação | POST | `/auth/exchange-code` | JWT (qualquer perfil) | 200 |
| Autenticação | POST | `/auth/login` | Pública | 200 |
| Autenticação | GET | `/auth/me` | JWT (qualquer perfil) | 200 |
| Autenticação | PATCH | `/auth/me` | JWT (qualquer perfil) | 200 |
| Avaliações | GET | `/avaliacoes` | Pública | 200 |
| Avaliações | POST | `/avaliacoes` | Pública | 201 |
| Avaliações | GET | `/avaliacoes/:uuid` | Pública | 200 |
| Avaliações | PATCH | `/avaliacoes/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Avaliações | DELETE | `/avaliacoes/:uuid` | ADMIN, GERENTE | 204 |
| Avaliações | GET | `/avaliacoes/stats` | Pública | 200 |
| Avaliações | GET | `/avaliacoes/todas` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Clientes | GET | `/clientes` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Clientes | POST | `/clientes` | ADMIN, GERENTE, FUNCIONARIO | 201 |
| Clientes | GET | `/clientes/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Clientes | PATCH | `/clientes/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Clientes | DELETE | `/clientes/:uuid` | ADMIN, GERENTE | 204 |
| Clientes | GET | `/clientes/:uuid/historico` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Colaboradores | GET | `/colaboradores` | ADMIN, GERENTE | 200 |
| Colaboradores | POST | `/colaboradores` | ADMIN | 201 |
| Colaboradores | GET | `/colaboradores/:uuid` | ADMIN, GERENTE | 200 |
| Colaboradores | PATCH | `/colaboradores/:uuid` | ADMIN, GERENTE | 200 |
| Colaboradores | DELETE | `/colaboradores/:uuid` | ADMIN | 204 |
| Coleta de dados | GET | `/scrapper/ford` | ADMIN, GERENTE | 200 |
| Configurações | GET | `/configuracoes/concessionaria` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Configurações | PATCH | `/configuracoes/concessionaria` | ADMIN, GERENTE | 200 |
| Configurações | GET | `/configuracoes/seguranca` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Contato público | POST | `/public/leads` | Pública | 201 |
| Dashboard | GET | `/dashboard` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Dashboard | GET | `/dashboard/desempenho` | ADMIN, GERENTE | 200 |
| Dashboard | GET | `/dashboard/receita` | ADMIN, GERENTE | 200 |
| Estoque | GET | `/estoque` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Estoque | POST | `/estoque` | ADMIN, GERENTE | 201 |
| Estoque | GET | `/estoque/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Estoque | PATCH | `/estoque/:uuid` | ADMIN, GERENTE | 200 |
| Estoque | DELETE | `/estoque/:uuid` | ADMIN | 204 |
| Estoque | POST | `/estoque/:uuid/liberar-reserva` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Estoque | POST | `/estoque/:uuid/reservar` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Financiamentos | GET | `/financiamentos` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Financiamentos | POST | `/financiamentos` | ADMIN, GERENTE | 201 |
| Financiamentos | GET | `/financiamentos/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Financiamentos | PATCH | `/financiamentos/:uuid` | ADMIN, GERENTE | 200 |
| Financiamentos | DELETE | `/financiamentos/:uuid` | ADMIN | 204 |
| Histórico de veículos | GET | `/clientes/:clienteId/veiculos` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Histórico de veículos | POST | `/clientes/:clienteId/veiculos` | ADMIN, GERENTE | 201 |
| Histórico de veículos | GET | `/veiculos-cliente/:id` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Histórico de veículos | PATCH | `/veiculos-cliente/:id` | ADMIN, GERENTE | 200 |
| Histórico de veículos | DELETE | `/veiculos-cliente/:id` | ADMIN, GERENTE | 204 |
| Leads | GET | `/leads` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Leads | POST | `/leads` | ADMIN, GERENTE, FUNCIONARIO | 201 |
| Leads | GET | `/leads/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Leads | PATCH | `/leads/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Leads | DELETE | `/leads/:uuid` | ADMIN, GERENTE | 204 |
| Leads | POST | `/leads/:uuid/contato` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Metas | GET | `/metas` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Metas | POST | `/metas` | ADMIN, GERENTE | 201 |
| Metas | GET | `/metas/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Metas | PATCH | `/metas/:uuid` | ADMIN, GERENTE | 200 |
| Metas | DELETE | `/metas/:uuid` | ADMIN | 204 |
| Saúde | GET | `/health` | Pública | 200 |
| Serviços | GET | `/servicos` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Serviços | POST | `/servicos` | ADMIN, GERENTE, FUNCIONARIO | 201 |
| Serviços | GET | `/servicos/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Serviços | PATCH | `/servicos/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Serviços | DELETE | `/servicos/:uuid` | ADMIN, GERENTE | 204 |
| Sincronização | POST | `/sync` | ADMIN | 201 |
| Sincronização | GET | `/sync/history` | ADMIN, GERENTE | 200 |
| Técnicos | GET | `/tecnicos` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Técnicos | POST | `/tecnicos` | ADMIN, GERENTE | 201 |
| Técnicos | GET | `/tecnicos/:uuid` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Técnicos | PATCH | `/tecnicos/:uuid` | ADMIN, GERENTE | 200 |
| Técnicos | DELETE | `/tecnicos/:uuid` | ADMIN | 204 |
| Veículos | GET | `/vehicles` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Veículos | GET | `/vehicles/:identifier` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Veículos | GET | `/vehicles/categories` | JWT (qualquer perfil) | 200 |
| Veículos | GET | `/vehicles/colors` | JWT (qualquer perfil) | 200 |
| Veículos | GET | `/vehicles/models` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Veículos | GET | `/vehicles/search` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Veículos | GET | `/vehicles/sources` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Veículos | GET | `/vehicles/stats` | ADMIN, GERENTE, FUNCIONARIO | 200 |
| Veículos | GET | `/vehicles/versions` | ADMIN, GERENTE, FUNCIONARIO | 200 |
