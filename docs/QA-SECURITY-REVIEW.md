# Revisão de QA e segurança — MVP Ford One

Data: 10/09/2026 · Branch: `fix/qa-seguranca` (nos dois repositórios)

## Por que esta revisão existe

O dealership acabou de ser ligado aos contratos reais da API. A integração havia
sido validada por scripts descartáveis e um autocheck caseiro — nada que rodasse
por comando, nada em CI, e o backend sem nenhum teste além de três specs de
scaffold.

Dois bugs da própria integração mostraram o custo disso: `limit=200` tomava 400
por causa de um `@Max(100)` no DTO de paginação e só apareceu quando a API subiu;
e o espelho de permissões do frontend (`can.ts`) só pôde ser conferido contra o
backend rodando à mão. São classes de bug que uma suíte de integração pega de
graça.

A revisão partiu também de uma dúvida concreta do time: *"a documentação do
Swagger diz que tem 2 registros de operadores"*.

---

## A dúvida dos "2 registros de operadores"

**O Swagger nunca afirmou isso.** `GET /colaboradores` declara
`@ApiResponse({ status: 200 })` **sem `type`**
(`src/colaborador/presentation/colaborador.controller.ts:53`), então não existe
nem schema de resposta onde um número pudesse aparecer. Nenhum arquivo dos dois
repositórios documenta uma contagem de colaboradores.

O "2" vem do **log do seed**. `prisma/seed.ts:150` imprime
`${COLABORADORES_SEED.length} colaboradores de exemplo` → *"2 colaboradores de
exemplo"*. Esse array contém apenas o GERENTE e o FUNCIONARIO; o ADMIN é criado
por `seedAdmin()` (`prisma/seed.ts:54-91`) e não entra na contagem.

**O total real é 3**, confirmado por consulta ao banco:

| role | email | registro | ativo |
|---|---|---|---|
| ADMIN | admin@ford.com.br | FRD-ADMIN-001 | sim |
| GERENTE | ricardo.costa@ford.com.br | FRD-GER-001 | sim |
| FUNCIONARIO | patricia.oliveira@ford.com.br | FRD-FUN-001 | sim |

Travado por `test/colaboradores.e2e-spec.ts`, que roda o seed de verdade e afirma
`count() === 3` com um colaborador por papel. O log do seed foi corrigido.

Efeito colateral descoberto no mesmo caminho: a tela de login oferecia, em um
clique, `ford.phasex@ford.com.br` / `FordPhasex@2026` — um colaborador que o seed
nunca cria. Quem seguisse a própria interface tomava 401.

---

## A suíte

| Onde | Ferramenta | Arquivos | Testes |
|---|---|---|---|
| Backend, unitários | jest (ESM, já configurado) | 5 | 22 |
| Backend, E2E de API | jest + `@nestjs/testing` + supertest | 10 | 254 |
| Frontend (dealership) | Vitest + Testing Library | 4 | 23 |

O E2E sobe o `AppModule` em processo e **replica a configuração do `main.ts`** —
prefixo `/api`, `ValidationPipe` com whitelist/forbidNonWhitelisted e
`HttpExceptionFilter`. Sem isso a suíte validaria uma aplicação diferente da que
roda em produção, e justamente os testes de validação passariam por engano.

Banco isolado: `globalSetup` cria um banco dedicado e aplica as migrations.
`TEST_DATABASE_URL` permite execuções paralelas sem truncar os dados uma da
outra. O banco de desenvolvimento não é tocado.

Duas armadilhas que o desenho contorna de propósito:

- **Rate limit.** `POST /auth/login` é 5/60s e o `ThrottlerGuard` é global
  (60/min). A matriz de RBAC faz centenas de requisições, então o armazenamento
  do throttler é substituído por stub — `overrideGuard` não alcança guard
  registrado via `APP_GUARD`. Os testes que *medem* rate limit pedem uma
  instância com o throttler real.
