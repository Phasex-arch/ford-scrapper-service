# 01 — Arquitetura da solução

> Critério: **Arquitetura da Solução (20%)** — diagrama de componentes e responsabilidades,
> separação de responsabilidades, fluxo de comunicação e autenticação.

## 1. Diagrama de componentes

```mermaid
flowchart LR
  subgraph Cliente["Navegador"]
    P["Portal público<br/>React + Vite<br/>(landing, formulário, login)"]
    D["Painel da concessionária<br/>React + Vite<br/>(dashboard, leads, OS...)"]
  end

  subgraph Borda["Borda (docker-compose)"]
    C["Caddy<br/>TLS + reverse proxy"]
    N1["nginx (portal)"]
    N2["nginx (dealership)"]
  end

  subgraph API["Backend — NestJS (ford-scrapper-service)"]
    direction TB
    PIPE["Pipeline de segurança<br/>Helmet · CORS · Throttler · JwtAuthGuard · RolesGuard<br/>ValidationPipe · AuditInterceptor · HttpExceptionFilter"]
    CTRL["presentation/<br/>controllers REST + DTOs + Swagger"]
    SVC["application/<br/>regras de negócio (services)"]
    REPO["infrastructure/<br/>repositories (Prisma)"]
    JOBS["scheduler/<br/>jobs automáticos (cron)"]
    PIPE --> CTRL --> SVC --> REPO
    JOBS --> SVC
  end

  DB[("PostgreSQL 17<br/>(Neon em produção)")]
  BREVO["Brevo<br/>e-mail transacional"]
  FORD["ford.com.br<br/>catálogo (scraper)"]

  P --> C
  D --> C
  C --> N1
  C --> N2
  P -- "HTTPS / JSON" --> PIPE
  D -- "HTTPS / JSON + Bearer JWT" --> PIPE
  REPO --> DB
  SVC -- "confirmação de contato" --> BREVO
  SVC -- "sincronização do catálogo" --> FORD
```

## 2. Responsabilidades

| Componente | Responsabilidade | Onde está |
|---|---|---|
| **Portal público** | Captar leads (formulário), mostrar a marca/landing e autenticar o colaborador antes de levá-lo ao painel. Só usa endpoints públicos + login. | repositório `ford-one` (`main/`) |
| **Painel (dealership)** | Uso diário da equipe: leads, clientes, estoque, agenda, ordens de serviço, financiamentos, metas, dashboard. Toda chamada leva `Authorization: Bearer <JWT>`. | repositório `ford-one` (`main/dealership/`) |
| **Caddy + nginx** | Caddy termina TLS e faz proxy reverso; cada nginx serve o SPA compilado (fallback de rotas). | `caddy/Caddyfile` e `docker-compose.yaml` na raiz do workspace |
| **Backend NestJS** | **Único** dono das regras de negócio e do acesso ao banco. Autentica (JWT), autoriza (RBAC), valida entrada, audita escritas, expõe a API REST e a documentação Swagger. | este repositório (`ford-scrapper-service`) |
| **PostgreSQL** | Persistência (Prisma ORM + migrations versionadas). Nenhum frontend fala com o banco. | `prisma/schema.prisma` |
| **Brevo** | Envio do e-mail de confirmação do formulário de contato. | `src/lead/application/public-lead.service.ts` |
| **ford.com.br** | Fonte do catálogo de veículos (scraper com normalização própria). | `src/scrapper/`, `src/vehicle/sync/` |

### Separação de responsabilidades dentro do backend

Cada domínio (`cliente`, `lead`, `servico`, `financiamento`...) é um módulo NestJS isolado, com
as mesmas três camadas, e cada camada só conhece a de baixo:

| Camada | O que faz | O que **não** faz |
|---|---|---|
| `presentation/` | Rotas, verbos HTTP, status codes, DTOs de entrada (`class-validator`), decorators de segurança (`@Roles`, `@Public`) e de documentação (`@Api*`). | Regra de negócio, acesso a banco. |
| `application/` | Regras de negócio e orquestração (ex.: aprovar financiamento converte o lead em cliente numa transação). | Conhecer HTTP (`req`/`res`). |
| `infrastructure/` | Consultas Prisma (repositories). | Regra de negócio. |

Preocupações **transversais** ficam fora dos módulos, em `src/common/` e `src/auth/`: guards, interceptor de
auditoria, filtro global de exceções, logger de eventos de segurança, paginação padronizada.

## 3. Fluxo de comunicação

1. O navegador chama o **Caddy** (TLS), que entrega o SPA pelo nginx correspondente.
2. O SPA chama a API do backend por **HTTPS/JSON** (`/api/...`). Só o backend acessa o banco.
3. Dentro do backend, toda requisição atravessa o pipeline abaixo, **na ordem**:

```mermaid
flowchart LR
  R["Requisição"] --> H["Helmet + CORS<br/>(lista de origens)"] --> L["LoggingMiddleware<br/>(requestId)"] --> T["ThrottlerGuard<br/>60 req/min"] --> J["JwtAuthGuard<br/>(rota @Public passa)"] --> RG["RolesGuard<br/>(@Roles da rota)"] --> V["ValidationPipe<br/>(whitelist)"] --> CT["Controller → Service → Repository"] --> A["AuditInterceptor<br/>(POST/PATCH/PUT/DELETE)"] --> OK["Resposta 2xx"]
  J -. "sem token/ inválido / expirado" .-> E401["401"]
  RG -. "perfil sem permissão" .-> E403["403"]
  V -. "corpo inválido" .-> E400["400"]
  CT -. "não encontrado / conflito" .-> E404["404 / 409"]
  E401 & E403 & E400 & E404 --> F["HttpExceptionFilter<br/>formato único de erro"]
```

## 4. Fluxo de autenticação

```mermaid
sequenceDiagram
  autonumber
  participant U as Colaborador
  participant P as Portal
  participant API as Backend (NestJS)
  participant DB as PostgreSQL
  participant D as Painel (dealership)

  U->>P: e-mail + senha
  P->>API: POST /api/auth/login
  API->>DB: busca colaborador por e-mail
  API->>API: confere hash argon2id
  API-->>P: 200 { accessToken (JWT HS256, 8h), user }
  P->>API: POST /api/auth/exchange-code (Bearer JWT)
  API-->>P: código de uso único (30 s)
  P->>D: redireciona com #code=... (JWT nunca vai na URL)
  D->>API: POST /api/auth/exchange { code }
  API-->>D: 200 { accessToken, user }
  loop toda chamada do painel
    D->>API: GET/POST/... Authorization: Bearer JWT
    API->>API: JwtStrategy: assinatura + expiração
    API->>DB: recarrega colaborador (ativo? role atual?)
    API->>API: RolesGuard: role ∈ @Roles da rota?
    API-->>D: 2xx, ou 401 / 403
  end
```

Detalhes do JWT e da matriz de permissões: [AUTENTICACAO-JWT.md](../AUTENTICACAO-JWT.md).

## 5. Implantação

| Ambiente | Como sobe |
|---|---|
| **Local** | `docker compose up -d` (raiz do projeto): `postgres`, `backend`, `portal`, `dealership`, `caddy`. |
| **Produção** | Backend em Render (Docker, `render.yaml`) com PostgreSQL no Neon; SPAs no Cloudflare Pages; `CORS_ORIGINS` restringe quem pode chamar a API. |

Diagramas complementares do backend (camadas, módulos como serviços, pipeline de segurança, banco):
[`docs/architecture/DIAGRAMS.md`](./DIAGRAMS.md).
