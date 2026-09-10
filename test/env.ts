/**
 * @file test/env.ts
 * @description Variáveis de ambiente da suíte, carregadas por `setupFiles` — ou
 * seja, em cada worker do jest, antes de qualquer import do código da aplicação.
 *
 * Isso é obrigatório e não decorativo: `PrismaService` lê
 * `process.env.DATABASE_URL` **no construtor** (prisma/prisma.service.ts), então
 * não existe como apontar o banco por injeção de dependência depois.
 */

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/ford_test';

// Segredos determinísticos — a app falha fechado se faltarem.
process.env.JWT_SECRET = 'suite-de-teste-segredo-com-mais-de-32-caracteres';
process.env.JWT_EXPIRES_IN = '8h';

// NODE_ENV fica fora de 'production' para que o ValidationPipe devolva as
// mensagens de erro que os testes de validação inspecionam.
process.env.NODE_ENV = 'test';

// Resend precisa estar configurado — o PublicLeadService checa as três variáveis
// ANTES de persistir e devolve 503 se faltarem. Sem isso o lead nunca chega ao
// banco e os testes de sanitização passariam sem testar nada.
// O envio em si é interceptado no spec, via stub de global.fetch.
process.env.RESEND_API_KEY = 're_chave_de_teste';
process.env.RESEND_FROM_EMAIL = 'naoresponda@teste.local';
process.env.LEAD_NOTIFICATION_EMAIL = 'qa@teste.local';

// GEMINI_KEY precisa existir: GeminiReaderService lança no construtor, e sem ela
// o AppModule inteiro não sobe (achado do levantamento).
process.env.GEMINI_KEY = 'chave-de-teste-nao-usada';

process.env.ADMIN_EMAIL = 'admin@ford.com.br';
process.env.ADMIN_SENHA = 'AdminFord@2026';