- **Scraping.** Os casos que provam P0-1 passam pelo guard hoje, ou seja, as
  requisições de teste **executariam um crawl real** do ford.com.br e gastariam
  cota paga do Gemini. `ScrapperService` e `SyncService` são stubados sempre.

### Comandos

```bash
cd ford-scrapper-service
npm ci && npm run prisma:generate
npm test          # unitários
npm run test:e2e  # E2E de API

cd ford-one/main/dealership
npm test
```

---

## Achados

Severidade: P0 = explorável com impacto grave; P1 = impacto real, exploração
condicionada; P2 = correção devida, risco contido.

### P0

| # | Achado | Teste que trava |
|---|---|---|
| P0-1 | `/scrapper/sync` e `/scrapper/ford` sem `RolesGuard` nenhum. Como o `RolesGuard` é por controller e sua ausência significa "qualquer papel autenticado", um FUNCIONARIO dispara crawl completo do ford.com.br, downloads de PDF e **chamadas pagas ao Gemini** — burlando o `@Roles(ADMIN)` do `POST /sync` equivalente. Com throttle global de 60/min, um único usuário mantém 60 crawls em voo. | `rbac.e2e-spec.ts` (4 casos) |
| P0-2 | **XSS armazenado sem autenticação → roubo de token de ADMIN.** `POST /public/leads` é público e não sanitiza `nome`; vira `Lead.clienteNome`; a busca global do dealership renderiza com `dangerouslySetInnerHTML`. O `highlight()` escapa metacaractere de *regex*, não HTML. O JWT mora em `localStorage`. O projeto **já tem** `stripXss`, chamado em um único lugar que não é caminho de escrita. | `public-endpoints.e2e-spec.ts` (6 casos) + `GlobalSearch.spec.tsx` (2 casos) |
| P0-3 | GERENTE escala para ADMIN em uma requisição: `PATCH /colaboradores/:id` aceita GERENTE e o DTO permite `role` e `senha`, aplicados sem nenhuma lógica de autorização. Também permite trocar a senha de um ADMIN. | `rbac.e2e-spec.ts` (2 casos) |
| P0-4 | Senhas em texto claro versionadas: `GerenteFord@2026` e `FuncFord@2026` no seed, `ADMIN_SENHA=AdminFord@2026` no `.env.example`. Quem lê o repositório tem login GERENTE — que encadeia em P0-3. | — (correção direta) |
| P0-5 | Swagger UI aberto: `SwaggerModule.setup` monta no Express, fora dos guards do Nest, sem checar `NODE_ENV`; `/` e `/api` redirecionam para lá. Entrega o inventário completo de rotas, DTOs e papéis. | `docs.e2e-spec.ts` |

### P1

| # | Achado | Teste que trava |
|---|---|---|
| P1-1 | Revogação impossível por até 8h: `JwtStrategy.validate` monta o usuário do payload sem ler o banco; `ativo` só é checado no login e `DELETE` é soft delete. Demitido ou rebaixado mantém acesso. `findById` e `countAdmins` existem e nunca são chamados. | `business-rules.e2e-spec.ts` (2 casos) |
| P1-2 | **Todos os filtros de listagem retornam 400.** `forbidNonWhitelisted` + `@Query() pagination: PaginationQueryDto` valida o objeto de query inteiro contra o DTO de paginação, então qualquer chave extra estoura. `?status=`, `?search=`, `?segmento=`, `?urgencia=`, `?condicao=`, `?ativo=`, `?role=`, `?notaMin=` — todos documentados em `@ApiQuery`, nenhum funciona. Passou despercebido porque o frontend manda apenas `limit`. | `validation.e2e-spec.ts` (10 casos) |
| P1-3 | `POST /avaliacoes` é escrita anônima sem throttle próprio (herda 60/min, contra 3/min da outra rota pública) e, com o `AuditInterceptor`, cada requisição custa dois inserts — um `Avaliacao` e um `AuditLog` sem autor, em tabela sem retenção. | `public-endpoints.e2e-spec.ts` (2 casos) |
| P1-4 | Valores financeiros aceitos sem recálculo: `parcela` chega do cliente e é gravada como veio; a tabela Price roda só no frontend. Dá para gravar `valor: 200000, entrada: 0, prazo: 48, parcela: 1`. Sem invariante entre campos — `entrada` pode exceder `valor`. | `business-rules.e2e-spec.ts` (2 casos) |
| P1-5 | Lockout total possível: desativar o único ADMIN deixa o sistema sem caminho para criar outro, já que `register` exige ADMIN. A guarda existe pela metade — `countAdmins()` é código morto. | `business-rules.e2e-spec.ts` |
| P1-6 | Tela de login oferecia credencial inexistente (`ford.phasex@ford.com.br`). | — (corrigido) |

