# Arquitetura da Solucao

Este documento apresenta a arquitetura da API Ford Brasil em quatro vistas
complementares, atendendo aos requisitos das sprints de:

- **Arquitetura Orientada a Servicos e Web Services** (desenho de arquitetura,
  organizacao modular, separacao de camadas).
- **Cybersecurity** (defesa em profundidade, autenticacao, autorizacao,
  validacao, observabilidade e auditoria).

> Os diagramas usam [Mermaid](https://mermaid.js.org/). Tanto o GitHub quanto
> o VS Code (preview de Markdown) renderizam-nos nativamente.

---

## Stack

- **Runtime:** Node.js 22, ESM (`"type": "module"`)
- **Framework:** NestJS 11 (controllers, providers, modules, guards,
  interceptors, middlewares, pipes, exception filters)
- **Auth:** `@nestjs/jwt` + `@nestjs/passport` + Passport JWT (Bearer Token)
- **Hash:** `argon2` (Argon2id) para senhas
- **ORM:** Prisma 7 + `@prisma/adapter-pg`
- **Banco:** PostgreSQL 17
- **Validacao:** `class-validator` + `class-transformer` + `ValidationPipe`
  global
- **Seguranca:** `helmet`, `ThrottlerGuard` global, CORS configuravel,
  `HttpExceptionFilter` global, JWT global, RBAC por rota
- **Doc:** Swagger / OpenAPI em `/api/docs`
- **Observabilidade:** logs estruturados (JSON), `LoggingMiddleware`,
  `AuditInterceptor`, `SecurityEventLogger`, tabela `AuditLog`

---

## Vista 1 — Arquitetura em Camadas

Fluxo macro entre as camadas, sem detalhes de cada modulo.

```mermaid
flowchart TB
    Client["Cliente HTTP / Mobile / Swagger"]
    Presentation["Camada de Apresentacao<br/>Controllers REST"]
    CrossCutting["Cross-cutting<br/>Guards, Middlewares, Pipes, Interceptors"]
    Application["Camada de Aplicacao<br/>Services / Use Cases"]
    Infrastructure["Camada de Infraestrutura<br/>Repositories, JWT Strategy, Helpers"]
    Database[("PostgreSQL")]

    Client --> Presentation
    Presentation --> CrossCutting
    CrossCutting --> Application
    Application --> Infrastructure
    Infrastructure --> Database
```

**Princípios:**

1. **Presentation** so conhece **Application** (services).
2. **Application** so depende de **Infrastructure** via abstracoes
   (repositorios injetados).
3. **Infrastructure** isola Prisma/IO; nao vaza para a aplicacao.
4. **Cross-cutting** (guards, pipes, filtros, interceptors, middlewares)
   atua em todas as requisicoes.

---

## Vista 2 — Modulos como Servicos (SOA)

Cada bounded context e um modulo independente e reutilizavel.

```mermaid
flowchart LR
    subgraph core [Nucleo de Seguranca]
        Auth["Auth"]
        Colab["Colaborador"]
    end

    subgraph business [Servicos de Negocio]
        Cli["Cliente"]
        Est["Estoque"]
        Lea["Leads"]
        Fin["Financiamento"]
        Ser["Servicos OS"]
        Tec["Tecnicos"]
        Met["Metas"]
        Ava["Avaliacoes"]
        Das["Dashboard"]
    end

    subgraph catalog [Catalogo Ford]
        Veh["Vehicle"]
        Scr["Scrapper"]
    end

    subgraph shared [Compartilhado]
        Prisma["PrismaService"]
        Audit["AuditLog"]
        Common["CommonModule"]
    end

    core --> shared
    business --> shared
    catalog --> shared
```

| Modulo          | Rota base         | Metodos HTTP             | Acesso                                             |
| --------------- | ----------------- | ------------------------ | -------------------------------------------------- |
| Auth            | `/auth`           | GET, POST                | `POST /login` publico; `POST /register` ADMIN      |
| Colaboradores   | `/colaboradores`  | GET, POST, PATCH, DELETE | ADMIN/GERENTE (leitura), ADMIN (escrita)            |
| Clientes        | `/clientes`       | GET, POST, PATCH, DELETE | Autenticado (todos os papeis)                       |
| Estoque         | `/estoque`        | GET, POST, PATCH, DELETE | Autenticado, escrita ADMIN/GERENTE                  |
| Leads           | `/leads`          | GET, POST, PATCH, DELETE | Autenticado                                         |
| Financiamentos  | `/financiamentos` | GET, POST, PATCH, DELETE | Autenticado                                         |
| Servicos OS     | `/servicos`       | GET, POST, PATCH, DELETE | Autenticado                                         |
| Tecnicos        | `/tecnicos`       | GET, POST, PATCH, DELETE | Autenticado                                         |
| Metas           | `/metas`          | GET, POST, PATCH, DELETE | Autenticado                                         |
| Avaliacoes      | `/avaliacoes`     | GET, POST, PATCH, DELETE | **Publico** (GET/POST), update/delete autenticados  |
| Dashboard       | `/dashboard`      | GET                      | Autenticado                                         |
| Vehicles        | `/vehicles`       | GET                      | Catalogo Ford                                       |
| Sync / Scrapper | `/sync, /scrapper`| GET, POST                | ADMIN / GERENTE                                     |
| Health          | `/health`         | GET                      | Publico                                             |

**Convencao de metodos HTTP:**

| Metodo | Uso                        | Status de sucesso |
| ------ | -------------------------- | ----------------- |
| GET    | Leitura (lista ou detalhe) | 200               |
| POST   | Criacao de recurso         | 201               |
| PATCH  | Atualizacao parcial        | 200               |
| DELETE | Remocao                    | 200               |

O projeto nao usa PUT — PATCH e suficiente para atualizacoes parciais. Todas as
rotas vivem sob o prefixo global `/api/v1`.

---

## Vista 3 — Fluxo de uma Requisicao Autenticada

Sequencia atravessada por uma requisicao `POST /clientes` por um colaborador
com role `GERENTE`.

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant LM as LoggingMiddleware
    participant TG as ThrottlerGuard
    participant JG as JwtAuthGuard
    participant RG as RolesGuard
    participant VP as ValidationPipe
    participant Ctl as Controller
    participant AI as AuditInterceptor
    participant Svc as Service
    participant Rep as Repository
    participant DB as PostgreSQL

    C->>LM: HTTP Request + Bearer Token
    LM->>TG: log + forward
    TG->>JG: rate ok
    JG->>RG: token valido (user)
    RG->>VP: role ok
    VP->>Ctl: DTO validado
    Ctl->>AI: chama service
    AI->>Svc: registra acao
    Svc->>Rep: regra de negocio
    Rep->>DB: query
    DB-->>Rep: dados
    Rep-->>Svc: entidade
    Svc-->>AI: resultado
    AI-->>Ctl: persiste AuditLog
    Ctl-->>C: HTTP Response
```

Os erros disparam o `HttpExceptionFilter` global, que padroniza a resposta e
loga sem expor stack trace ao cliente.

---

## Vista 4 — Seguranca em Camadas (Cybersecurity)

Mapeamento dos itens da rubrica da sprint de Cybersecurity.

```mermaid
flowchart TB
    Edge["Borda HTTP<br/>HTTPS, CORS, Helmet"]
    Throttle["Rate Limiting<br/>ThrottlerGuard"]
    AuthN["Autenticacao<br/>JwtAuthGuard + JwtStrategy"]
    AuthZ["Autorizacao<br/>RolesGuard (RBAC)"]
    Validation["Validacao + Sanitizacao<br/>ValidationPipe + class-validator"]
    BusinessLogic["Logica de Negocio<br/>Services"]
    DataLayer["Persistencia<br/>Prisma + Postgres"]
    Observability["Observabilidade<br/>LoggingMiddleware + AuditInterceptor + SecurityEventLogger"]

    Edge --> Throttle --> AuthN --> AuthZ --> Validation --> BusinessLogic --> DataLayer
    BusinessLogic -. eventos .-> Observability
    AuthN -. falhas .-> Observability
    AuthZ -. negacoes .-> Observability
```

### Aderencia ao edital de Cybersecurity

| Item da rubrica | Implementacao |
| --- | --- |
| Validacao de entradas / sanitizacao | `ValidationPipe` global + DTOs com `class-validator` (`@IsString`, `@IsEmail`, `@Matches` para CPF, `@MaxLength`, `@Min/@Max`). `whitelist: true` + `forbidNonWhitelisted: true` rejeitam payloads desconhecidos |
| Normalizacao de parametros | `class-transformer` (`@Type(() => Number)`, `enableImplicitConversion`) e enums Prisma (`Role`, `ClienteStatus`, `LeadUrgencia`, etc.) |
| Limitacao de tamanho de entrada | `@MaxLength` em todos os DTOs |
| Tratamento seguro de erros | `HttpExceptionFilter` global retorna `{ statusCode, message, error, path, timestamp, requestId }` sem stack trace |
| Autenticacao segura (JWT) | `@nestjs/jwt` + `passport-jwt`, HS256, expiracao configuravel (`JWT_EXPIRES_IN`, default `8h`), secret obrigatorio via env |
| Hash de senha | `argon2id` (memory cost 19MiB, time cost 2) |
| RBAC | Enum `Role { ADMIN, GERENTE, FUNCIONARIO }` + `@Roles()` + `RolesGuard` |
| HTTPS/TLS | Cabe ao reverse proxy (Nginx/Cloudflare/etc) em producao |
| Rate limiting | `ThrottlerModule` + `ThrottlerGuard` global (60 req/min). `/auth/login` com limite agressivo de 5 req/min |
| CORS | `enableCors` com `CORS_ORIGINS` parametrizavel; defaults seguros |
| Helmet | Middleware HTTP de seguranca habilitado globalmente |
| Criptografia em repouso | Senhas com `argon2id`; CPF mascarado em respostas |
| Anonimizacao | `toColaboradorResponse` retorna CPF como `***.***.NNN-NN` |
| Logs sem dados sensiveis | `LoggingMiddleware` evita body de `/auth/*`; logs estruturados em JSON |
| Monitoramento de eventos suspeitos | `SecurityEventLogger` detecta brute-force (>= 5 falhas em 5 min) e dispara `security_alert` |
| Trilha de auditoria | `AuditInterceptor` grava `userId`, `userEmail`, `action`, `resource`, `resourceId`, `ip`, `userAgent`, `timestamp` em `AuditLog` para todo POST/PATCH/PUT/DELETE |

---

## Documentacao da API (Swagger)

A API e documentada com **OpenAPI 3.0** via `@nestjs/swagger`. O Swagger UI
fica disponivel em `/api/docs` apos subir a aplicacao.

**Configuracao (`src/main.ts`):**

- Titulo: *Ford Brasil Vehicle Catalog & Dealership API*
- Versao: `1.1.0`
- Autenticacao: Bearer JWT configurado com `persistAuthorization: true`
  (o token persiste no browser entre reloads do Swagger UI)

**Tags registradas:** Auth, Colaboradores, Clientes, Estoque, Leads,
Financiamentos, Servicos, Tecnicos, Metas, Avaliacoes, Dashboard, Health,
Vehicles, Scrapper.

**Decorators usados nos controllers:**

| Decorator          | Funcao                                           |
| ------------------ | ------------------------------------------------ |
| `@ApiTags`         | Agrupa endpoints por modulo no Swagger UI         |
| `@ApiBearerAuth`   | Indica que a rota exige JWT                       |
| `@ApiOperation`    | Descreve o que o endpoint faz                     |
| `@ApiQuery`        | Documenta query params (filtros, paginacao)       |
| `@ApiResponse`     | Documenta os status codes possiveis               |
| `@ApiBody`         | Documenta o corpo da requisicao                   |
| `@ApiParam`        | Documenta parametros de rota (`:id`)              |

Para acessar: `http://localhost:3000/api/docs`

---

## Padroes Adotados

| Padrao / Tecnologia | Aplicacao no projeto                                                             |
| -------------------- | -------------------------------------------------------------------------------- |
| REST                 | Recursos como substantivos (`/clientes`, `/leads`), metodos HTTP semanticos, status codes corretos (200, 201, 400, 401, 403, 404, 429) |
| JSON                 | Formato unico de entrada e saida em todos os endpoints                           |
| OpenAPI 3.0          | Documentacao automatica via Swagger (`/api/docs`)                                |
| JWT (RFC 7519)       | Autenticacao stateless com Bearer token, HS256, expiracao configuravel           |
| Argon2id             | Hash de senhas (memory cost 19 MiB, time cost 2)                                |
| Prisma ORM           | Acesso ao banco via queries parametrizadas (sem SQL manual)                      |

---

## Conexao com Banco de Dados

### Infraestrutura

O banco e um **PostgreSQL 17** provisionado via Docker Compose
(`docker-compose.yaml`):

```bash
docker compose up -d   # sobe postgres:17-alpine na porta 5432
```

A unica configuracao necessaria e a variavel `DATABASE_URL` no `.env`:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

### PrismaService (driver adapter)

O acesso ao banco usa **Prisma 7** com o **driver adapter `@prisma/adapter-pg`**,
que conecta via o pacote `pg` nativo em vez do engine binario do Prisma:

```
prisma/prisma.service.ts
  └── PrismaService extends PrismaClient
        └── new PrismaPg({ connectionString: DATABASE_URL })
```

O `PrismaService` e registrado como provider global via `CommonModule`
(`@Global`) em `src/common/common.module.ts`, e injetado nos repositorios
de cada modulo via construtor.

### Migracoes

As migracoes ficam versionadas em `prisma/migrations/` com timestamps:

| Migracao                        | Conteudo                                                    |
| ------------------------------- | ----------------------------------------------------------- |
| `20260408212656_init`           | Schema inicial (Vehicle, Model, Version, etc.)              |
| `20260408213102_fixing`         | Ajustes no schema (drop/reshape de tabelas)                 |
| `20260413141225`                | Tabela `SyncRun` para tracking de sincronizacao             |
| `20260515130133`                | Enums (Role, ClienteStatus, etc.) + tabelas da concessionaria |

O arquivo `migration_lock.toml` trava o provider em `postgresql`.

A configuracao do Prisma CLI fica em `prisma.config.ts`:

```ts
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: process.env['DATABASE_URL'] },
});
```

**Scripts disponiveis (`package.json`):**

| Script             | Comando              | Funcao                              |
| ------------------ | -------------------- | ----------------------------------- |
| `prisma:migrate`   | `prisma migrate dev` | Cria e aplica migracoes em dev      |
| `prisma:push`      | `prisma db push`     | Aplica schema sem criar migracao    |
| `prisma:seed`      | `prisma db seed`     | Executa `prisma/seed.ts`            |
| `prisma:generate`  | `prisma generate`    | Regenera o client em `generated/`   |
| `prisma:studio`    | `prisma studio`      | Abre UI de inspecao do banco        |

### Modelo de Dados (Resumo)

Tabelas alem das ja existentes (Vehicle, Motorizacao, Cor, Imagem, Fontes,
SyncRun):

| Tabela            | Proposito                                                |
| ----------------- | -------------------------------------------------------- |
| `Colaborador`     | Funcionario autenticavel (login, RBAC)                    |
| `AuditLog`        | Trilha de auditoria + eventos de seguranca                |
| `Cliente`         | Clientes da concessionaria                                |
| `Avaliacao`       | NPS / feedback de clientes (acesso publico)               |
| `EstoqueVeiculo`  | Veiculos novos/seminovos disponiveis                      |
| `Financiamento`   | Contratos de financiamento                                |
| `Lead`            | Pipeline de leads inteligentes                            |
| `Meta`            | Metas comerciais e KPIs definidos                         |
| `OrdemServico`    | OS da oficina (previstos, andamento, concluidos)          |
| `Tecnico`         | Equipe tecnica da oficina                                 |

### Variaveis de ambiente

Obrigatorias no `.env` (veja `.env.example`):

- `DATABASE_URL`
- `JWT_SECRET` (>= 32 chars, aleatorio)
- `JWT_EXPIRES_IN` (default `8h`)
- `CORS_ORIGINS` (default `*` em dev; configurar dominios em producao)

---

## Como Testar a Seguranca

1. Subir Postgres e aplicar migrations:
   ```bash
   docker compose up -d
   npm run prisma:migrate
   ```
2. Subir API: `npm run start:dev`
3. **Sem token** → `GET /api/v1/clientes` deve retornar `401`.
4. **Sem token** → `GET /api/v1/avaliacoes` deve retornar `200` (publico).
5. Registrar primeiro ADMIN: como `register` exige ADMIN, criar via seed ou
   diretamente no DB (insert manual com hash argon2).
6. `POST /api/v1/auth/login` → guardar `accessToken`.
7. Usar `Authorization: Bearer <token>` para chamar rotas autenticadas.
8. Tentar `DELETE /api/v1/colaboradores/:id` com role `FUNCIONARIO` → `403` +
   evento `access_denied` no `AuditLog`.
9. Tentar 6 logins invalidos consecutivos → alerta `brute_force_suspected`
   nos logs.
