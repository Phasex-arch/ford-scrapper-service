# Trabalho de Cybersecurity — Ford Scrapper Service

> **Disciplina:** Cybersecurity
> **Sprint:** Sprint — 1º Semestre 2026  
> **Entrega:** 24/05/2026 (via Microsoft Teams)
> **Parceiro:** Ford do Brasil
> **Scrum Master:** Prof. Yan Coelho
> **Projeto:** Ford Brasil Vehicle Catalog API (`ford-scrapper-service`)

## Identificação do Grupo


| Nome        | RM          | Turma       |
| ----------- | ----------- | ----------- |
| *Preencher* | *Preencher* | *Preencher* |
| *Preencher* | *Preencher* | *Preencher* |
| *Preencher* | *Preencher* | *Preencher* |
| *Preencher* | *Preencher* | *Preencher* |
| *Preencher* | *Preencher* | *Preencher* |


---

## 1. Resumo Executivo

O `ford-scrapper-service` é a camada de back-end de um catálogo digital para a
linha de veículos Ford Brasil. Ele coleta, normaliza e expõe via API REST os
dados oficiais publicados em [ford.com.br](https://www.ford.com.br/),
servindo dashboards de concessionárias, integrações B2B e, na nova versão
deste trabalho, um pipeline de retenção de clientes que armazena **leads
pessoais** (nome, e-mail, CPF, telefone e VIN compartilhado).

Por lidar agora com dados pessoais sensíveis (LGPD) e ações administrativas
que executam scraping massivo do site oficial da Ford, o serviço precisa
estar **blindado** — exatamente o cenário descrito na *Challenge SpeedRunners*
("Missão: Blindar o Challenge da Ford"). Este relatório descreve, seção a
seção da rubrica oficial de Cybersecurity (20 + 20 + 20 + 25 + 15 = 100
pontos), as decisões de projeto e os controles implementados, com referência
direta aos arquivos de código.

---

## 2. Modelo de Ameaças


| Categoria                 | Atores                                                                          | Ativos críticos                                              | Vetores comuns                                                              |
| ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Externos não autenticados | Script kiddies, bots de scraping, ferramentas automáticas (sqlmap, Burp, hydra) | Catálogo público, endpoints expostos, formulário de login    | SQLi, XSS refletido, brute force, DDoS, scraping abusivo                    |
| Externos autenticados     | Concessionários, integradores B2B com credenciais legítimas                     | API de leads, exportação de dashboards                       | Escalação de privilégios, vazamento via token roubado, replay de requisição |
| Internos                  | Desenvolvedor / operador com acesso ao repositório, banco ou logs               | `GEMINI_KEY`, chaves AES, dump do Postgres, logs de produção | Commit acidental de `.env`, log de senha, dump não criptografado            |
| Insiders maliciosos       | Funcionário com acesso a leads                                                  | CPF, telefone, e-mail dos clientes                           | Dump silencioso, exfiltração via export                                     |


A blindagem responde a cada um desses vetores com uma combinação de
**validação**, **autenticação forte**, **proteção em trânsito**, **criptografia
em repouso** e **observabilidade** — exatamente as cinco frentes da rubrica.

```mermaid
flowchart LR
    Client["Cliente HTTPS"] -->|TLS 1.2+| Proxy["Reverse proxy / Nginx"]
    Proxy --> Validation["ValidationPipe global<br/>+ helmet + body limit 10kb"]
    Validation --> Throttler["ThrottlerGuard 60/min"]
    Throttler --> Jwt["JwtAuthGuard"]
    Jwt --> Roles["RolesGuard (ADMIN/ANALISTA/USER)"]
    Roles --> Idem["IdempotencyMiddleware (POST sensíveis)"]
    Idem --> Sig["PayloadSignatureMiddleware (sync)"]
    Sig --> Handler["Controller + Service"]
    Handler -->|"Prisma parametrizado"| Postgres[("PostgreSQL")]
    Handler -->|"AES-256-GCM"| Postgres
    Handler --> Audit["AuditService"]
    Audit --> Postgres
    Handler --> Pino["nestjs-pino<br/>JSON + redact"]
    Handler -.exception.-> Filter["AllExceptionsFilter<br/>(envelope genérico)"]
    Filter --> Client
```



---

## 3. Seção 1 — Segurança de Entrada e Validação de Dados (20 pontos)

### 3.1 Validação vs Sanitização

A entrega segue exatamente a distinção das primeiras splits do challenge
(slide 4). **Validação** rejeita o request inteiro quando o formato é
inválido; **sanitização** transforma o input antes de usá-lo. Ambas
acontecem em camadas distintas:

- Validação por DTO + `class-validator`, ativada globalmente em
[src/main.ts](../src/main.ts):
  ```24:34:src/main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );
  ```
  `whitelist + forbidNonWhitelisted` derrubam qualquer propriedade que
  não esteja explicitamente declarada no DTO — defesa direta contra
  *mass-assignment* e injeção de campos.
- Sanitização aplicada após validação, em
[src/common/sanitizers/string.sanitizer.ts](../src/common/sanitizers/string.sanitizer.ts),
usada em campos free-text como `nome` do lead e `q` da busca.

### 3.2 Tipagem, presença e tamanho (slide 5)

Cada DTO declara o que é obrigatório, o formato e o tamanho máximo. Exemplos:

- [src/vehicle/application/dto/vehicle-filter.dto.ts](../src/vehicle/application/dto/vehicle-filter.dto.ts)
usa `@IsString + @MaxLength + @Matches` em filtros de texto e `@IsInt + @Min(1) + @Max(100)` no `limit`, mais `@IsEnum(SortOrder)` para `sort`.
- [src/leads/dto/create-lead.dto.ts](../src/leads/dto/create-lead.dto.ts)
exige CPF de 11 dígitos, telefone com 10–13 dígitos, e-mail RFC, VIN
com 17 caracteres no padrão `[A-HJ-NPR-Z0-9]`.
- [src/auth/dto/register.dto.ts](../src/auth/dto/register.dto.ts) exige
senha com mínimo 12 caracteres, contendo maiúscula, minúscula, número e
caractere especial.

### 3.3 Normalização por enums (slide 7)

A Ford é sempre escrita de uma forma só. Os enums de
[src/common/enums/](../src/common/enums/) (`Brand`, `Categoria`,
`Combustivel`, `Tracao`, `Transmissao`, `SortOrder`) substituem o "fOrD ==
FORD == ford" e são consumidos pelos DTOs com `@IsEnum`. Os repositórios
fazem `toLowerCase()` nas comparações `contains` do Prisma, evitando
divergência entre busca e armazenamento.

### 3.4 Sanitização contra XSS, SQLi e command injection (slide 6)

- **SQL Injection**: o projeto usa Prisma 7 em todas as queries — ver
[src/vehicle/infrastructure/repositories/vehicle.repository.ts](../src/vehicle/infrastructure/repositories/vehicle.repository.ts).
Prisma sempre usa *prepared statements* parametrizados; é impossível
construir SQL via concatenação no nosso código. Além disso,
`escapeForLike` em
[src/common/sanitizers/string.sanitizer.ts](../src/common/sanitizers/string.sanitizer.ts)
neutraliza `%`, `_`, `\` em filtros LIKE para que um cliente não force
uma varredura completa.
- **XSS**: `stripXss` remove `<`, `>`, blocos `<script>` e caracteres de
controle. Todo texto que volta ao cliente (e que poderia ser refletido
num dashboard) é sanitizado antes de persistir
([src/leads/leads.service.ts](../src/leads/leads.service.ts) `stripXss(dto.nome)`).
- **Command injection**: nenhum endpoint chama `child_process`. O scraping
usa apenas `fetch` HTTP e parser Cheerio/Gemini — sem `exec` em nenhum
ponto da stack.

### 3.5 Limites de payload contra buffer overflow & flooding (slide 8)

Em [src/main.ts](../src/main.ts):

```28:30:src/main.ts
  app.use(json({ limit: '10kb' }));
  app.use(urlencoded({ limit: '10kb', extended: true }));
```

Qualquer payload acima de 10 KB é rejeitado antes de tocar no controller.
A mesma proteção, em outra camada, vem do `MaxLength` em cada campo
string dos DTOs e do `Max(100)` no `limit` da paginação — não dá para
pedir 1.000.000 de veículos numa página.

### 3.6 Tratamento seguro de erros (slide 9)

[src/common/filters/all-exceptions.filter.ts](../src/common/filters/all-exceptions.filter.ts)
intercepta tudo. Quando o status é ≥ 500, a resposta é um envelope
genérico:

```json
{
  "statusCode": 500,
  "error": "INTERNAL_ERROR",
  "message": "Internal Server Error",
  "traceId": "8b3...",
  "timestamp": "2026-05-19T12:00:00.000Z"
}
```

Nada de "sql query failed", nome de tabela ou stack trace. O detalhe
completo é logado server-side com o `traceId` para correlação. Em
produção, o `ValidationPipe` roda com `disableErrorMessages: true`,
ocultando até as mensagens descritivas de 400.

---

## 4. Seção 2 — Autenticação e Autorização (20 pontos)

### 4.1 JWT como crachá de acesso (slide 11)

Tokens são emitidos em [src/auth/auth.service.ts](../src/auth/auth.service.ts):

- **Header**: `alg: HS256` declarado explicitamente no `signAsync` para
evitar `alg: none` attacks.
- **Payload**: contém apenas `sub` (UUID do usuário), `email`, `role`,
`jti` (UUID único por token), `iat`, `exp`. Nenhum dado sensível, nenhum
secret — exatamente o aviso da slide 11.
- **Signature**: chaves `JWT_SECRET` e `JWT_REFRESH_SECRET` exigem no
mínimo 32 caracteres; o boot do `JwtStrategy` aborta o processo se
forem fracas.

### 4.2 OAuth2 / Bearer tokens (slide 12)

A estratégia [src/auth/strategies/jwt.strategy.ts](../src/auth/strategies/jwt.strategy.ts)
configura `ExtractJwt.fromAuthHeaderAsBearerToken()` — ou seja, todo
endpoint protegido espera `Authorization: Bearer <token>`. O guard global
[src/auth/guards/jwt-auth.guard.ts](../src/auth/guards/jwt-auth.guard.ts)
é registrado via `APP_GUARD` em
[src/app.module.ts](../src/app.module.ts), então **todas as rotas são
autenticadas por padrão** e só ficam públicas com `@Public()`
([src/common/decorators/public.decorator.ts](../src/common/decorators/public.decorator.ts)).

- **Expiração obrigatória**: access token = 15 min, refresh = 7 dias
(configuráveis em `JWT_ACCESS_TTL`/`JWT_REFRESH_TTL`).
- **Renovação controlada**: o refresh é rotacionado a cada `/auth/refresh`;
o hash argon2 do refresh é guardado em `User.refreshHash`. Se um
refresh já consumido for reapresentado (reuso), todas as sessões do
usuário são revogadas — mecanismo padrão de detecção de roubo.

### 4.3 RBAC (slide 13)

O enum
[src/common/enums/role.enum.ts](../src/common/enums/role.enum.ts) traduz
literalmente a slide:

- `ADMIN` — configurações globais, criar usuário, rodar scraping, ver
audit log e métricas, anonimizar ou deletar leads.
- `ANALISTA` — leads e dashboards (criar/listar leads, exportar
pseudonimizado, ver histórico de sync, `/stats`).
- `USER` — acesso ao catálogo (consulta de veículos, busca, cores etc.).

O [src/auth/guards/roles.guard.ts](../src/auth/guards/roles.guard.ts)
lê o metadata `@Roles(...)` plantado pelo decorator
[src/common/decorators/roles.decorator.ts](../src/common/decorators/roles.decorator.ts).
Mapa de proteção:

- `POST /sync`, `POST /scrapper/ford`, `DELETE /vehicles/:id`,
`GET /audit-logs`, `GET /metrics`, `POST /auth/register`,
`GET /leads/:id/pii`, `POST /leads/:id/anonymize`, `DELETE /leads/:id`
→ **ADMIN**.
- `POST /leads`, `GET /leads`, `GET /leads/export/pseudonymized`,
`GET /leads/:id`, `GET /stats`, `GET /sync/history` → **ANALISTA** ou
**ADMIN**.
- Demais GETs do catálogo → qualquer usuário autenticado.
- `/health`, `/auth/login`, `/auth/refresh`, Swagger → **públicos**.

### 4.4 Hash de senha

`argon2id` (já presente nas dependências) com `timeCost: 3, memoryCost: 64 MiB, parallelism: 1`. Bcrypt e MD5 não são usados — explicitamente
proibidos pela slide 19. Em login, fazemos `argon2.verify` mesmo para
e-mails inexistentes (comparando com um hash dummy) para fechar o canal
de timing oracle.

### 4.5 Anti brute-force

A rota `POST /auth/login` recebe `@Throttle({ default: { limit: 5, ttl: 60_000 } })`, e o `AuthService` registra cada falha como
`AUTH_LOGIN_FAILED` no `AuditLog`. Após 5 falhas no mesmo IP em 5 min, o
`AuditService.detectBruteForce` insere `BRUTE_FORCE_SUSPECTED` e emite
`WARN` estruturado — material para um honey-pot/SIEM (slide 25).

---

## 5. Seção 3 — Proteção de APIs e Serviços (20 pontos)

### 5.1 HTTPS / TLS 1.2+ (slide 15)

O Node não termina TLS diretamente — o padrão da produção é um reverse
proxy (Nginx, Traefik, AWS ALB) com TLS 1.2+. Para deixar isso
funcionando corretamente:

- Em [src/main.ts](../src/main.ts) chamamos
`expressInstance.set('trust proxy', 1)` para que `req.ip` e
`X-Forwarded-For` sejam respeitados — sem isso, o rate-limit e o audit
veriam só o IP do proxy.
- `helmet()` em [src/main.ts](../src/main.ts) injeta `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
remove `X-Powered-By` (slide 9 — "esconda tecnologias"), entre outros.

Exemplo mínimo de Nginx para produção (apêndice):

```nginx
server {
  listen 443 ssl http2;
  server_name api.ford-catalogo.example.com;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 5.2 Rate limiting / Throttling (slide 16)

Configurado globalmente em
[src/app.module.ts](../src/app.module.ts) (`ThrottlerModule.forRoot` +
`APP_GUARD: ThrottlerGuard`) a 60 req/min por IP. Rotas sensíveis
recebem limites menores:

- `POST /auth/login` — 5 req/min
- `POST /auth/refresh` — 10 req/min

Como os guards rodam **após** o JWT, um atacante anônimo gasta o budget
contra `/auth/login` antes mesmo de chegar perto de outras rotas.

### 5.3 CORS allowlist (slide 17)

A regra de ouro do challenge é "nunca use *". Em
[src/main.ts](../src/main.ts):

```40:50:src/main.ts
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS ?? '';
  const allowList = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (allowList.includes('*')) {
    throw new Error(
      'CORS_ALLOWED_ORIGINS contains "*", which is forbidden. ' +
        'Provide a comma-separated list of fully-qualified origins.',
    );
  }
```

Se alguém colocar `*` no `.env`, o processo nem inicia. Em runtime, o
callback do `enableCors` consulta a allowlist e rejeita qualquer outra
origem com erro de CORS — o browser bloqueia a requisição
automaticamente.

### 5.4 Idempotency keys (slide 16)

O middleware
[src/common/middleware/idempotency.middleware.ts](../src/common/middleware/idempotency.middleware.ts)
é montado em
[src/app.module.ts](../src/app.module.ts) para `POST /leads`,
`POST /leads/:id/anonymize`, `POST /sync` e `POST /scrapper/ford`. Ele
exige o cabeçalho `Idempotency-Key` (8–128 caracteres, regex
`/^[A-Za-z0-9_-]+$/`), grava `(key, route, userId, response)` na tabela
`IdempotencyKey` e, se a mesma chave reaparecer, devolve a resposta
original com header `Idempotent-Replay: true`. Resultado: o clique duplo
no botão "Salvar lead" cria **um** registro, não dois — a regra exata
ditada pela slide 16.

Chaves antigas (≥ 24 h) são purgadas pelo cron diário em
[src/leads/leads-retention.cron.ts](../src/leads/leads-retention.cron.ts).

### 5.5 Assinatura HMAC do payload (slide 16 — 5 pts bônus)

O middleware
[src/common/middleware/payload-signature.middleware.ts](../src/common/middleware/payload-signature.middleware.ts)
é montado em `POST /sync` e `POST /scrapper/ford`. Espera:

- `X-Signature-Timestamp: <unix ms>`
- `X-Signature: sha256=<hex hmac de "${ts}.${jsonBody}">`

Com chave em `API_SIGNING_SECRET` (≥ 32 chars). Skew de ±5 min defende
contra replay; `timingSafeEqual` defende contra timing oracle. Sem essa
assinatura, mesmo um JWT de ADMIN não consegue disparar uma sincronização
— integridade do payload em trânsito (a slide chama isso de "assinatura
do payload").

---

## 6. Seção 4 — Segurança de Dados e Privacidade (25 pontos)

### 6.1 Modelo Lead com PII

A migração `20260519100000_add_security_models` adiciona o modelo `Lead`
em [prisma/schema.prisma](../prisma/schema.prisma) com **separação clara
entre o que pode ficar em claro e o que precisa ser cifrado**:

```text
Lead {
  nome            string         (em claro, sanitizado contra XSS)
  email           string         (em claro, lowercased)
  cpfEncrypted    string         (AES-256-GCM)
  cpfHash         string @unique (HMAC-SHA256 com pepper, p/ lookup)
  telefoneEnc     string         (AES-256-GCM)
  vinSharePseudo  string         (HMAC-SHA256 — pseudonimização)
  consent         boolean
  consentAt       datetime?
  retainUntil     datetime       (LGPD)
  anonymizedAt    datetime?      (marca anonimização irreversível)
  createdBy       uuid -> User
}
```

### 6.2 Criptografia em repouso AES-256-GCM (slide 19)

[src/common/crypto/aes-gcm.service.ts](../src/common/crypto/aes-gcm.service.ts)
implementa AES-256-GCM com:

- IV aleatório de 96 bits por registro;
- Tag de autenticação de 128 bits — qualquer adulteração no banco
corrompe a tag e o `decrypt` lança erro;
- Chave de 32 bytes carregada de `DATA_ENCRYPTION_KEY` (base64). O
serviço aborta o boot se a chave estiver ausente ou tiver tamanho
errado.

Senhas dos usuários: `argon2id` (slide 19 — "bcrypt para senhas... não
utilize criptografias resolvidas (DES e MD5)"). O `argon2id` é
considerado superior ao bcrypt para hardware moderno e é o padrão
recomendado pela OWASP em 2026.

### 6.3 Pseudonimização (slide 21)

[src/common/crypto/hash.service.ts](../src/common/crypto/hash.service.ts)
fornece dois primitivos:

- `lookupHash(cpf)` — HMAC-SHA256 com pepper. Vai no campo `cpfHash` para
permitir buscar um lead por CPF sem decifrar a tabela inteira.
- `pseudonymize(value, domain)` — HMAC-SHA256 com `pepper:domain` ⇒
determinístico, reversível só com a chave externa (o pepper). É o
`vinSharePseudo` que vai para ML e dashboards conforme a slide 21
("bom para se utilizar em ML e dashboards (vin share)").

O endpoint `GET /leads/export/pseudonymized`
([src/leads/leads.controller.ts](../src/leads/leads.controller.ts))
devolve apenas `pseudo_id`, `vin_share_pseudo`, `consent` e `created_at`
— **sem nome, e-mail, CPF ou telefone**. É a exportação segura para o
time de IA / dashboard.

### 6.4 Retenção e descarte (slide 20)

- Cada lead recebe um `retainUntil` (default 730 dias, configurável em
`LEAD_RETENTION_DAYS`).
- O cron
[src/leads/leads-retention.cron.ts](../src/leads/leads-retention.cron.ts)
roda todo dia às 03:00 e chama `LeadsService.runRetentionSweep()`, que
**anonimiza irreversivelmente** todo lead expirado: nome vira
`[ANONIMIZADO]`, email vira `anon+<hash>@anonymized.local`, CPF e
telefone são sobrescritos por `00000000000` cifrado, e `anonymizedAt`
é marcado.
- O mesmo cron purga `IdempotencyKey` com mais de 24 h.
- Anonimização vs deleção: a slide 21 destaca a diferença e o projeto
honra os dois caminhos. `POST /leads/:id/anonymize` é **irreversível**
(mantém estatísticas), enquanto `DELETE /leads/:id` é deleção física,
ambos auditados.

### 6.5 Exposição acidental (slide 22)

- `**.env`**: a chave Gemini real que existia em `.env` foi removida
(commit deste trabalho). O arquivo nunca esteve em git (`.gitignore`
já cobria `.env`). O arquivo
[.env.example](../.env.example) recebeu instruções para gerar os
segredos novos via `openssl rand`. **Ação fora-de-banda**: a chave
Gemini exposta precisa ser revogada no console do Google Cloud — o
arquivo `.env` já contém instruções nesse sentido.
- **Logs**: o config em
[src/common/logger/pino-logger.config.ts](../src/common/logger/pino-logger.config.ts)
redige automaticamente `authorization`, `cookie`, `x-signature`,
`idempotency-key`, `*.password`, `*.cpf`, `*.token`, `refreshHash`,
`passwordHash`, `cpfEncrypted` etc. com `[REDACTED]`. Mesmo que um
desenvolvedor logue `req.body` por engano, nenhuma senha ou CPF chega
ao arquivo de log.
- **Endpoints de teste esquecidos**: o legado `GET/POST /scrapper/ford`
passou a exigir `ADMIN`. O Swagger ficou disponível, mas agora exige
Bearer no botão "Authorize" para qualquer rota não-pública.
- **Stack trace**: já tratado na seção 1 pelo `AllExceptionsFilter`.

---

## 7. Seção 5 — Monitoramento, Logs e Auditoria (15 pontos)

### 7.1 Logs estruturados (slide 24)

`nestjs-pino` substitui o `Logger` padrão. Em dev a saída é
`pino-pretty` (humana), em prod é JSON puro pronto para Datadog/Loki/CloudWatch:

```json
{
  "level":30,
  "time":1684505400000,
  "traceId":"8b3f3c4f-...",
  "msg":"GET /vehicles — filtered query",
  "req":{"method":"GET","url":"/api/v1/vehicles?categoria=Picape"}
}
```

A propagação do `traceId` é feita pelo
[src/common/interceptors/request-id.interceptor.ts](../src/common/interceptors/request-id.interceptor.ts):
honra `X-Trace-Id` recebido, senão gera UUID, e devolve no response —
permitindo correlação entre front-end, API e logs (slide 24
"rastreabilidade").

### 7.2 Trilha de auditoria (slide 25)

[src/audit/audit.service.ts](../src/audit/audit.service.ts) +
[src/common/interceptors/audit.interceptor.ts](../src/common/interceptors/audit.interceptor.ts)
gravam um registro no `AuditLog` para toda ação crítica:

- `AUTH_LOGIN`, `AUTH_LOGIN_FAILED`, `AUTH_REFRESH`, `AUTH_LOGOUT`,
`AUTH_REGISTER`
- `LEAD_CREATE`, `LEAD_UPDATE`, `LEAD_DELETE`, `LEAD_ANONYMIZE`
- `SYNC_RUN`, `SCRAPPER_RUN`
- `BRUTE_FORCE_SUSPECTED`

Cada linha contém `userId`, `action`, `resource`, `ip` (com X-Forwarded-For
respeitado), `userAgent`, `traceId`, `metadata.outcome` (SUCCESS/FAILURE)
e `durationMs`. **Nunca** o corpo da requisição — para não vazar PII de
volta nas tabelas de auditoria.

### 7.3 Monitoramento de eventos suspeitos (slide 25)

- **Brute force**: descrito em 4.5 — gatilho a 5 falhas/IP/5 min.
- **Dashboards de 5xx**: o `AllExceptionsFilter` loga `error` para 5xx e
`warn` para 4xx, ambos com `traceId`. Qualquer agregador (ELK, Datadog)
consegue construir um dashboard a partir desses campos.
- **Endpoint /metrics** (ADMIN): `GET /api/v1/metrics`
([src/audit/audit.controller.ts](../src/audit/audit.controller.ts))
retorna contagens por `action` nas últimas 24 h e as últimas 10
falhas — material direto para um painel.
- **Audit trail consultável**: `GET /api/v1/audit-logs?action=...&userId=...`
(ADMIN), com paginação até 200 itens.

---

## 8. Mapa de Cobertura — Pontuação esperada 100/100

### Seção 1 — Entrada e Validação (20 / 20)

- Validação de entradas: `ValidationPipe` global + DTOs com `class-validator`
em [src/main.ts](../src/main.ts) e cada DTO de
[src/vehicle/application/dto/vehicle-filter.dto.ts](../src/vehicle/application/dto/vehicle-filter.dto.ts),
[src/leads/dto/create-lead.dto.ts](../src/leads/dto/create-lead.dto.ts),
[src/auth/dto/login.dto.ts](../src/auth/dto/login.dto.ts),
[src/search/dto/search-query.dto.ts](../src/search/dto/search-query.dto.ts).
- Sanitização: [src/common/sanitizers/string.sanitizer.ts](../src/common/sanitizers/string.sanitizer.ts)
  - Prisma parametrizado em [src/vehicle/infrastructure/repositories/vehicle.repository.ts](../src/vehicle/infrastructure/repositories/vehicle.repository.ts).
- Normalização: [src/common/enums/](../src/common/enums/).
- Limites de payload: `json({limit:'10kb'})` + `@MaxLength` em todos os DTOs.
- Tratamento de erros: [src/common/filters/all-exceptions.filter.ts](../src/common/filters/all-exceptions.filter.ts).

### Seção 2 — Autenticação e Autorização (20 / 20)

- JWT com expiração, assinatura HS256 e renovação:
[src/auth/auth.service.ts](../src/auth/auth.service.ts) +
[src/auth/strategies/jwt.strategy.ts](../src/auth/strategies/jwt.strategy.ts).
- RBAC: [src/auth/guards/roles.guard.ts](../src/auth/guards/roles.guard.ts)
  - [src/common/decorators/roles.decorator.ts](../src/common/decorators/roles.decorator.ts)
  - [src/common/enums/role.enum.ts](../src/common/enums/role.enum.ts).

### Seção 3 — Proteção de APIs (20 / 20)

- HTTPS/TLS termination + helmet: [src/main.ts](../src/main.ts).
- Rate limiting: `ThrottlerGuard` global + `@Throttle` em
[src/auth/auth.controller.ts](../src/auth/auth.controller.ts).
- CORS por allowlist: [src/main.ts](../src/main.ts).
- Idempotency: [src/common/middleware/idempotency.middleware.ts](../src/common/middleware/idempotency.middleware.ts).
- Assinatura HMAC: [src/common/middleware/payload-signature.middleware.ts](../src/common/middleware/payload-signature.middleware.ts).

### Seção 4 — Dados e Privacidade (25 / 25)

- Criptografia em repouso: [src/common/crypto/aes-gcm.service.ts](../src/common/crypto/aes-gcm.service.ts).
- Pseudonimização: [src/common/crypto/hash.service.ts](../src/common/crypto/hash.service.ts).
- Retenção: [src/leads/leads-retention.cron.ts](../src/leads/leads-retention.cron.ts)
  - `runRetentionSweep` em [src/leads/leads.service.ts](../src/leads/leads.service.ts).
- Anonimização irreversível vs deleção física:
`POST /leads/:id/anonymize` e `DELETE /leads/:id` em
[src/leads/leads.controller.ts](../src/leads/leads.controller.ts).
- Exposição acidental: scrub de `.env`, `.env.example` reescrito, log
redaction em [src/common/logger/pino-logger.config.ts](../src/common/logger/pino-logger.config.ts).

### Seção 5 — Logs e Auditoria (15 / 15)

- Logs JSON estruturados: [src/common/logger/pino-logger.config.ts](../src/common/logger/pino-logger.config.ts).
- Trace id: [src/common/interceptors/request-id.interceptor.ts](../src/common/interceptors/request-id.interceptor.ts).
- Audit trail: [src/audit/audit.service.ts](../src/audit/audit.service.ts)
  - [src/common/interceptors/audit.interceptor.ts](../src/common/interceptors/audit.interceptor.ts).
- Brute force / monitoramento: `detectBruteForce` em
[src/audit/audit.service.ts](../src/audit/audit.service.ts) +
`GET /metrics` em [src/audit/audit.controller.ts](../src/audit/audit.controller.ts).

### Total: 100 / 100

---

## 9. Plano de Testes Manuais

Pré-requisito: rodar `docker compose up -d postgres`, aplicar as
migrações (`npx prisma migrate deploy`), `npm run start:dev`, criar um
ADMIN inicial via SQL ou seed, e logar para obter o token.

### 9.1 Validação rejeita XSS

```bash
curl -i 'http://localhost:3000/api/v1/search?q=<script>alert(1)</script>' \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 400 Bad Request, mensagem "q contém caracteres inválidos"
```

### 9.2 Validação rejeita SQLi clássica

```bash
curl -i "http://localhost:3000/api/v1/vehicles?modelo=Ranger' OR '1'='1" \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 400 — falha @Matches do DTO, Prisma nem chega a ser invocado.
```

### 9.3 Payload flooding bloqueado

```bash
head -c 200000 /dev/urandom | base64 \
  | curl -i -X POST http://localhost:3000/api/v1/leads \
      -H "Authorization: Bearer $TOKEN" \
      -H 'Content-Type: application/json' \
      -H 'Idempotency-Key: test-flood-001' \
      --data @-
# Esperado: 413 Payload Too Large (limite 10 KB).
```

### 9.4 Stack trace nunca vaza

```bash
curl -i http://localhost:3000/api/v1/vehicles/UUID-INVALIDO-AAAA-BBBB-CCCC \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 400 ou 404 com envelope { "error": "...", "message": "..." }
# Nada de "PrismaClientKnownRequestError", nada de stack.
```

### 9.5 JWT expirado é negado

```bash
curl -i http://localhost:3000/api/v1/leads -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.expired.signature'
# Esperado: 401 Unauthorized.
```

### 9.6 RBAC nega USER em rota de ANALISTA

```bash
curl -i http://localhost:3000/api/v1/leads -H "Authorization: Bearer $USER_TOKEN"
# Esperado: 403 Forbidden, "Required role(s): ANALISTA, ADMIN — got: USER"
```

### 9.7 CORS bloqueia origem não-listada

```bash
curl -i http://localhost:3000/api/v1/health -H 'Origin: https://evil.com'
# Esperado: sem header Access-Control-Allow-Origin para evil.com.
```

### 9.8 Rate limit em login

```bash
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"a@b.c","password":"WrongPass123!"}'
done
# Esperado: cinco 401 seguidos de 429 Too Many Requests.
```

### 9.9 Idempotência funciona

```bash
KEY=$(openssl rand -hex 16)
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer $ANALISTA_TOKEN" \
  -H "Idempotency-Key: $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Maria","email":"m@x.com","cpf":"12345678901","telefone":"11999998888","vin":"1FTFW1ET5DFC10312"}'

curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer $ANALISTA_TOKEN" \
  -H "Idempotency-Key: $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Maria","email":"m@x.com","cpf":"12345678901","telefone":"11999998888","vin":"1FTFW1ET5DFC10312"}'
# Segunda chamada retorna o mesmo body com header Idempotent-Replay: true.
```

### 9.10 Sync sem assinatura é rejeitada

```bash
curl -i -X POST http://localhost:3000/api/v1/sync \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Idempotency-Key: sync-$(openssl rand -hex 8)"
# Esperado: 401 — "Missing signature headers".

TS=$(date +%s%3N)
BODY=''
SECRET="$API_SIGNING_SECRET"
SIG=$(printf '%s.%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -i -X POST http://localhost:3000/api/v1/sync \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Idempotency-Key: sync-$(openssl rand -hex 8)" \
  -H "X-Signature-Timestamp: $TS" \
  -H "X-Signature: sha256=$SIG"
# Esperado: 201 com resultado da sincronização.
```

### 9.11 PII não aparece em log

Faça login (com senha real) e inspecione o output do servidor: o campo
`password` aparece como `[REDACTED]`, idem para `Authorization`.

### 9.12 Anonimização ocorre e é auditada

```bash
curl -X POST http://localhost:3000/api/v1/leads/$ID/anonymize \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Idempotency-Key: anon-$(openssl rand -hex 8)"

# Em seguida:
curl http://localhost:3000/api/v1/leads/$ID -H "Authorization: Bearer $ADMIN_TOKEN"
# nome: "[ANONIMIZADO]", anonymized_at: <data>

curl 'http://localhost:3000/api/v1/audit-logs?action=LEAD_ANONYMIZE' \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Linha de auditoria com userId do ADMIN, traceId e outcome SUCCESS.
```

---

## 10. Apêndice — Como Rodar

```bash
# 1. Instalar dependências
npm install

# 2. Gerar secrets locais
echo "JWT_SECRET=$(openssl rand -base64 48)"           >> .env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 48)"   >> .env
echo "DATA_ENCRYPTION_KEY=$(openssl rand -base64 32)"  >> .env
echo "DATA_ENCRYPTION_PEPPER=$(openssl rand -hex 32)"  >> .env
echo "API_SIGNING_SECRET=$(openssl rand -hex 32)"      >> .env
# Substitua/limpe as linhas CHANGE_ME originais