### P2

`Meta.atual` e `Cliente.ltv` são campos derivados definidos pelo cliente ·
chaves de negócio (`codigo`, `numero` da OS) geradas no frontend e colidindo sob
concorrência · `sla: 2.3` literal no dashboard e `agendamentos` contando ordens
de serviço · DTOs numéricos sem `@Max` · `Estoque.status` string livre onde o
resto usa enum · `opcionais` array sem teto · oráculo de enumeração de usuário no
login (argon2 só roda se o email existe) · sem lockout real, só alerta em log ·
throttle burlável por `X-Forwarded-For` sem proxy na frente · `Map` de falhas de
login sem teto, indexado por dado do atacante · SSRF de segunda ordem e ausência
de cap de bytes no downloader de PDF · `CreateVehicleDto` é `interface`, então a
ingestão do scraper não tem validação em runtime · CPF em texto claro sob LGPD
com `AesGcmService`/`HashService` implementados e sem nenhum chamador · token no
fragmento da URL no salto portal → dealership.

---

## Remediação

Três desenvolvedores trabalharam em fatias de arquivos disjuntas, em paralelo,
com bancos de teste separados. O critério de pronto foi a suíte acima passar —
nenhum teste podia ser afrouxado, e editar arquivo de teste era proibido.

### P0-1 · scrapper sem RolesGuard

`@UseGuards(RolesGuard)` + `@Roles(Role.ADMIN)` no controller, mais uma trava de
execução única que devolve 409 em vez de empilhar crawls e chamadas ao Gemini.
O laço de sincronização ganhou `try/catch` por veículo, para um veículo recusado
não abortar a coleta inteira.

### P0-2 · XSS armazenado

Corrigido nas duas pontas, porque cada uma sozinha seria insuficiente.

No servidor, um decorator `SanitizeFreeText(maxLen)` aplica o `safeFreeText` que
já existia, na fronteira do DTO — cobre todo caminho de escrita em vez de um
controller. Roda no `plainToInstance`, antes dos validadores, então um nome feito
só de markup colapsa para vazio e cai no `MinLength` como 400. Aplicado nos DTOs
de lead público, avaliação e também nas rotas autenticadas que alimentam os
mesmos campos renderizados.

No dealership, `highlight()` passou a devolver nós React (`split` com grupo de
captura, índices ímpares embrulhados em `<mark>`) e o `dangerouslySetInnerHTML`
saiu. O realce continua funcionando — há teste para isso.

### P0-3 · escalada de privilégio · P1-1 · revogação · P1-5 · lockout

Ver relato do agente de identidade no histórico do PR.

### P1-2 · filtros mortos

Um DTO de query por endpoint, estendendo `PaginationQueryDto` e declarando os
próprios filtros validados; os controllers passaram a vincular um único
`@Query() query: XQueryDto`. O pipe global **não** foi relaxado — fazer isso
reabriria mass assignment em toda a API. De passagem, `notaMin`/`notaMax` de
avaliações ganharam validação real de faixa (1–5), onde antes havia um
`Number(...)` sem limite.

### P1-3 · escrita anônima em `/avaliacoes`

