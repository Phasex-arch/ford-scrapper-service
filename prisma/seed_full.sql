-- ============================================================================
-- Ford One — Seed completo de dados de negócio (dealership)
--
-- Limpa todo o lixo de teste acumulado (contas RBAC de teste, leads públicos
-- de teste, item de estoque de teste, agendamentos de teste, audit log) e
-- repopula o sistema com um conjunto coerente e realista de dados, cobrindo
-- todas as telas e casos de uso do painel:
--   - Dashboard: KPIs, deltas período-a-período, série de 6 meses (receita/
--     conversão/meta), os 4 alertas operacionais (SLA em risco, estoque
--     baixo, lead prioritário, meta atingida)
--   - Receita: confirmada vs pipeline, categorias (financiamentos/serviços),
--     série trimestral
--   - Desempenho: retenção, produtividade, ranking de consultores (com um
--     consultor sem lead atribuído no mês — 0% real, não escondido),
--     retenção mensal
--   - Leads: todas as urgências, leads sem responsável (pra testar "Assumir
--     lead"), leads convertidos em financiamento
--   - Financiamentos: os 4 status (APROVADO/ANALISE/PENDENTE/REPROVADO),
--     com e sem lead de origem, com e sem consultor responsável
--   - Serviços/Agenda: os 4 status de ordem (PREVISTO/ANDAMENTO/CONCLUIDO/
--     CANCELADO) e as 3 prioridades (OK/RISCO/ATRASADO); técnicos nos 4
--     status (LIVRE/OCUPADO/PAUSA/AUSENTE); agendamentos nos 3 status
--   - Clientes/Histórico: os 3 status, posse de veículos com troca/venda
--   - Estoque: NOVO/SEMINOVO, item com quantidade baixa (aciona alerta)
--   - Avaliações: nota de 2 a 5 (não só nota alta)
--   - Metas: mix de metas batidas e não batidas, incl. indicador
--     "lowerIsBetter" (SLA)
--
-- NÃO toca em: Colaborador admin/gerente/funcionario originais (login em
-- uso), ConfiguracaoConcessionaria (dado real já configurado na tela de
-- Configurações), nem no catálogo de veículos do scraper (Vehicle e
-- tabelas relacionadas — pipeline separado, não é dado de teste do
-- dealership).
--
-- Datas são relativas a `now()` (meses/dias atrás), então o script continua
-- válido em qualquer data em que for executado — só os campos de texto
-- cosmético ("data": "Set 2026", "periodo": "Setembro/2026") ficam fixos ao
-- mês em que este script foi escrito, mesma convenção do prisma/seed.ts.
--
-- Login de consultores novos criados por este seed (senha em texto puro só
-- aqui, documentada, mesmo padrão do prisma/seed.ts):
--   bruno.tanaka@ford.com.br    / ConsultorFord@2026   (FUNCIONARIO, ativo)
--   camila.duarte@ford.com.br   / ConsultoraFord@2026  (FUNCIONARIO, ativo)
--   thiago.barros@ford.com.br   / ExFuncFord@2026       (FUNCIONARIO, INATIVO — caso de colaborador desligado)
--
-- Conta de demonstração — NÃO é lixo de teste, é o atalho de login rápido
-- exibido (clicável) na tela de login do portal
-- (ford-one/main/src/modules/concessionaria-login/concessionaria-login.screen.tsx),
-- usado pra agilizar demonstrações ao vivo pra FORD. Mantida permanentemente:
--   ford.phasex@ford.com.br     / FordPhasex@2026      (ADMIN, ativo)
--
-- Execução:
--   podman exec -i ford-postgres psql -U postgres -d postgres < prisma/seed_full.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Limpeza — audit log inteiro (artefato de teste) e as 2 contas de RBAC
--    criadas manualmente em testes anteriores. Preserva admin/Ricardo
--    Costa/Patricia Oliveira (login real em uso) e ford.phasex (conta de
--    demonstração permanente, recriada no bloco 3 abaixo).
-- ---------------------------------------------------------------------------
DELETE FROM "AuditLog";
DELETE FROM "Colaborador"
 WHERE email IN ('gerente.teste@ford.com.br', 'func.teste@ford.com.br');

-- ---------------------------------------------------------------------------
-- 2. Limpeza total dos dados de negócio (seed antigo + lixo de teste
--    misturados) — repopulados do zero abaixo.
-- ---------------------------------------------------------------------------
TRUNCATE TABLE
  "Agendamento",
  "Financiamento",
  "Lead",
  "OrdemServico",
  "Avaliacao",
  "VeiculoCliente",
  "Cliente",
  "EstoqueVeiculo",
  "Tecnico",
  "Meta"
  CASCADE;

-- ---------------------------------------------------------------------------
-- 3. Colaboradores adicionais — enriquece o ranking de consultores da tela
--    de Desempenho (antes só existiam 2 vendedores) e cobre o caso de
--    colaborador desligado (ativo = false).
-- ---------------------------------------------------------------------------
INSERT INTO "Colaborador" (id, nome, cpf, telefone, email, endereco, registro, cargo, role, senha, ativo, "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), 'Bruno Tanaka', '45678912300', '(11) 98123-4567', 'bruno.tanaka@ford.com.br', 'Rua Explorer, 88 - Sao Paulo/SP', 'FRD-FUN-002', 'Consultor de Vendas', 'FUNCIONARIO', '$argon2id$v=19$m=19456,t=2,p=1$TVNqxFy+IBn3rQ6ouDqlJw$NgVvn7aho5Mz2GH8qtgVyH8xWdP/ItZbmKZsJDa03es', true, now() - interval '4 months', now()),
  (gen_random_uuid(), 'Camila Duarte', '56789123400', '(11) 97456-1234', 'camila.duarte@ford.com.br', 'Rua Puma, 15 - Sao Paulo/SP', 'FRD-FUN-003', 'Consultora de Vendas', 'FUNCIONARIO', '$argon2id$v=19$m=19456,t=2,p=1$DG40pr7EDa4nqAw7wRcT0g$nfyJAO1+YEfLUpYVjbwEOG/GfOev2cCGBeH5v2M8Zyc', true, now() - interval '3 months', now()),
  (gen_random_uuid(), 'Thiago Barros', '67891234500', '(11) 96789-0123', 'thiago.barros@ford.com.br', 'Rua Fusion, 200 - Sao Paulo/SP', 'FRD-FUN-004', 'Consultor de Vendas', 'FUNCIONARIO', '$argon2id$v=19$m=19456,t=2,p=1$ubw7JdOlsPqeZGrgXaRFaA$sCeBnQB+TBtSLwUp1tVy1XeBZphEmIZMo6hKFWaKuPk', false, now() - interval '8 months', now()),
  (gen_random_uuid(), 'Ford PhaseX', '78912345600', '(11) 99000-0001', 'ford.phasex@ford.com.br', 'Av. Henry Ford, 1000 - Sao Paulo/SP', 'FRD-DEMO-001', 'Conta de Demonstracao', 'ADMIN', '$argon2id$v=19$m=19456,t=2,p=1$lVu3h1qLC1gkB3XvhMiG+Q$dfL8A8HdGHXZR50RwDUWzwR+oE++2k27PmgdqWKSKeU', true, now() - interval '6 months', now())
ON CONFLICT (email) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Técnicos — cobre os 4 status (LIVRE/OCUPADO/PAUSA/AUSENTE).
-- ---------------------------------------------------------------------------
INSERT INTO "Tecnico" (id, nome, iniciais, especialidade, status, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Andre Souza',     'AS', 'Revisoes programadas',     'OCUPADO', now(), now()),
  (gen_random_uuid(), 'Eduardo Lima',    'EL', 'Eletrica e Eletronica',    'LIVRE',   now(), now()),
  (gen_random_uuid(), 'Marcos Vieira',   'MV', 'Mecanica geral',           'LIVRE',   now(), now()),
  (gen_random_uuid(), 'Bruna Castro',    'BC', 'Funilaria e Pintura',      'PAUSA',   now(), now()),
  (gen_random_uuid(), 'Diego Ferreira',  'DF', 'Suspensao e Freios',       'OCUPADO', now(), now()),
  (gen_random_uuid(), 'Flavia Mendes',   'FM', 'Revisoes programadas',     'LIVRE',   now(), now()),
  (gen_random_uuid(), 'Rodrigo Almeida', 'RA', 'Diagnostico eletronico',   'AUSENTE', now(), now());

-- ---------------------------------------------------------------------------
-- 5. Clientes — os 3 status (ATIVO/INATIVO/POTENCIAL), createdAt espalhado
--    nos últimos 6 meses pra alimentar o gráfico de retenção mensal.
-- ---------------------------------------------------------------------------
INSERT INTO "Cliente" (id, codigo, nome, telefone, email, "ultimaVisita", status, "veiculosCount", ltv, iniciais, segmento, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'C001', 'Carlos Eduardo Mendes',  '(11) 98245-1122', 'carlos.mendes@gmail.com',  now() - interval '3 days',  'ATIVO',     3, 482300, 'CM', 'Premium',   now() - interval '5 months' - interval '3 days', now()),
  (gen_random_uuid(), 'C002', 'Ana Paula Rodrigues',    '(11) 91234-5678', 'ana.rodrigues@email.com',  now() - interval '8 days',  'ATIVO',     2, 218700, 'AR', 'Familia',   now() - interval '4 months' - interval '6 days', now()),
  (gen_random_uuid(), 'C003', 'Roberto Figueiredo',     '(11) 99876-5432', 'roberto.f@empresa.com.br', now() - interval '15 days', 'POTENCIAL', 1, 145000, 'RF', 'Executivo', now() - interval '1 months' - interval '2 days', now()),
  (gen_random_uuid(), 'C004', 'Fernanda Lima Costa',    '(11) 97654-3210', 'fernanda.lima@gmail.com',  now() - interval '20 days', 'ATIVO',     2, 334500, 'FL', 'Premium',   now() - interval '4 months' - interval '12 days', now()),
  (gen_random_uuid(), 'C005', 'Marcelo Augusto Pires',  '(11) 95555-0011', 'marcelo.pires@outlook.com', now() - interval '3 months', 'INATIVO',  1,  98200, 'MP', 'Padrao',    now() - interval '5 months' - interval '20 days', now()),
  (gen_random_uuid(), 'C006', 'Juliana Cardoso Santos', '(11) 98800-2244', 'juliana.cardoso@gmail.com', now() - interval '4 days',  'ATIVO',     2, 276800, 'JC', 'Familia',   now() - interval '3 months' - interval '8 days', now()),
  (gen_random_uuid(), 'C007', 'Paulo Ricardo Almeida',  '(11) 96677-8899', 'paulo.almeida@empresa.com', now() - interval '10 days', 'ATIVO',     4, 721400, 'PA', 'VIP',       now() - interval '5 months' - interval '9 days', now()),
  (gen_random_uuid(), 'C008', 'Cristina Menezes Rocha', '(11) 93344-5566', 'cristina.rocha@gmail.com', now() - interval '1 days',  'POTENCIAL', 1, 189000, 'CR', 'Premium',   now() - interval '3 days', now()),
  (gen_random_uuid(), 'C009', 'Alexandre Torres',       '(11) 91122-3344', 'alex.torres@gmail.com',    now() - interval '6 days',  'ATIVO',     2, 312600, 'AT', 'Executivo', now() - interval '2 months' - interval '5 days', now()),
  (gen_random_uuid(), 'C010', 'Beatriz Oliveira Neves', '(11) 99988-7766', 'beatriz.neves@outlook.com', now() - interval '2 days',  'ATIVO',     1, 167400, 'BO', 'Familia',   now() - interval '1 months' - interval '18 days', now());

-- ---------------------------------------------------------------------------
-- 6. Veículos por cliente (histórico de posse) — ATIVO/VENDIDO/SUBSTITUIDO.
-- ---------------------------------------------------------------------------
INSERT INTO "VeiculoCliente" (id, codigo, "clienteId", modelo, versao, ano, cor, km, "precoAquisicao", "dataAquisicao", "dataSaida", status, atual, "createdAt", "updatedAt")
SELECT gen_random_uuid(), v.codigo, c.id, v.modelo, v.versao, v.ano, v.cor, v.km, v."precoAquisicao", v."dataAquisicao", v."dataSaida", v.status::"VeiculoClienteStatus", v.atual, now(), now()
FROM (VALUES
  ('VC001A', 'C001', 'Ford Bronco Sport',      'Badlands 2.0 EcoBoost AT6',        '2024/2024', 'Azul Arizona',      '12.450', 189900::float, '2024-03-01'::timestamp, NULL::timestamp,         'ATIVO',       true),
  ('VC001B', 'C001', 'Ford Ranger Storm',      '3.0 V6 Diesel 4x4 AT10',           '2022/2022', 'Cinza Magnetico',   '48.200', 248000::float, '2022-05-01'::timestamp, '2024-03-01'::timestamp, 'VENDIDO',     false),
  ('VC001C', 'C001', 'Ford Ka Sedan',          'SE 1.5 Flex',                      '2019/2020', 'Branco Artico',     '92.100', 68900::float,  '2020-02-01'::timestamp, '2022-05-01'::timestamp, 'SUBSTITUIDO', false),
  ('VC002A', 'C002', 'Ford Territory Titanium','1.5 EcoBoost AT7',                 '2026/2026', 'Branco Platinum',   '3.200',  179900::float, '2026-01-01'::timestamp, NULL,                     'ATIVO',       true),
  ('VC002B', 'C002', 'Ford Maverick Hybrid',   'XLT FWD 2.5 Hybrid',               '2022/2022', 'Azul Stellar',      '54.800', 169900::float, '2022-06-01'::timestamp, '2024-12-01'::timestamp, 'VENDIDO',     false),
  ('VC004A', 'C004', 'Ford Bronco Sport',      'Outer Banks 2.0 EcoBoost',         '2023/2024', 'Cactus Gray',       '22.100', 184900::float, '2023-12-01'::timestamp, NULL,                     'ATIVO',       true),
  ('VC007A', 'C007', 'Ford Bronco Sport',      'Wildtrak 2.0 EcoBoost',            '2024/2024', 'Eruption Green',    '8.900',  194900::float, '2024-08-01'::timestamp, NULL,                     'ATIVO',       true)
) AS v(codigo, clienteCodigo, modelo, versao, ano, cor, km, "precoAquisicao", "dataAquisicao", "dataSaida", status, atual)
JOIN "Cliente" c ON c.codigo = v.clienteCodigo;

-- ---------------------------------------------------------------------------
-- 7. Estoque — NOVO/SEMINOVO, Disponivel/Reservado, com itens de quantidade
--    baixa (E004/E006/E007/E008 ≤ 3) que acionam o alerta "Estoque baixo".
--
--    "imagem" usa fotos reais do catálogo sincronizado pelo scraper (tabela
--    Vehicle/Imagem, tipo 'principal' — mesmo campo que o AddEstoqueModal
--    preenche automaticamente ao cadastrar um item real a partir do
--    catálogo). Quando o catálogo não tem a trim exata (ex.: "Storm"/"XLS"
--    não foram sincronizados, só a Ranger genérica), usa a foto do modelo
--    mais próximo da mesma família — sempre uma foto real, nunca inventada.
-- ---------------------------------------------------------------------------
INSERT INTO "EstoqueVeiculo" (id, codigo, modelo, versao, ano, motor, transmissao, condicao, status, preco, segmento, cor, imagem, quantidade, km, opcionais, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'E001', 'Ford Bronco Sport',      'Badlands 2.0 EcoBoost AT6', '2026', '2.0 EcoBoost 250 cv', 'Automatico 6 vel.',  'NOVO',     'Disponivel', 209900, 'SUV',    'Azul Arizona',      'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2026/bronco-sport/overview/billboard/fbr-ford-nameplate-billboard-bronco-sport.jpg', 4, NULL,          ARRAY['Teto panoramico','Camera 360','Bancos em couro','Apple CarPlay'], now(), now()),
  (gen_random_uuid(), 'E002', 'Ford Ranger Storm',      '3.0 V6 Diesel 4x4 AT10',    '2026', '3.0 TDCi V6 250 cv',  'Automatico 10 vel.', 'NOVO',     'Disponivel', 299900, 'PICAPE', 'Cinza Magnetico',   'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2025/nova-geracao-ranger/update-images/overview/billboard/fbr-ranger-billboard.jpg', 2, NULL,          ARRAY['Pacote Off-Road','SYNC 4','Camera 360','Rodas 18'], now(), now()),
  (gen_random_uuid(), 'E003', 'Ford Maverick Hybrid',   'XLT FWD 2.5 Hybrid',        '2026', '2.5 Hybrid 190 cv',   'CVT',                'NOVO',     'Disponivel', 189900, 'PICAPE', 'Azul Stellar',      'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2025/maverick/overview/billboards/fbr-billboard-maverick-black.jpg', 2, NULL,          ARRAY['FordPass Connect','SYNC 4','Bandeja de carga'], now(), now()),
  (gen_random_uuid(), 'E004', 'Ford Territory Titanium','1.5 EcoBoost AT7',          '2026', '1.5 EcoBoost 150 cv', 'Automatico 7 vel.',  'NOVO',     'Reservado',  179900, 'SUV',    'Branco Platinum',   'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2026/territory/overview/billboards/fbr-billboard-novo-territory.jpg', 1, NULL,          ARRAY['Teto solar','Ambient Light','Driver Assistance Pack'], now(), now()),
  (gen_random_uuid(), 'E005', 'Ford Ranger XLS',        '2.2 Diesel 4x4 MT6',        '2024', '2.2 TDCi 158 cv',     'Manual 6 vel.',      'NOVO',     'Disponivel', 219900, 'PICAPE', 'Vermelho Race Red', 'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2025/nova-geracao-ranger/update-images/overview/billboard/fbr-ranger-billboard.jpg', 6, NULL,          ARRAY['Controle de tracao','Camera traseira'], now(), now()),
  (gen_random_uuid(), 'E006', 'Ford Mustang GT',        '5.0 V8 Fastback',           '2024', '5.0 V8 450 cv',       'Manual 6 vel.',      'SEMINOVO', 'Disponivel', 389900, 'SEDAN',  'Azul Grabber',      'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2025/mustang-dark-horse/overview/billboard/fbr-mustang-dark-horse-billboard.jpg', 1, '18.400 km',   ARRAY['Pacote Pony','Launch Control','Performance Exhaust'], now(), now()),
  (gen_random_uuid(), 'E007', 'Ford Bronco Sport',      'Big Bend 2.0 AT6',          '2024', '2.0 EcoBoost 197 cv', 'Automatico 6 vel.',  'SEMINOVO', 'Disponivel', 174900, 'SUV',    'Area 51 (Verde)',   'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2026/bronco-sport/overview/billboard/fbr-ford-nameplate-billboard-bronco-sport.jpg', 1, '24.800 km',   ARRAY['SYNC 3','Camera traseira','Sensores de estacionamento'], now(), now()),
  (gen_random_uuid(), 'E008', 'Ford Territory SE',      '1.5 EcoBoost AT7',          '2023', '1.5 EcoBoost 150 cv', 'Automatico 7 vel.',  'SEMINOVO', 'Disponivel', 149900, 'SUV',    'Cinza Magnetic',    'https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2026/territory/overview/billboards/fbr-billboard-novo-territory.jpg', 1, '31.200 km',   ARRAY['SYNC 3','Camera traseira'], now(), now());

-- ---------------------------------------------------------------------------
-- 8. Leads — todas urgências, com/sem responsável (testa "Assumir lead"),
--    espalhados nos últimos 6 meses. L001 (URGENTE, maior valor) aciona o
--    alerta "Lead prioritário" e é o que vira financiamento (F008) abaixo.
-- ---------------------------------------------------------------------------
INSERT INTO "Lead" (id, codigo, "clienteNome", iniciais, "veiculoInteresse", necessidade, urgencia, "valorEstimado", telefone, email, insight, "responsavelId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), l.codigo, l."clienteNome", l.iniciais, l."veiculoInteresse", l.necessidade, l.urgencia::"LeadUrgencia", l."valorEstimado", l.telefone, l.email, l.insight,
       (SELECT id FROM "Colaborador" WHERE email = l.respEmail), l."createdAt", l."createdAt"
FROM (VALUES
  ('L001', 'Carlos Silva',     'CS', 'Ford Ranger Storm 2026',     'Upgrade de picape — vende Hilux',              'URGENTE', 299900::float, '(11) 97788-4411', NULL,                        'Cliente com historico de troca a cada 2 anos.', 'bruno.tanaka@ford.com.br',   now() - interval '2 days'),
  ('L002', 'Maria Fernanda',   'MF', 'Ford Territory Titanium',    'Primeiro carro proprio — quer parcelar',        'ALTA',    179900::float, '(11) 98811-2233', 'maria.fernanda@gmail.com', '25 anos, recem-contratada.',                     'camila.duarte@ford.com.br',  now() - interval '1 days'),
  ('L003', 'Rafael Costa',     'RC', 'Ford Mustang GT 5.0',        'Colecionador — quer edicao especial',           'MEDIA',   389900::float, '(11) 96644-0099', NULL,                        'Alto poder aquisitivo.',                         NULL,                          now() - interval '4 days'),
  ('L011', 'Isabela Martins',  'IM', 'Ford Ranger XLS',            'Substituir carro por picape — trabalha em obra','MEDIA',   219900::float, '(11) 91199-2233', NULL,                        'Trabalha em obra, precisa de picape.',           'patricia.oliveira@ford.com.br', now() - interval '3 days'),
  ('L004', 'Patricia Nunes',   'PN', 'Ford Maverick Hybrid',       'Substituir SUV urbano por picape compacta',     'ALTA',    189900::float, '(11) 99977-3344', 'patricia.nunes@outlook.com','Engenheira, valoriza eficiencia.',              'bruno.tanaka@ford.com.br',   now() - interval '1 months' - interval '5 days'),
  ('L005', 'Diego Almeida',    'DA', 'Ford Bronco Sport Badlands', 'Trilhas nos fins de semana',                    'MEDIA',   209900::float, '(11) 94455-6677', NULL,                        'Perfil aventura.',                                NULL,                          now() - interval '1 months' - interval '12 days'),
  ('L006', 'Camila Rocha',     'CR', 'Ford Ranger XLS',            'Uso rural — fazenda no interior',               'BAIXA',   219900::float, '(11) 93322-5588', NULL,                        'Proprietaria rural.',                             'camila.duarte@ford.com.br',  now() - interval '2 months' - interval '6 days'),
  ('L007', 'Eduardo Martins',  'EM', 'Ford Territory SE',          'Troca de veiculo da familia',                   'ALTA',    149900::float, '(11) 92211-6688', 'eduardo.martins@gmail.com','Familia com 2 filhos pequenos.',                'patricia.oliveira@ford.com.br', now() - interval '2 months' - interval '15 days'),
  ('L008', 'Fernanda Alves',   'FA', 'Ford Bronco Sport Wildtrak', 'Primeiro SUV — troca de sedan',                 'ALTA',    194900::float, '(11) 95566-7788', 'fernanda.alves@gmail.com','Indicacao de cliente atual.',                    'ricardo.costa@ford.com.br',  now() - interval '3 months' - interval '8 days'),
  ('L009', 'Gustavo Pereira',  'GP', 'Ford Maverick Hybrid',       'Uso comercial — entregas',                      'BAIXA',   169900::float, '(11) 94433-2211', NULL,                        'Autonomo, usa para trabalho.',                    NULL,                          now() - interval '4 months' - interval '10 days'),
  ('L010', 'Helena Castro',    'HC', 'Ford Ranger Storm',          'Substituir picape antiga com defeito',          'URGENTE', 259900::float, '(11) 93300-4455', 'helena.castro@gmail.com', 'Picape atual quebrou, urgencia real.',           'bruno.tanaka@ford.com.br',   now() - interval '5 months' - interval '3 days')
) AS l(codigo, "clienteNome", iniciais, "veiculoInteresse", necessidade, urgencia, "valorEstimado", telefone, email, insight, respEmail, "createdAt");

-- ---------------------------------------------------------------------------
-- 9. Financiamentos — os 4 status, com/sem lead de origem (F008/F009
--    vêm de lead convertido), com/sem consultor responsável.
-- ---------------------------------------------------------------------------
INSERT INTO "Financiamento" (id, codigo, "clienteNome", iniciais, veiculo, valor, entrada, prazo, taxa, parcela, status, data, "leadId", "responsavelId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), f.codigo, f."clienteNome", f.iniciais, f.veiculo, f.valor, f.entrada, f.prazo, f.taxa, f.parcela, f.status::"FinanciamentoStatus", f.data,
       (SELECT id FROM "Lead" WHERE codigo = f.leadCodigo),
       (SELECT id FROM "Colaborador" WHERE email = f.respEmail),
       f."createdAt", f."createdAt"
FROM (VALUES
  ('F001', 'Carlos Eduardo Mendes',  'CM', 'Bronco Sport Badlands 2024', 189900::float, 38000::float, 48, 1.49::float, 3842::float, 'APROVADO', 'Abr 2026', NULL,   'ricardo.costa@ford.com.br',  now() - interval '5 months' - interval '4 days'),
  ('F002', 'Ana Paula Rodrigues',    'AR', 'Territory Titanium 2026',    179900::float, 30000::float, 60, 1.52::float, 3104::float, 'APROVADO', 'Mai 2026', NULL,   'patricia.oliveira@ford.com.br', now() - interval '4 months' - interval '2 days'),
  ('F003', 'Juliana Cardoso Santos', 'JC', 'Maverick Hybrid 2026',       189900::float, 20000::float, 60, 1.55::float, 3598::float, 'ANALISE',  'Set 2026', NULL,   'camila.duarte@ford.com.br',  now() - interval '1 days'),
  ('F004', 'Roberto Figueiredo',     'RF', 'Mustang GT 2024',            389900::float, 80000::float, 48, 1.65::float, 8294::float, 'PENDENTE', 'Set 2026', NULL,   'camila.duarte@ford.com.br',  now() - interval '3 days'),
  ('F005', 'Alexandre Torres',       'AT', 'Ranger XLS 2026',            219900::float, 44000::float, 36, 1.49::float, 6218::float, 'APROVADO', 'Jul 2026', NULL,   'ricardo.costa@ford.com.br',  now() - interval '2 months' - interval '5 days'),
  ('F006', 'Beatriz Oliveira Neves', 'BO', 'Territory SE 2023',          149900::float, 25000::float, 48, 1.58::float, 3620::float, 'REPROVADO','Set 2026', NULL,   'bruno.tanaka@ford.com.br',   now() - interval '5 days'),
  ('F007', 'Paulo Ricardo Almeida',  'PA', 'Bronco Sport Wildtrak 2024', 194900::float, 50000::float, 36, 1.45::float, 4980::float, 'APROVADO', 'Jun 2026', NULL,   'patricia.oliveira@ford.com.br', now() - interval '3 months' - interval '10 days'),
  ('F008', 'Carlos Silva',           'CS', 'Ranger Storm 2026',          299900::float, 60000::float, 48, 1.52::float, 6520::float, 'APROVADO', 'Set 2026', 'L001', 'bruno.tanaka@ford.com.br',   now() - interval '1 days'),
  ('F009', 'Fernanda Alves',         'FA', 'Bronco Sport Wildtrak 2024', 194900::float, 45000::float, 36, 1.48::float, 4610::float, 'APROVADO', 'Jun 2026', 'L008', 'ricardo.costa@ford.com.br',  now() - interval '3 months' - interval '6 days'),
  ('F010', 'Diego Almeida',          'DA', 'Bronco Sport Badlands 2026', 209900::float, 40000::float, 48, 1.55::float, 4520::float, 'ANALISE',  'Ago 2026', 'L005', NULL,                          now() - interval '1 months' - interval '11 days')
) AS f(codigo, "clienteNome", iniciais, veiculo, valor, entrada, prazo, taxa, parcela, status, data, leadCodigo, respEmail, "createdAt");

-- ---------------------------------------------------------------------------
-- 10. Metas — mix de batidas/não batidas, incl. indicador lowerIsBetter (SLA).
-- ---------------------------------------------------------------------------
INSERT INTO "Meta" (id, codigo, titulo, periodo, indicador, atual, alvo, unidade, responsavel, "lowerIsBetter", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'M001', 'Vendas Mensais',     'Setembro/2026', 'vendas',  22,      28,      'un.',   'Equipe Comercial',      false, now(), now()),
  (gen_random_uuid(), 'M002', 'Receita Mensal',     'Setembro/2026', 'receita', 1248000, 1200000, 'R$',    'Toda a Concessionaria', false, now(), now()),
  (gen_random_uuid(), 'M003', 'NPS',                'Setembro/2026', 'nps',     72,      70,      'pts',   'Atendimento',           false, now(), now()),
  (gen_random_uuid(), 'M004', 'SLA Medio',          'Setembro/2026', 'sla',     2.3,     4,       'h',     'Equipe Tecnica',        true,  now(), now()),
  (gen_random_uuid(), 'M005', 'Leads Qualificados', 'Setembro/2026', 'leads',   61,      80,      'leads', 'Marketing',             false, now(), now()),
  (gen_random_uuid(), 'M006', 'Taxa de Conversao',  'Setembro/2026', 'conv',    34.2,    32,      '%',     'Ricardo Costa',         false, now(), now());

-- ---------------------------------------------------------------------------
-- 11. Avaliações — nota de 2 a 5 (nem tudo é 5 estrelas).
-- ---------------------------------------------------------------------------
INSERT INTO "Avaliacao" (id, cliente, nota, data, texto, detalhe, "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Carlos Eduardo Mendes',  5, to_char(now() - interval '2 days',  'DD/MM/YYYY'), 'Excelente atendimento! O consultor foi muito atencioso.', 'Servico: Revisao 10.000 km - Veiculo: Bronco Sport 2024', now(), now()),
  (gen_random_uuid(), 'Ana Paula Rodrigues',    5, to_char(now() - interval '7 days',  'DD/MM/YYYY'), 'Muito satisfeita com a revisao.',                          'Servico: Revisao 1.000 km - Veiculo: Territory Titanium', now(), now()),
  (gen_random_uuid(), 'Roberto Figueiredo',     4, to_char(now() - interval '14 days', 'DD/MM/YYYY'), 'Bom atendimento. Tempo de espera um pouco maior.',         'Servico: Alinhamento - Veiculo: Ranger XLT', now(), now()),
  (gen_random_uuid(), 'Juliana Cardoso Santos', 5, to_char(now() - interval '3 days',  'DD/MM/YYYY'), 'Problema resolvido rapidamente.',                          'Servico: Reparo eletrico - Veiculo: Territory SE', now(), now()),
  (gen_random_uuid(), 'Paulo Ricardo Almeida',  5, to_char(now() - interval '9 days',  'DD/MM/YYYY'), 'Cliente ha 8 anos e continuo fiel.',                       'Servico: Revisao 5.000 km - Veiculo: Bronco Sport Wildtrak', now(), now()),
  (gen_random_uuid(), 'Marcelo Augusto Pires',  2, to_char(now() - interval '25 days', 'DD/MM/YYYY'), 'Demorou muito mais do que o combinado, fiquei insatisfeito.', 'Servico: Revisao 60.000 km - Veiculo: Ka Sedan', now(), now()),
  (gen_random_uuid(), 'Cristina Menezes Rocha', 3, to_char(now() - interval '18 days', 'DD/MM/YYYY'), 'Atendimento razoavel, esperava mais agilidade.',           'Servico: Diagnostico eletronico - Veiculo: Territory SE', now(), now());

-- ---------------------------------------------------------------------------
-- 12. Ordens de Serviço — 4 status (PREVISTO/ANDAMENTO/CONCLUIDO/CANCELADO),
--     3 prioridades (OK/RISCO/ATRASADO), espalhadas nos últimos 6 meses
--     (histórico pra série de receita) + hoje/amanhã (agenda do dia).
-- ---------------------------------------------------------------------------
INSERT INTO "OrdemServico" (id, numero, cliente, veiculo, tipo, tecnico, prazo, prioridade, valor, status, "createdAt", "updatedAt") VALUES
  -- Hoje / amanhã — PREVISTO
  (gen_random_uuid(), '#4831', 'Carlos Mendes',    'Bronco Sport 2024',  'Revisao 20.000 km',               'Andre Souza',    'Hoje, 14:00',      'RISCO',    1840, 'PREVISTO',  now(), now()),
  (gen_random_uuid(), '#4832', 'Ana Rodrigues',    'Territory 2023',     'Alinhamento + balanceamento',      'Eduardo Lima',   'Hoje, 16:00',      'OK',       480,  'PREVISTO',  now(), now()),
  (gen_random_uuid(), '#4833', 'Fernanda Costa',   'Ranger Storm 2022',  'Revisao 30.000 km',                'Andre Souza',    'Amanha, 09:00',    'OK',       3200, 'PREVISTO',  now(), now()),
  (gen_random_uuid(), '#4834', 'Paulo Almeida',    'Maverick 2024',      'Troca de pneus',                   'Marcos Vieira',  'Amanha, 11:00',    'OK',       2100, 'PREVISTO',  now(), now()),
  (gen_random_uuid(), '#4835', 'Beatriz Neves',    'Ka Sedan 2021',      'Revisao 15.000 km',                'Eduardo Lima',   'Semana que vem',   'OK',       1100, 'PREVISTO',  now(), now()),
  -- Em andamento agora
  (gen_random_uuid(), '#4821', 'Juliana Cardoso',  'Territory SE 2023',  'Reparo eletrico - Sensor airbag',  'Bruna Castro',   'Hoje, 12:00',      'ATRASADO', 2400, 'ANDAMENTO', now() - interval '2 days', now()),
  (gen_random_uuid(), '#4822', 'Marcelo Pires',    'Ecosport 2020',      'Funilaria - Porta dianteira',      'Diego Ferreira', 'Hoje, 15:00',      'RISCO',    4200, 'ANDAMENTO', now() - interval '1 days', now()),
  (gen_random_uuid(), '#4823', 'Alexandre Torres', 'Ranger Storm 2022',  'Substituicao de correias',         'Andre Souza',    'Hoje, 17:00',      'OK',       1900, 'ANDAMENTO', now(), now()),
  -- Concluídas neste mês (produtividade + receita do mês corrente)
  (gen_random_uuid(), '#4810', 'Jose Melo',        'Ka Sedan 2020',      'Revisao 60.000 km',                'Andre Souza',    'Concluido',        'OK',       2100, 'CONCLUIDO', now() - interval '3 days', now() - interval '2 days'),
  (gen_random_uuid(), '#4811', 'Mariana Silva',    'Territory 2022',     'Alinhamento e balanceamento',      'Eduardo Lima',   'Concluido',        'OK',       480,  'CONCLUIDO', now() - interval '4 days', now() - interval '4 days' + interval '3 hours'),
  (gen_random_uuid(), '#4812', 'Paulo Almeida',    'Bronco Sport 2024',  'Revisao 10.000 km',                'Marcos Vieira',  'Concluido',        'OK',       1240, 'CONCLUIDO', now() - interval '5 days', now() - interval '4 days'),
  (gen_random_uuid(), '#4813', 'Fernanda Costa',   'Maverick 2024',      'Instalacao de acessorios',         'Diego Ferreira', 'Concluido',        'OK',       3800, 'CONCLUIDO', now() - interval '6 days', now() - interval '5 days'),
  -- Cancelada
  (gen_random_uuid(), '#4840', 'Cristina Rocha',   'Territory SE 2023',  'Revisao 5.000 km',                 'Flavia Mendes',  'Cancelado pelo cliente', 'OK', 950, 'CANCELADO', now() - interval '10 days', now() - interval '9 days'),
  -- Histórico — meses anteriores (série de receita/trimestral)
  (gen_random_uuid(), '#4750', 'Ana Rodrigues',      'Territory 2023',      'Revisao 30.000 km',   'Andre Souza',   'Concluido', 'OK', 2900, 'CONCLUIDO', now() - interval '1 months' - interval '3 days', now() - interval '1 months' - interval '2 days'),
  (gen_random_uuid(), '#4751', 'Carlos Mendes',      'Bronco Sport 2024',   'Troca de oleo',        'Marcos Vieira', 'Concluido', 'OK', 650,  'CONCLUIDO', now() - interval '1 months' - interval '13 days', now() - interval '1 months' - interval '13 days' + interval '4 hours'),
  (gen_random_uuid(), '#4700', 'Roberto Figueiredo', 'Mustang GT 2024',     'Revisao 5.000 km',     'Eduardo Lima',  'Concluido', 'OK', 1450, 'CONCLUIDO', now() - interval '2 months' - interval '5 days', now() - interval '2 months' - interval '4 days'),
  (gen_random_uuid(), '#4701', 'Beatriz Neves',      'Ka Sedan 2021',       'Funilaria leve',       'Bruna Castro',  'Concluido', 'OK', 2200, 'CONCLUIDO', now() - interval '2 months' - interval '15 days', now() - interval '2 months' - interval '13 days'),
  (gen_random_uuid(), '#4650', 'Alexandre Torres',   'Ranger XLS 2026',     'Revisao 10.000 km',    'Andre Souza',   'Concluido', 'OK', 1240, 'CONCLUIDO', now() - interval '3 months' - interval '5 days', now() - interval '3 months' - interval '4 days'),
  (gen_random_uuid(), '#4600', 'Paulo Almeida',      'Bronco Sport Wildtrak','Revisao 20.000 km',   'Marcos Vieira', 'Concluido', 'OK', 1840, 'CONCLUIDO', now() - interval '4 months' - interval '10 days', now() - interval '4 months' - interval '9 days'),
  (gen_random_uuid(), '#4550', 'Carlos Eduardo Mendes','Bronco Sport Badlands','Revisao 30.000 km', 'Andre Souza',   'Concluido', 'OK', 2900, 'CONCLUIDO', now() - interval '5 months' - interval '6 days', now() - interval '5 months' - interval '5 days');

-- ---------------------------------------------------------------------------
-- 13. Agendamentos — AGENDADO/CANCELADO/CONCLUIDO, incluindo 2 vinculados a
--     leads (fluxo real "Agendar" a partir da tela de Leads).
-- ---------------------------------------------------------------------------
INSERT INTO "Agendamento" (id, cliente, servico, tecnico, "dataHora", status, "leadId", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'Carlos Mendes',   'Revisao 10.000 km',                   'Andre Souza',  (CURRENT_DATE + time '07:30'), 'AGENDADO', NULL, now(), now()),
  (gen_random_uuid(), 'Ana Rodrigues',   'Alinhamento',                          'Eduardo Lima', (CURRENT_DATE + time '08:00'), 'AGENDADO', NULL, now(), now()),
  (gen_random_uuid(), 'Fernanda Costa',  'Revisao 30.000 km',                    'Andre Souza',  (CURRENT_DATE + time '09:00'), 'AGENDADO', NULL, now(), now()),
  (gen_random_uuid(), 'Juliana Cardoso', 'OS URGENTE - Eletrico',                'Bruna Castro', (CURRENT_DATE + time '10:30'), 'AGENDADO', NULL, now(), now()),
  (gen_random_uuid(), 'Beatriz Neves',   'Revisao 15.000 km',                    'Eduardo Lima', (CURRENT_DATE + time '12:00'), 'AGENDADO', NULL, now(), now()),
  (gen_random_uuid(), 'Carlos Silva',    'Visita — test drive Ranger Storm',     NULL,           (CURRENT_DATE + time '10:00' + interval '1 day'), 'AGENDADO', (SELECT id FROM "Lead" WHERE codigo = 'L001'), now() - interval '1 days', now() - interval '1 days'),
  (gen_random_uuid(), 'Fernanda Alves',  'Entrega do veiculo financiado',        NULL,           (CURRENT_DATE + time '11:00' - interval '2 days'), 'CONCLUIDO', (SELECT id FROM "Lead" WHERE codigo = 'L008'), now() - interval '4 days', now() - interval '2 days'),
  (gen_random_uuid(), 'Diego Almeida',   'Test drive Bronco Sport',              NULL,           (CURRENT_DATE + time '15:00' - interval '3 days'), 'CANCELADO', (SELECT id FROM "Lead" WHERE codigo = 'L005'), now() - interval '5 days', now() - interval '3 days');

COMMIT;

-- ============================================================================
-- Fim. Resumo esperado após execução:
--   Colaborador +3 (ativos: 2, inativo: 1) · Tecnico 7 · Cliente 10
--   VeiculoCliente 7 · EstoqueVeiculo 8 · Lead 11 · Financiamento 10
--   Meta 6 · Avaliacao 7 · OrdemServico 20 · Agendamento 8 · AuditLog 0
-- ============================================================================
