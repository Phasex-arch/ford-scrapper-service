# Política de segurança

## Versões suportadas

| Versão | Suporte |
| --- | --- |
| branch `dev` (produção no Render) | ✅ correções de segurança |
| outros branches e forks | ❌ |

## Como reportar uma vulnerabilidade

**Não abra issue pública** para vulnerabilidade: ela fica visível para qualquer pessoa antes da correção.

Use o reporte privado do GitHub: aba **Security and quality → Advisories → Report a vulnerability**, ou direto em
<https://github.com/Phasex-arch/ford-scrapper-service/security/advisories/new>.

O reporte é mais útil se incluir:

- o endpoint ou arquivo afetado;
- os passos para reproduzir (requisição, payload, perfil de usuário usado);
- o impacto esperado (ex.: acesso a dado de outro perfil, bypass de autenticação);
- se possível, uma sugestão de correção.

## O que esperar

| Etapa | Prazo |
| --- | --- |
| Confirmação de recebimento | até 3 dias úteis |
| Avaliação inicial e severidade | até 7 dias úteis |
| Correção de severidade crítica ou alta | até 30 dias |

O tratamento segue o plano de resposta a incidentes de [`docs/CYBERSECURITY-SPRINT3.md`](docs/CYBERSECURITY-SPRINT3.md#33-plano-de-resposta-a-incidentes). Quem reportou recebe o crédito no advisory publicado depois da correção, se quiser.

## Escopo

**Dentro do escopo:** a API deste repositório (`/api/*`), incluindo autenticação, autorização por perfil, validação de entrada, exposição de dados pessoais, criptografia do CPF e o pipeline em `.github/workflows/`.

**Fora do escopo:**

- negação de serviço e testes de carga contra o ambiente de produção (o plano gratuito do Render não suporta);
- engenharia social contra o time ou contra usuários;
- vulnerabilidades em dependências já reportadas pelo Dependabot (acompanhe a aba Security);
- achados que só funcionam com credenciais de ADMIN legítimas.

## Pesquisa de boa-fé

Não tomaremos medidas contra quem pesquisar e reportar de boa-fé seguindo esta política: sem acessar, alterar ou apagar dados de terceiros além do mínimo necessário para demonstrar o problema, e sem divulgar antes da correção.