O `AuditInterceptor` saiu do controller inteiro e voltou apenas em `PATCH` e
`DELETE`, então POST anônimo não grava mais `AuditLog` sem autor. A rota pública
ganhou `@Throttle` de 5/min, alinhada com os 3/min da outra rota pública.

### P1-4 · valores financeiros

A tabela Price passou a ser recalculada no servidor, com rejeição de divergência
e de `entrada > valor`, e a validação vale também no `PATCH` — remendar só a
`taxa` ou só a `parcela` era o mesmo furo. A tolerância é de 1% da parcela
recalculada, piso de R$ 1: a convenção de arredondamento do frontend difere em
0,17% no caso do seed, e 1% ainda recusa qualquer valor forjável (uma parcela de
R$ 1 num contrato de R$ 200 mil).

### P2 · campos derivados e chaves de negócio

`ltv` e `veiculosCount` saíram do DTO de criação de cliente, mantidos no PATCH
com limites porque nada no schema consegue derivá-los — `Financiamento` liga a
`Cliente` por nome, não por chave estrangeira. `Meta.atual` é aceita e ignorada,
gravada como 0.

`codigo` (clientes, estoque, metas, financiamentos) e `numero` (ordens de
serviço) passaram a ser gerados no servidor, em sequência, com retry no `P2002` —
a autoridade é o `@unique` do banco. Chaves explícitas continuam aceitas e
continuam dando 409 em duplicata. O frontend parou de gerar
`C${Date.now()}`, e o toast de criação de OS agora cita o número que o servidor
devolveu, em vez de um palpite que podia divergir do gravado.

### P2 · KPIs do dashboard

`sla` passou a ser a média de horas entre abertura e conclusão das ordens
concluídas no período, 0 quando não há nenhuma. O schema não tem `concluidoEm`,
então o fim é o `updatedAt` — marcado com comentário `ponytail:` apontando o
caminho de evolução. `agendamentos` passou a contar ordens em `PREVISTO` em vez
de todas, e `conversao` herdou o numerador corrigido mantendo a guarda de
divisão por zero.

`receita` continua somando apenas contratos de financiamento: `OrdemServico.valor`
é `String` ("R$ 3.800"), então receita de serviço não é somável. Corrigir exige
migração para `Decimal` ou centavos, registrada como pendência.

### Limites e enums

`@Max` em todos os campos numéricos dos módulos revisados; `@Min(0)` adicionado
em `Meta.atual`/`alvo`; `taxa` limitada a 100 e `prazo` a 120; `Estoque.status`
virou enum `EstoqueStatus`, cobrindo os valores do seed; `opcionais` ganhou
`@ArrayMaxSize(40)` e limite por elemento.

### Três erros encontrados no próprio trabalho de QA

Vale registrar, porque o processo só funcionou por causa deles.

**A matriz de RBAC disparava crawls reais.** A primeira execução travou em dois
minutos. Os casos que provam P0-1 esperam 403 e, como a falha é real, as
requisições **passavam** e rodavam coletas de verdade no ford.com.br consumindo
cota do Gemini. Um teste de autorização não pode executar a operação cara que
está tentando proibir. `ScrapperService` e `SyncService` passaram a ser stubados
sempre — o que depois permitiu também remover os cinco `it.skip` que existiam só
por medo do I/O externo.

**O teste de `AuditLog` consultava coluna inexistente.** Usava `colaboradorId`,
quando o nome é `userId`. O Prisma lançava erro de validação antes de contar
qualquer coisa, então o teste falhava independentemente do comportamento da
aplicação.

**A fixture de colaborador gerava CPF inválido.** O CPF saía de
`` `529982247${s.padStart(2,'0')}` ``, que só funciona com sufixo numérico de até
dois caracteres. Com `'inativo'` virava `529982247inativo`, com `'p'` virava
`5299822470p` — o POST tomava 400 e, como a matriz de RBAC só afirma "não é 403",
**os casos de ADMIN passavam sem provar que o ADMIN consegue criar**. Passou a
derivar 11 dígitos de qualquer sufixo.

