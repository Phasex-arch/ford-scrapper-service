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
├── main.ts                    # Bootstrap + Swagger + CORS
├── app.module.ts              # Root module (todos os imports)
│
├── health/                    # GET /health
├── vehicle/                   # GET /vehicles, GET /vehicles/:id
│   ├── domain/                #   Entidades de domínio
│   ├── application/           #   Services, DTOs, Mappers
│   ├── infrastructure/        #   Repositórios Prisma
│   └── presentation/          #   Controller REST
│
├── categories/                # GET /categories
├── colors/                    # GET /colors
├── models/                    # GET /models
├── versions/                  # GET /versions
├── search/                    # GET /search?q=
├── sync/                      # POST /sync + GET /sync/history
├── sources/                   # GET /sources
├── stats/                     # GET /stats
│
└── scrapper/                  # Coleta de dados (crawler + parsers)
    ├── application/           #   Orquestração de scraping
    ├── domain/                #   Interfaces de dados coletados
    ├── infrastructure/        #   Crawler, PDF downloader, Gemini, PDF parser
    └── presentation/          #   Controller legado /scrapper/ford
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

- **API**: http://localhost:3000/api/v1/health
- **Swagger**: http://localhost:3000/api/docs

---

## 🐳 Docker Compose (tudo junto)

```bash
docker compose up --build
```

Sobe PostgreSQL + API automaticamente.

---

## 📡 Endpoints

### Base URL: `http://localhost:3000/api/v1`

| Método | Endpoint                 | Descrição                                    |
|--------|--------------------------|----------------------------------------------|
| GET    | `/health`                | Health check do serviço                      |
| GET    | `/vehicles`              | Lista veículos (filtros, paginação, sort)    |
| GET    | `/vehicles/:id`          | Detalhes de um veículo (por UUID ou slug)    |
| GET    | `/categories`            | Lista categorias distintas                   |
| GET    | `/colors`                | Lista cores distintas                        |
| GET    | `/models`                | Lista modelos distintos                      |
| GET    | `/versions`              | Lista versões distintas                      |
| GET    | `/search?q=`             | Busca textual em múltiplos campos            |
| POST   | `/sync`                  | Dispara coleta+persistência completa         |
| GET    | `/sync/history`          | Histórico de sincronizações                  |
| GET    | `/sources`               | Fontes oficiais utilizadas                   |
| GET    | `/stats`                 | Estatísticas do catálogo                     |

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
GET /api/v1/vehicles?categoria=Picape&combustivel=Diesel&sort=preco_asc&page=1&limit=5
```

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

# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

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
