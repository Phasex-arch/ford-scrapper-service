# 05 — Documentação da API e tratamento de erros

> Critério: **Documentação e Tratamento de Erros (10%)** — documentação OpenAPI/Swagger, padronização das
> respostas de erro e README com instruções de execução.

## 1. Documentação OpenAPI / Swagger

| Item | Valor |
|---|---|
| Interface interativa | `http://localhost:3000/api/docs` (produção: `https://ford-backend-pdvb.onrender.com/api/docs`) |
| Contrato em JSON | `http://localhost:3000/api/docs-json` |
| Cobertura | **OpenAPI 3.0 · 53 caminhos · 88 operações · 17 tags** (uma por módulo) |
| Segurança | esquema Bearer `JWT` — botão **Authorize** guarda o token (`persistAuthorization`) |
| Modelos | DTOs de entrada com `@ApiProperty` (exemplos e restrições), incluindo os DTOs de query do catálogo |
| Erros | Todo controller protegido documenta **401, 403 e 404** com o schema `ErrorResponseDto` (decorator `@ApiStandardErrors()` em `src/common/swagger/api-standard-errors.decorator.ts`); operações específicas acrescentam 400/409/429 |

**Como usar:** abrir `/api/docs` → `POST /auth/login` → *Try it out* → copiar o `accessToken` → **Authorize** →
colar o token → testar qualquer rota protegida. Rota sem permissão mostra o `403` documentado.

Exemplos executáveis fora do Swagger: [`requests.http`](../requests.http).

## 2. Padronização das respostas de erro

**Todo** erro da API (validação, autenticação, autorização, não encontrado, conflito, limite de taxa,
falha interna) passa por um único filtro global, `HttpExceptionFilter`
(`src/common/filters/http-exception.filter.ts`, registrado em `src/main.ts`), e sai neste formato:

```json
{
  "statusCode": 403,
  "message": "Permissao insuficiente para este recurso",
  "error": "ForbiddenException",
  "path": "/api/audit-log",
  "timestamp": "2026-09-25T13:31:04.878Z",
  "requestId": "3720ec7f-6b91-45e5-9da3-d1e9a94bff69"
}
```

| Campo | Significado |
|---|---|
| `statusCode` | Mesmo status HTTP da resposta |
| `message` | Texto para o cliente; **lista de strings** em erro de validação (400) |
| `error` | Nome da exceção (`UnauthorizedException`, `NotFoundException`...) |
| `path` / `timestamp` | Onde e quando aconteceu |
| `requestId` | Identificador da requisição (vem do header `X-Request-Id`/middleware) para rastrear no log |

### Exemplos reais (capturados da API)

| Situação | Resposta |
|---|---|
| Sem token | `401` · `Nao autenticado` |
| Perfil sem permissão | `403` · `Permissao insuficiente para este recurso` |
| Recurso inexistente | `404` · `Cliente nao encontrado` |
| Id malformado | `400` · `Validation failed (uuid is expected)` |
| Login errado | `401` · `Credenciais invalidas` |
| Excesso de tentativas | `429` · `ThrottlerException: Too Many Requests` |

### Decisões de segurança no tratamento de erro

- **Sem vazamento interno:** exceção não prevista vira `500` com a mensagem genérica
  `Erro interno do servidor`; a stack trace vai só para o log do servidor.
- **Mensagem única no login:** senha errada, e-mail inexistente e usuário inativo respondem igual
  (`Credenciais invalidas`), para não permitir enumerar contas.
- **401 sem motivo:** token expirado e token inválido respondem igual (`Nao autenticado`); o motivo real
  fica no log de segurança.
- **Produção esconde detalhes de validação:** com `NODE_ENV=production` o `ValidationPipe` roda com
  `disableErrorMessages` (o corpo inválido responde `Bad Request`); em desenvolvimento/testes a lista completa
  de campos inválidos é devolvida.

## 3. README com instruções de execução

- [`README.md`](../README.md) — pré-requisitos, instalação, variáveis
  de ambiente, migrations, execução local e via Docker Compose, tabela de endpoints com a proteção de cada um,
  seção **Autenticação e autorização**, comandos de teste.
- [`README.md`](./SPRINT-3.md) (esta pasta) — índice da entrega, como subir tudo e onde está a evidência de cada critério.