Os três foram reportados pelos desenvolvedores **sem editar o teste**, que era a
regra imposta. Isso importa: um agente mais solícito teria "consertado" o teste e
enterrado os bugs junto.

## Estado final

| | Antes | Depois |
|---|---|---|
| Backend, E2E de API | 208/254, 41 falhas, 5 skip | **254/254**, zero falha, zero skip |
| Backend, unitários | 22/22 | **22/22** |
| Backend, `tsc --noEmit` | 5 erros pré-existentes | **0** |
| Dealership | 21/23 | **23/23**, `tsc` limpo, build ok |
| Portal | — | `tsc` limpo, build ok |

Banco de desenvolvimento intacto: 10 clientes, 8 estoque, 6 leads, 12 OS,
6 metas, 5 financiamentos, 5 avaliações, 6 técnicos, 3 colaboradores.

Diff para revisão: 54 arquivos rastreados + 28 novos no backend; 10 + 3 no
frontend (dos quais 1337 linhas são `package-lock.json` do Vitest). Nada
commitado.

## O que o time acertou

Vale registrar, porque são coisas que não devem regredir:

- **Zero SQL cru** em todo o código — só o query builder do Prisma. A superfície
  de injeção é genuinamente nula, e `stripSqlMeta` é, na prática, código morto.
- **Nenhum corpo de requisição, senha ou token em log algum.** O
  `LoggingMiddleware` registra só método, rota, status, duração, IP e UA.
- `HttpExceptionFilter` não vaza stack trace: exceções não-HTTP colapsam em
  mensagem genérica e o stack vai só para o logger.
- A implementação de AES-GCM é correta — IV aleatório de 96 bits por chamada,
  chave validada em exatamente 32 bytes, `setAuthTag` antes do `final()`. Falta
  apenas ter um chamador.
- `JWT_SECRET` falha fechado nos dois pontos de leitura, com algoritmo fixado em
  HS256 e `ignoreExpiration: false`.
- O `ValidationPipe` global com `whitelist: true` é o que torna sobrevivível o
  padrão `data: dto` espalhado pelos repositórios.

---

## Escopo deixado de fora, com motivo

- **Ausência de FK de dono** em `Cliente`, `Lead`, `OrdemServico` e
  `Financiamento`: qualquer FUNCIONARIO lê e escreve a carteira inteira. Não é
  IDOR clássico — não existe fronteira para atravessar. Pode ser decisão
  consciente de MVP, mas precisa ser **decisão registrada**, porque adicionar
  escopo por consultor depois é migração, não guard.
- **Cifrar CPF**: exige migração e decisão sobre rotação de chave.
- **E2E de navegador**: os containers do portal e do dealership foram buildados
  apontando para `localhost:3000`, porta ocupada por outro projeto na máquina de
  desenvolvimento.
- **Histórico de veículos do cliente** e **agenda**: não existem endpoints; são
  decisão de produto, já registradas no handoff.

---

## Notas de ambiente encontradas no caminho

1. **Falta o `.env`.** O arquivo preenchido chama-se `env`, sem ponto. O Compose
   só lê `.env`, então todo `${VAR:-default}` cai no default vazio e o backend
   morre no boot com `GEMINI_KEY not configured`.
2. **Porta 3000 ocupada** por outro projeto na máquina, que responde a
   `/api/health` e não é este serviço.
3. **Porta 5432 do host não é o container.** Há um postgres local escutando em
   `127.0.0.1:5432`; o `ford-postgres` não ganha a porta. O banco de teste foi
   criado nesse postgres local, não no container — isolado do banco de
   desenvolvimento do Ford, mas convivendo com outros projetos. Remover com
   `DROP DATABASE ford_test;`.
4. **Senha do admin** é `AdminFord@2026` (o seed registra "senha padrao em uso"),
   não o `ADMIN_SENHA` do arquivo `env`.
