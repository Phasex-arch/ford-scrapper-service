# Contratos de integração — Ford One

Este documento define o contrato HTTP consumido pelo portal e pelo dealership.
O backend é a fonte de verdade para os DTOs, regras de validação e permissões.
O frontend deve adaptar respostas HTTP para modelos de apresentação sem expor DTOs
diretamente aos componentes.

## Convenções

- Prefixo da API: `/api`
- Autenticação: `Authorization: Bearer <accessToken>`
- Identificadores de recursos: UUID
- Exceção: `GET /vehicles/{identifier}` aceita UUID ou slug do catálogo
- Listagens usam:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  },
  "data": []
}
```

- Erros seguem o envelope padronizado da API e devem ser tratados por status:
  - `400`: payload ou parâmetro inválido;
  - `401`: token ausente, inválido ou expirado;
  - `403`: role sem permissão;
  - `404`: recurso inexistente;
  - `409`: conflito de unicidade.

## Autenticação

### `POST /auth/login`

Request:

```json
{
  "email": "ford.phasex@ford.com.br",
  "senha": "FordPhasex@2026"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "tokenType": "Bearer",
  "expiresIn": 28800,
  "user": {
    "id": "uuid",
    "nome": "Ford Phasex",
    "email": "ford.phasex@ford.com.br",
    "role": "ADMIN"
  }
}
```

### `GET /auth/me`

Retorna o usuário autenticado:

```json
{
  "id": "uuid",
  "nome": "Ford Phasex",
  "email": "ford.phasex@ford.com.br",
  "role": "ADMIN"
}
```

## Dashboard

### `GET /dashboard?periodo=hoje|semana|mes|trimestre`

```json
{
  "periodo": "mes",
  "intervalo": {
    "inicio": "2026-08-12T00:00:00.000Z",
    "fim": "2026-09-12T00:00:00.000Z"
  },
  "kpis": {
    "leads": 10,
    "agendamentos": 4,
    "receita": 299900,
    "conversao": 40,
    "sla": 2.3,
    "nota": 4.8,
    "estoque": 9
  },
  "breakdown": {
    "leadsPorUrgencia": {},
    "servicosPorStatus": {},
    "financiamentosPorStatus": {}
  },
  "geradoEm": "2026-09-12T16:00:00.000Z"
}
```

## Clientes

### `GET /clientes`

Query params opcionais:

```text
page, limit, status, segmento, search
```

### `POST /clientes`

Campos obrigatórios:

```json
{
  "codigo": "C001",
  "nome": "Carlos Eduardo Mendes",
  "telefone": "(11) 98245-1122",
  "email": "carlos.mendes@gmail.com",
  "iniciais": "CM",
  "segmento": "Premium"
}
```

Campos opcionais:

```json
{
  "ultimaVisita": "2026-09-12T12:00:00.000Z",
  "status": "ATIVO",
  "veiculosCount": 0,
  "ltv": 0
}
```

### `GET|PATCH|DELETE /clientes/{uuid}`

O parâmetro é UUID. `PATCH` recebe apenas os campos que serão alterados.
`DELETE` é permitido para `ADMIN` e `GERENTE`.

## Estoque

### `GET /estoque`

Query params opcionais:

```text
page, limit, condicao, segmento, search
```

### `POST /estoque`

Campos obrigatórios:

```json
{
  "codigo": "E001",
  "modelo": "Ford Bronco Sport",
  "versao": "Badlands 2.0 EcoBoost AT6",
  "ano": "2026",
  "motor": "2.0 EcoBoost 250 cv",
  "transmissao": "Automatico 6 vel.",
  "condicao": "NOVO",
  "preco": 209900,
  "segmento": "SUV",
  "cor": "Azul Arizona"
}
```

### `GET|PATCH|DELETE /estoque/{uuid}`

O parâmetro é UUID. Alterações de estoque devem atualizar a listagem local após
sucesso e exibir erro de conflito ou permissão sem mascarar a falha.

## Leads

### `GET /leads`

Query params opcionais:

```text
page, limit, urgencia, search
```

### `POST /leads`

Campos obrigatórios:

```json
{
  "codigo": "L001",
  "clienteNome": "Carlos Silva",
  "iniciais": "CS",
  "veiculoInteresse": "Ford Ranger Storm 2026",
  "necessidade": "Upgrade de picape",
  "urgencia": "URGENTE",
  "valorEstimado": 299900,
  "telefone": "(11) 97788-4411"
}
```

Campo opcional:

```json
{
  "insight": "Cliente com histórico de troca."
}
```

### `GET|PATCH|DELETE /leads/{uuid}`

O parâmetro é UUID. O frontend deve diferenciar o lead interno deste endpoint
do lead público criado em `/public/leads`.

## Lead público

### `POST /public/leads`

Este endpoint não exige autenticação. Ele persiste o lead e dispara a
notificação pelo Resend. Falha de email não deve apagar o lead persistido.

## Colaboradores

### `GET /colaboradores`

Permitido para `ADMIN` e `GERENTE`.

### `POST /colaboradores`

Permitido somente para `ADMIN`. Este é o único endpoint de criação de
colaboradores.

### `GET|PATCH|DELETE /colaboradores/{uuid}`

O parâmetro é UUID. Não utilizar `/auth/register`.

## Regras para o frontend

1. Serviços HTTP devem lidar com DTOs de API e retornar modelos de domínio do
   módulo.
2. Componentes não devem conhecer envelopes como `pagination` ou nomes internos
   do Prisma.
3. Normalização de resposta deve ocorrer uma única vez no service/adapter.
4. Nenhuma operação de escrita deve aceitar `id` numérico.
5. Após mutação bem-sucedida, invalidar ou atualizar a fonte da listagem.
6. Erros `401` e `403` devem ser tratados centralmente e também comunicados na
   tela quando a ação for explícita.
