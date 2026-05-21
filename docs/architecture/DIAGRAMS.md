# Diagramas de Arquitetura — Ford Dealership Service

> Renderizaveis no GitHub, VS Code (preview Markdown) ou qualquer
> ferramenta com suporte a [Mermaid](https://mermaid.js.org/).

## Visao Geral (imagem)

![Arquitetura do ford-scrapper-service](architecture-diagram.png)

---

## 1. Arquitetura em Camadas

```mermaid
flowchart TB
    Client["Cliente HTTP / Mobile / Swagger"]
    Presentation["Camada de Apresentacao\nControllers REST"]
    CrossCutting["Cross-cutting\nGuards, Middlewares, Pipes, Interceptors"]
    Application["Camada de Aplicacao\nServices / Use Cases"]
    Infrastructure["Camada de Infraestrutura\nRepositories, JWT Strategy, Helpers"]
    Database[("PostgreSQL 17")]

    Client --> Presentation
    Presentation --> CrossCutting
    CrossCutting --> Application
    Application --> Infrastructure
    Infrastructure --> Database
```

---

## 2. Modulos como Servicos (SOA)

```mermaid
flowchart LR
    subgraph core [Nucleo de Seguranca]
        Auth["Auth\nPOST /login\nPOST /register\nGET /me"]
        Colab["Colaborador\nCRUD"]
    end

    subgraph business [Servicos de Negocio]
        Cli["Cliente\nCRUD"]
        Est["Estoque\nCRUD"]
        Lea["Leads\nCRUD"]
        Fin["Financiamento\nCRUD"]
        Ser["Servicos OS\nCRUD"]
        Tec["Tecnicos\nCRUD"]
        Met["Metas\nCRUD"]
        Ava["Avaliacoes\nCRUD"]
        Das["Dashboard\nGET"]
    end

    subgraph catalog [Catalogo Ford]
        Veh["Vehicle\nGET"]
        Scr["Scrapper\nGET, POST"]
    end

    subgraph shared [Compartilhado - CommonModule]
        Prisma["PrismaService"]
        Audit["AuditLog"]
        Crypto["AesGcmService\nHashService"]
        Security["SecurityEventLogger"]
    end

    core --> shared
    business --> shared
    catalog --> shared
```

---

## 3. Fluxo de uma Requisicao Autenticada

Exemplo: `POST /api/v1/clientes` por um colaborador com role `GERENTE`.

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente HTTP
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
    LM->>TG: log + X-Request-Id
    TG->>JG: rate ok
    JG->>RG: token valido (user)
    RG->>VP: role ok
    VP->>Ctl: DTO validado
    Ctl->>AI: chama service
    AI->>Svc: registra acao
    Svc->>Rep: regra de negocio
    Rep->>DB: query (Prisma)
    DB-->>Rep: dados
    Rep-->>Svc: entidade
    Svc-->>AI: resultado
    AI-->>Ctl: persiste AuditLog
    Ctl-->>C: HTTP Response + X-Request-Id
```

---

## 4. Pipeline de Seguranca

```mermaid
flowchart TB
    Edge["Borda HTTP\nHTTPS + CORS + Helmet"]
    Throttle["Rate Limiting\nThrottlerGuard\n60 req/min global\n5 req/min login"]
    AuthN["Autenticacao\nJwtAuthGuard + JwtStrategy\nHS256, Bearer Token"]
    AuthZ["Autorizacao\nRolesGuard\nADMIN / GERENTE / FUNCIONARIO"]
    Validation["Validacao + Sanitizacao\nValidationPipe + class-validator\nstripXss, escapeForLike"]
    BusinessLogic["Logica de Negocio\nServices"]
    DataLayer["Persistencia\nPrisma 7 + adapter-pg\nPostgreSQL 17"]
    Observability["Observabilidade\nLoggingMiddleware\nAuditInterceptor\nSecurityEventLogger"]

    Edge --> Throttle --> AuthN --> AuthZ --> Validation --> BusinessLogic --> DataLayer
    BusinessLogic -. eventos .-> Observability
    AuthN -. falhas .-> Observability
    AuthZ -. negacoes .-> Observability
```

---

## 5. Conexao com Banco de Dados

```mermaid
flowchart LR
    ENV["DATABASE_URL\n.env"]
    Config["prisma.config.ts"]
    CLI["Prisma CLI\nmigrate, generate, seed"]
    Service["PrismaService\nextends PrismaClient"]
    Adapter["PrismaPg\n@prisma/adapter-pg"]
    PG["pg driver\nnativo Node.js"]
    DB[("PostgreSQL 17\nDocker Compose\nporta 5432")]

    ENV --> Config --> CLI
    ENV --> Service --> Adapter --> PG --> DB

    CommonModule["CommonModule\n@Global"] --> Service
    Repositories["Repositorios\nde cada modulo"] --> Service
```

---

## 6. Visao Geral Completa

```mermaid
flowchart TB
    subgraph clients [Clientes]
        Browser["Browser / Mobile"]
        SwaggerUI["Swagger UI\n/api/docs"]
        B2B["Integracoes B2B"]
    end

    subgraph edge [Borda HTTP]
        Proxy["Reverse Proxy\nNginx / TLS"]
        Helm["Helmet\nHSTS, X-CT-Options"]
        CORS["CORS\nallow-list"]
        BodyCap["Body cap\n100kb"]
    end

    subgraph nest [NestJS - api/v1]
        Throttle["ThrottlerGuard\n60/min global"]
        Logging["LoggingMiddleware\nX-Request-Id, JSON"]
        JwtGuard["JwtAuthGuard\nglobal"]
        RolesG["RolesGuard\nRBAC por rota"]
        ValPipe["ValidationPipe\nwhitelist + transform"]
        ExFilter["HttpExceptionFilter\nerros sem stack trace"]

        subgraph modules [Modulos]
            AuthMod["Auth"]
            ColabMod["Colaborador"]
            CliMod["Cliente"]
            EstMod["Estoque"]
            LeadMod["Lead"]
            FinMod["Financiamento"]
            ServMod["Servico"]
            TecMod["Tecnico"]
            MetMod["Meta"]
            AvaMod["Avaliacao"]
            DashMod["Dashboard"]
            VehMod["Vehicle"]
            ScrMod["Scrapper"]
        end

        AuditInt["AuditInterceptor\npersiste em AuditLog"]
        SecLog["SecurityEventLogger\nbrute-force detection"]
    end

    subgraph data [Dados]
        PrismaS["PrismaService\nadapter-pg"]
        Postgres[("PostgreSQL 17")]
        CryptoS["AesGcmService\nHashService"]
    end

    clients --> edge
    edge --> Throttle --> Logging --> JwtGuard --> RolesG --> ValPipe
    ValPipe --> modules
    modules --> AuditInt
    modules --> PrismaS --> Postgres
    modules -.-> CryptoS
    JwtGuard -.-> SecLog
    RolesG -.-> SecLog
    AuditInt --> Postgres
    SecLog --> Postgres
```