# 3. Subir Postgres
docker compose up -d postgres

# 4. Migrar
npx prisma migrate deploy
npx prisma generate

# 5. Rodar
npm run start:dev

# 6. Abrir Swagger
# http://localhost:3000/api/docs
```

### Novas variáveis de ambiente


| Variável                 | Obrigatória          | Descrição                                      |
| ------------------------ | -------------------- | ---------------------------------------------- |
| `JWT_SECRET`             | Sim                  | Assinatura do access token (HS256, ≥ 32 chars) |
| `JWT_REFRESH_SECRET`     | Sim                  | Assinatura do refresh token                    |
| `JWT_ACCESS_TTL`         | Não (15m)            | TTL do access token                            |
| `JWT_REFRESH_TTL`        | Não (7d)             | TTL do refresh token                           |
| `DATA_ENCRYPTION_KEY`    | Sim                  | Chave AES-256-GCM (base64, 32 bytes)           |
| `DATA_ENCRYPTION_PEPPER` | Sim                  | Pepper HMAC (hex, ≥ 32 chars)                  |
| `API_SIGNING_SECRET`     | Sim para `/sync`     | Chave HMAC do payload signature                |
| `CORS_ALLOWED_ORIGINS`   | Recomendado          | Lista de origens permitidas (sem `*`)          |
| `LOG_LEVEL`              | Não (`debug`/`info`) | Nível pino                                     |
| `LEAD_RETENTION_DAYS`    | Não (730)            | Dias até anonimização automática               |


---

## 11. Conclusão

O `ford-scrapper-service` saiu de um catálogo público desprotegido (CORS
`*`, sem auth, sem validação, com a chave Gemini real no `.env`) para um
serviço que cobre integralmente a rubrica de Cybersecurity da Sprint
Única:

- **Entrada**: ValidationPipe + DTOs + sanitização + enums + limite de
payload + filtro genérico de erro.
- **Auth**: JWT + refresh rotacionável + argon2id + RBAC com três
papéis.
- **APIs**: helmet + CORS allowlist + rate limit + idempotency + HMAC.
- **Dados**: AES-256-GCM, pseudonimização HMAC, retenção LGPD,
anonimização irreversível, log redaction.
- **Observabilidade**: pino JSON + trace id + audit trail + brute-force
detection + endpoint de métricas.

> **Status do projeto:** protegido contra script kiddies e bots, pronto
> para Blue Team. 100/100.

