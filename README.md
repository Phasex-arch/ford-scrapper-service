# 🚗 Ford Brasil Vehicle Catalog API

API profissional para consulta, coleta e normalização de todos os veículos da linha atual da Ford Brasil, com dados obtidos exclusivamente de fontes oficiais ([ford.com.br](https://www.ford.com.br/)).

## 📋 Visão Geral

Este serviço atua como backend de catálogo digital, coletando automaticamente dados de veículos do site oficial da Ford Brasil e disponibilizando-os via API REST estruturada. Ideal para dashboards de concessionárias, catálogos profissionais ou integrações B2B.

### Funcionalidades

- ✅ Coleta automatizada de todos os veículos da linha Ford Brasil
- ✅ Normalização e deduplicação de dados
- ✅ API REST completa com filtros, paginação e ordenação
- ✅ Busca textual em múltiplos campos
- ✅ Rastreabilidade de fontes oficiais
- ✅ Histórico de sincronizações
- ✅ Estatísticas agregadas do catálogo
- ✅ Documentação Swagger/OpenAPI interativa

---

## 🛠 Stack Tecnológica

| Componente       | Tecnologia                          |
|-----------------|-------------------------------------|
| **Runtime**     | Node.js (ESM)                       |
| **Linguagem**   | TypeScript                          |
| **Framework**   | NestJS 11                           |
| **ORM**         | Prisma 7 (com PrismaPg adapter)     |
| **Banco**       | PostgreSQL 17                       |
| **HTTP Client** | Fetch API nativo                    |
| **Parser HTML** | Cheerio                             |
| **AI (PDF)**    | Google Gemini (`@google/genai`)     |
| **Docs**        | Swagger / OpenAPI                   |
| **Rate Limit**  | `@nestjs/throttler`                 |
| **Container**   | Docker + Docker Compose             |
| **Testes**      | Jest + Supertest                    |
| **Linting**     | ESLint + Prettier                   |

---

## 🏗 Arquitetura

```
src/
├── main.ts                    # Bootstrap (Helmet, CORS, Throttler, Global Pipes/Filters, Swagger)
├── app.module.ts              # Root module (registro de rotas, middlewares e guards globais)
│
├── auth/                      # Autenticação JWT, login, registro e Guards RBAC
├── colaborador/               # Gestão de colaboradores e papéis (ADMIN, GERENTE, FUNCIONARIO)
├── cliente/                   # Gestão de clientes da concessionária
├── estoque/                   # Gestão de estoque de veículos (novos e seminovos)
├── lead/                      # Pipeline e scoring de leads comerciais
├── financiamento/             # Simulações e propostas de financiamento
├── servico/                   # Ordens de serviço e pós-venda
├── tecnico/                   # Equipe técnica da oficina
├── meta/                      # Gestão de metas comerciais e operacionais
├── avaliacao/                 # Avaliações públicas de clientes
├── dashboard/                 # KPIs agregados e visão analítica em tempo real
│
├── health/                    # GET /health
├── vehicle/                   # Catálogo de veículos Ford (GET /vehicles, GET /vehicles/:id)
│   ├── domain/                #   Entidades de domínio
│   ├── application/           #   Services, DTOs, Mappers
│   ├── infrastructure/        #   Repositórios Prisma
│   ├── sync/                  #   Sincronização e histórico
│   └── presentation/          #   Controller REST
│
├── common/                    # Middlewares (logging, audit), interceptors, filtros e decorators
└── scrapper/                  # Coleta de dados (crawler + parsers + Gemini)
```

Cada módulo segue o padrão **hexagonal** (Ports & Adapters): `domain/` → `application/` → `infrastructure/` → `presentation/`.

---

## 🚀 Instalação e Execução

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- Chave de API do Google Gemini

### 1. Clone e instale

```bash
git clone <repo-url>
cd ford-scrapper-service
npm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com suas credenciais
```

### 3. Suba o banco de dados

```bash
docker compose up -d postgres
```

### 4. Execute as migrações

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Inicie em desenvolvimento

```bash
npm run start:dev
```

### 6. Acesse

- **API**: http://localhost:3000/api/health
- **Swagger**: http://localhost:3000/api/docs

---

## 🐳 Docker Compose (tudo junto)

```bash
docker compose up --build
```

Sobe PostgreSQL + API automaticamente.

---

## 🔐 Autenticação e autorização

- **Login:** `POST /api/auth/login` (`{ email, senha }`) valida a senha (hash argon2id)
  e devolve `{ accessToken, user }`. Limite de 5 tentativas por minuto (429 depois disso).
- **JWT:** assinado com HS256 usando `JWT_SECRET`; expira em `JWT_EXPIRES_IN` (padrão `8h`).
  O payload leva `sub` (id), `email`, `role` e `nome`. Todas as rotas exigem
  `Authorization: Bearer <token>`, exceto as marcadas com `@Public()`.
- **Validação a cada request:** além da assinatura/expiração, a `JwtStrategy` recarrega
  o colaborador no banco — colaborador desativado ou removido perde acesso na hora.
- **Perfis (RBAC):** `ADMIN`, `GERENTE` e `FUNCIONARIO`, declarados por rota com
  `@Roles(...)` e checados pelo `RolesGuard`.
- **Endpoints públicos:** `GET /health`, `POST /auth/login`, `POST /auth/exchange`,
  `POST /public/leads`, `GET/POST /avaliacoes` (e leitura pública de avaliações).
- **Erros:** `401` token ausente/inválido/expirado · `403` perfil sem permissão ·
  `404` recurso inexistente · `400` validação · `429` limite de tentativas. Todo erro
  segue o mesmo formato: `{ statusCode, message, error, path, timestamp, requestId? }`.

Detalhes: [`docs/AUTENTICACAO-JWT.md`](./docs/AUTENTICACAO-JWT.md). Índice completo da Sprint 3 (mapa dos critérios → onde está cada um): [`docs/SPRINT-3.md`](./docs/SPRINT-3.md).

## 📚 Documentação

| Assunto | Arquivo |
|---|---|
| Índice da Sprint 3 (critérios → onde está cada um) | [`docs/SPRINT-3.md`](./docs/SPRINT-3.md) |
| Arquitetura: componentes, responsabilidades, fluxo e autenticação | [`docs/architecture/SOLUCAO.md`](./docs/architecture/SOLUCAO.md) · [`DIAGRAMS.md`](./docs/architecture/DIAGRAMS.md) |
| Autenticação, autorização e JWT | [`docs/AUTENTICACAO-JWT.md`](./docs/AUTENTICACAO-JWT.md) |
| REST nível 2: matriz endpoint × perfil × status | [`docs/REST.md`](./docs/REST.md) |
| Testes automatizados e evidências | [`docs/TESTES.md`](./docs/TESTES.md) · [`docs/evidencias/`](./docs/evidencias) |
| Swagger/OpenAPI e formato padrão de erro | [`docs/ERROS-E-SWAGGER.md`](./docs/ERROS-E-SWAGGER.md) |
| Segurança, contratos com o frontend, operação | [`docs/CYBERSECURITY.md`](./docs/CYBERSECURITY.md) · [`INTEGRATION-CONTRACTS.md`](./docs/INTEGRATION-CONTRACTS.md) · [`OPERACAO.md`](./docs/OPERACAO.md) |

## 📡 Endpoints Principais
 
### Base URL: `http://localhost:3000/api`

Documentação interativa (Swagger/OpenAPI): `http://localhost:3000/api/docs` — use o
botão **Authorize** e cole o `accessToken` do login. Exemplos prontos de
requisição em [`requests.http`](./requests.http).

| Módulo | Método | Endpoint | Proteção | Descrição |
|--------|--------|----------|----------|-----------|
| **Auth** | POST | `/auth/login` | Pública | Login com e-mail e senha → devolve JWT |
| **Auth** | GET/PATCH | `/auth/me` | JWT | Dados / edição do próprio perfil |
| **Auth** | PATCH | `/auth/change-password` | JWT | Troca da própria senha |
| **Colaboradores** | POST/DELETE | `/colaboradores` | ADMIN | Cadastro e remoção de colaboradores |
| **Veículos** | GET | `/vehicles` | JWT (qualquer perfil) | Catálogo de veículos Ford (filtros, paginação, sort) |
| **Veículos** | GET | `/vehicles/:id` | JWT (qualquer perfil) | Detalhes do veículo por UUID ou slug |
| **Sync** | POST | `/sync` | ADMIN | Dispara sincronização com o site Ford |
| **Sync** | GET | `/sync/history` | ADMIN/GERENTE | Histórico de execuções de sincronização |
| **Auditoria** | GET | `/audit-log` | ADMIN | Log de auditoria de escritas |
| **Estoque** | GET/POST | `/estoque` | JWT | Listagem e cadastro de veículos em estoque |
| **Estoque** | GET/PATCH/DELETE | `/estoque/:id` | JWT | Consulta, edição e exclusão de item em estoque |
| **Clientes** | GET/POST | `/clientes` | JWT | Listagem e cadastro de clientes |
| **Leads** | GET/POST | `/leads` | JWT | Pipeline comercial e gestão de leads |
| **Financiamentos** | GET/POST | `/financiamentos` | JWT | Propostas de financiamento |
| **Serviços** | GET/POST | `/servicos` | JWT | Ordens de serviço da oficina |
| **Técnicos** | GET/POST | `/tecnicos` | JWT | Equipe de manutenção e disponibilidade |
| **Metas** | GET/POST | `/metas` | JWT | Acompanhamento de metas da loja |
| **Avaliações** | GET/POST | `/avaliacoes` | Pública | Consulta e envio de avaliações de clientes |
| **Dashboard** | GET | `/dashboard` | JWT | Métricas consolidadas (vendas, leads, oficina) |
| **Colaboradores** | GET/POST | `/colaboradores` | ADMIN/GERENTE | Gestão de equipe e perfis de acesso |
| **Health** | GET | `/health` | Pública | Health check do serviço e conexão com banco |
| **Contato** | POST | `/public/leads` | Pública | Cria lead do portal e envia notificação via Resend |

### Filtros disponíveis em `/vehicles`

| Parâmetro      | Tipo   | Exemplo                          |
|---------------|--------|----------------------------------|
| `categoria`   | string | `?categoria=Picape`              |
| `modelo`      | string | `?modelo=Ranger`                 |
| `versao`      | string | `?versao=Raptor`                 |
| `cor`         | string | `?cor=Branco`                    |
| `tipo_veiculo`| string | `?tipo_veiculo=SUV`              |
| `combustivel` | string | `?combustivel=Diesel`            |
| `tracao`      | string | `?tracao=4WD`                    |
| `transmissao` | string | `?transmissao=Automática`        |
| `preco_min`   | number | `?preco_min=100000`              |
| `preco_max`   | number | `?preco_max=300000`              |
| `sort`        | enum   | `?sort=preco_asc` ou `preco_desc`|
| `page`        | number | `?page=2`                        |
| `limit`       | number | `?limit=10` (max: 100)           |

**Filtros são combináveis:**

```
GET /api/vehicles?categoria=Picape&combustivel=Diesel&sort=preco_asc&page=1&limit=5
```

### Contato público e Resend

Configure no ambiente do backend:

```bash
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL="Website Ford <contato@seudominio.com>"
LEAD_NOTIFICATION_EMAIL=vendas@seudominio.com
```

O endpoint `POST /api/public/leads` aceita `nome`, `email`, `telefone`,
`veiculoInteresse` e `mensagem`. A chave do Resend nunca deve ser enviada ao
frontend.

---

## 🔄 Estratégia de Coleta

O sistema utiliza uma abordagem em camadas (tiers) para maximizar a qualidade dos dados:

1. **Tier 1 — PDF direto**: Link de ficha técnica encontrado no HTML da página do modelo
2. **Tier 2 — PDF CDN**: URLs candidatas construídas a partir de padrões conhecidos do CDN Ford
3. **Tier 3 — Gemini AI**: Extração via Google Gemini a partir do PDF baixado
4. **Tier 4 — PDF local**: Parse local com `pdf-parse` como fallback
5. **Tier 5 — HTML scrape**: Extração direta do HTML de páginas de versão

### Fontes consultadas

- Página "Todos os veículos"
- Páginas de categoria (picapes, SUVs, performance, etc.)
- Páginas de cada modelo
- Páginas de comparação de versões
- Fichas técnicas em PDF

---

## 🧹 Estratégia de Normalização

- Remoção de duplicidades por slug único (`modelo-versao`)
- Padronização de nomes de cores (regex com prefixos conhecidos)
- Padronização de categorias via mapeamento de URL
- Padronização de combustíveis, transmissões e trações
- Normalização de preços (remove R$, pontos, vírgulas)
- Geração de slug via NFD + remoção de acentos

---

## 📊 Variáveis de Ambiente

| Variável           | Obrigatória | Default                | Descrição                       |
|-------------------|-------------|------------------------|---------------------------------|
| `PORT`            | Não         | `3000`                 | Porta do servidor               |
| `DATABASE_URL`    | Sim         | —                      | Connection string PostgreSQL    |
| `GEMINI_KEY`      | Sim         | —                      | Chave API Google Gemini         |
| `FORD_BASE_URL`   | Não         | `https://www.ford.com.br` | URL base do site Ford        |
| `SYNC_TIMEOUT_MS` | Não         | `120000`               | Timeout para sync (ms)          |
| `USER_AGENT`      | Não         | Chrome 125 UA          | User-Agent para requisições     |
| `ENABLE_HEADLESS` | Não         | `true`                 | Modo headless                   |
| `REDIS_URL`       | Não         | —                      | URL Redis (cache futuro)        |

---

## 🧪 Comandos

```bash
# Desenvolvimento
npm run start:dev

# Build
npm run build

# Produção
npm run start:prod

# Testes (unitários de service + testes HTTP de auth/RBAC/erros com supertest)
npm run test

# Coverage
npm run test:cov

# Lint
npm run lint

# Formatação
npm run format

# Migrations
npx prisma migrate deploy
npx prisma generate
```

---

## ⚠️ Limitações Conhecidas

1. **Rate limiting do site Ford**: O crawler respeita delays entre requests (600ms), mas pode ser bloqueado em caso de uso excessivo
2. **Dados dinâmicos**: Preços e disponibilidade mudam sem aviso; execute sync regularmente
3. **JavaScript rendering**: Algumas páginas Ford usam JS pesado — Cheerio não executa JS, então alguns dados podem ficar indisponíveis
4. **Quota Gemini**: O tier de extração AI tem limites de quota; fallback para parse local quando excedido
5. **Cores**: Nem todas as páginas listam cores de forma estruturada — a extração depende de padrões de texto

---

## 🔮 Expansão Futura

Para expandir para Ford Global:

1. Adicionar `market` como parâmetro de configuração
2. Criar coletores específicos por país (`ford-us.collector.ts`, `ford-eu.collector.ts`)
3. Ajustar normalizadores para múltiplos idiomas
4. Adicionar campo `market` no schema para multi-tenancy
5. Implementar Redis para cache de dados por mercado

---

## 📄 Licença

Projeto privado — uso interno.
