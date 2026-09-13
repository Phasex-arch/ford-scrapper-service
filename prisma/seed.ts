/**
 * Seed do banco de dados.
 *
 * - Cria sempre um colaborador ADMIN inicial (configuravel via .env:
 *   ADMIN_EMAIL, ADMIN_SENHA, ADMIN_NOME, ADMIN_CPF, ADMIN_REGISTRO).
 * - Cria 1 GERENTE e 1 FUNCIONARIO de exemplo (se ainda nao existirem).
 * - Popula tecnicos, clientes, estoque, leads, financiamentos, metas,
 *   avaliacoes e ordens de servico com os dados de `src/exampleData`.
 *
 * O seed e idempotente: usa `upsert` em campos unicos (email, registro,
 * codigo, numero), entao pode ser rodado varias vezes sem duplicar.
 *
 * Execucao: `npm run prisma:seed`
 */
import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashSenha(senha: string): Promise<string> {
  return argon2.hash(senha, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
}

function parseDataBr(data: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`);
}

const MESES_ABREV: Record<string, string> = {
  Jan: '01', Fev: '02', Mar: '03', Abr: '04', Mai: '05', Jun: '06',
  Jul: '07', Ago: '08', Set: '09', Out: '10', Nov: '11', Dez: '12',
};

function parseMesAno(data: string): Date {
  const [mes, ano] = data.split(' ');
  const mm = MESES_ABREV[mes];
  if (!mm) throw new Error(`Mes invalido no seed: "${data}"`);
  return new Date(`${ano}-${mm}-01T12:00:00Z`);
}

function log(section: string, msg: string): void {
  console.log(`  [${section}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Colaboradores
// ---------------------------------------------------------------------------

async function seedAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@ford.com.br').toLowerCase();
  const senha = process.env.ADMIN_SENHA;
  if (!senha) {
    throw new Error(
      'ADMIN_SENHA não definido no ambiente. Defina antes de rodar `prisma:seed`.',
    );
  }
  const nome = process.env.ADMIN_NOME ?? 'Administrador Geral';
  const cpf = (process.env.ADMIN_CPF ?? '00000000000').replace(/\D/g, '');
  const registro = process.env.ADMIN_REGISTRO ?? 'FRD-ADMIN-001';
  const telefone = '(11) 99999-0001';
  const endereco = 'Av. Henry Ford, 1000 - Sao Paulo/SP';

  const senhaHash = await hashSenha(senha);

  await prisma.colaborador.upsert({
    where: { email },
    update: {},
    create: {
      nome,
      cpf,
      telefone,
      email,
      endereco,
      registro,
      cargo: 'Administrador do Sistema',
      role: 'ADMIN',
      senha: senhaHash,
      ativo: true,
    },
  });

  log('AUTH', `ADMIN garantido: ${email}`);
  if (senha === 'AdminFord@2026') {
    log('AUTH', 'Atencao: senha padrao em uso, troque em producao!');
  }
}

interface ColaboradorSeed {
  nome: string;
  cpf: string;
  telefone: string;
  email: string;
  endereco: string;
  registro: string;
  cargo: string;
  role: 'GERENTE' | 'FUNCIONARIO';
  senha: string;
}

const COLABORADORES_SEED: ColaboradorSeed[] = [
  {
    nome: 'Ricardo Costa',
    cpf: '12345678901',
    telefone: '(11) 98765-4321',
    email: 'ricardo.costa@ford.com.br',
    endereco: 'Rua Bronco Sport, 42 - Sao Paulo/SP',
    registro: 'FRD-GER-001',
    cargo: 'Gerente Comercial',
    role: 'GERENTE',
    senha: 'GerenteFord@2026',
  },
  {
    nome: 'Patricia Oliveira',
    cpf: '98765432100',
    telefone: '(11) 91234-5678',
    email: 'patricia.oliveira@ford.com.br',
    endereco: 'Rua Maverick, 7 - Sao Paulo/SP',
    registro: 'FRD-FUN-001',
    cargo: 'Consultora de Vendas',
    role: 'FUNCIONARIO',
    senha: 'FuncFord@2026',
  },
];

async function seedColaboradores(): Promise<void> {
  for (const c of COLABORADORES_SEED) {
    const senhaHash = await hashSenha(c.senha);
    await prisma.colaborador.upsert({
      where: { email: c.email },
      update: {},
      create: {
        nome: c.nome,
        cpf: c.cpf,
        telefone: c.telefone,
        email: c.email,
        endereco: c.endereco,
        registro: c.registro,
        cargo: c.cargo,
        role: c.role,
        senha: senhaHash,
        ativo: true,
      },
    });
  }
  log('AUTH', `${COLABORADORES_SEED.length} colaboradores de exemplo`);
}

// ---------------------------------------------------------------------------
// Tecnicos
// ---------------------------------------------------------------------------

const TECNICOS_SEED = [
  { nome: 'Andre Souza', iniciais: 'AS', especialidade: 'Revisoes programadas', status: 'OCUPADO' as const },
  { nome: 'Eduardo Lima', iniciais: 'EL', especialidade: 'Eletrica e Eletronica', status: 'LIVRE' as const },
  { nome: 'Marcos Vieira', iniciais: 'MV', especialidade: 'Mecanica geral', status: 'LIVRE' as const },
  { nome: 'Bruna Castro', iniciais: 'BC', especialidade: 'Funilaria e Pintura', status: 'PAUSA' as const },
  { nome: 'Diego Ferreira', iniciais: 'DF', especialidade: 'Suspensao e Freios', status: 'OCUPADO' as const },
  { nome: 'Flavia Mendes', iniciais: 'FM', especialidade: 'Revisoes programadas', status: 'LIVRE' as const },
];

async function seedTecnicos(): Promise<void> {
  for (const t of TECNICOS_SEED) {
    const existing = await prisma.tecnico.findFirst({ where: { nome: t.nome } });
    if (existing) {
      await prisma.tecnico.update({ where: { id: existing.id }, data: t });
    } else {
      await prisma.tecnico.create({ data: t });
    }
  }
  log('TECNICOS', `${TECNICOS_SEED.length} tecnicos`);
}

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

const CLIENTES_SEED = [
  { codigo: 'C001', nome: 'Carlos Eduardo Mendes',  telefone: '(11) 98245-1122', email: 'carlos.mendes@gmail.com',   ultimaVisita: '15/04/2026', status: 'ATIVO',     veiculosCount: 3, ltv: 482300, iniciais: 'CM', segmento: 'Premium'   },
  { codigo: 'C002', nome: 'Ana Paula Rodrigues',    telefone: '(11) 91234-5678', email: 'ana.rodrigues@email.com',    ultimaVisita: '10/04/2026', status: 'ATIVO',     veiculosCount: 2, ltv: 218700, iniciais: 'AR', segmento: 'Familia'   },
  { codigo: 'C003', nome: 'Roberto Figueiredo',     telefone: '(11) 99876-5432', email: 'roberto.f@empresa.com.br',   ultimaVisita: '02/04/2026', status: 'POTENCIAL', veiculosCount: 1, ltv: 145000, iniciais: 'RF', segmento: 'Executivo' },
  { codigo: 'C004', nome: 'Fernanda Lima Costa',    telefone: '(11) 97654-3210', email: 'fernanda.lima@gmail.com',    ultimaVisita: '28/03/2026', status: 'ATIVO',     veiculosCount: 2, ltv: 334500, iniciais: 'FL', segmento: 'Premium'   },
  { codigo: 'C005', nome: 'Marcelo Augusto Pires',  telefone: '(11) 95555-0011', email: 'marcelo.pires@outlook.com',  ultimaVisita: '20/03/2026', status: 'INATIVO',   veiculosCount: 1, ltv:  98200, iniciais: 'MP', segmento: 'Padrao'    },
  { codigo: 'C006', nome: 'Juliana Cardoso Santos', telefone: '(11) 98800-2244', email: 'juliana.cardoso@gmail.com',  ultimaVisita: '18/04/2026', status: 'ATIVO',     veiculosCount: 2, ltv: 276800, iniciais: 'JC', segmento: 'Familia'   },
  { codigo: 'C007', nome: 'Paulo Ricardo Almeida',  telefone: '(11) 96677-8899', email: 'paulo.almeida@empresa.com',  ultimaVisita: '05/04/2026', status: 'ATIVO',     veiculosCount: 4, ltv: 721400, iniciais: 'PA', segmento: 'VIP'       },
  { codigo: 'C008', nome: 'Cristina Menezes Rocha', telefone: '(11) 93344-5566', email: 'cristina.rocha@gmail.com',   ultimaVisita: '01/04/2026', status: 'POTENCIAL', veiculosCount: 1, ltv: 189000, iniciais: 'CR', segmento: 'Premium'   },
  { codigo: 'C009', nome: 'Alexandre Torres',       telefone: '(11) 91122-3344', email: 'alex.torres@gmail.com',      ultimaVisita: '14/04/2026', status: 'ATIVO',     veiculosCount: 2, ltv: 312600, iniciais: 'AT', segmento: 'Executivo' },
  { codigo: 'C010', nome: 'Beatriz Oliveira Neves', telefone: '(11) 99988-7766', email: 'beatriz.neves@outlook.com',  ultimaVisita: '12/04/2026', status: 'ATIVO',     veiculosCount: 1, ltv: 167400, iniciais: 'BO', segmento: 'Familia'   },
] as const;

async function seedClientes(): Promise<void> {
  for (const c of CLIENTES_SEED) {
    await prisma.cliente.upsert({
      where: { codigo: c.codigo },
      update: {},
      create: {
        codigo: c.codigo,
        nome: c.nome,
        telefone: c.telefone,
        email: c.email,
        ultimaVisita: parseDataBr(c.ultimaVisita),
        status: c.status,
        veiculosCount: c.veiculosCount,
        ltv: c.ltv,
        iniciais: c.iniciais,
        segmento: c.segmento,
      },
    });
  }
  log('CLIENTES', `${CLIENTES_SEED.length} clientes`);
}

// ---------------------------------------------------------------------------
// Veiculos por cliente (historico de posse)
// ---------------------------------------------------------------------------

interface VeiculoClienteSeed {
  codigo: string;
  clienteCodigo: string;
  modelo: string;
  versao: string;
  ano: string;
  cor: string;
  km: string;
  precoAquisicao: number;
  dataAquisicao: string;
  dataSaida: string | null;
  status: 'ATIVO' | 'VENDIDO' | 'SUBSTITUIDO';
  atual: boolean;
}

const VEICULOS_CLIENTE_SEED: VeiculoClienteSeed[] = [
  { codigo: 'VC001A', clienteCodigo: 'C001', modelo: 'Ford Bronco Sport', versao: 'Badlands 2.0 EcoBoost AT6', ano: '2024/2024', cor: 'Azul Arizona',     km: '12.450', precoAquisicao: 189900, dataAquisicao: 'Mar 2024', dataSaida: null,      status: 'ATIVO',       atual: true  },
  { codigo: 'VC001B', clienteCodigo: 'C001', modelo: 'Ford Ranger Storm', versao: '3.0 V6 Diesel 4x4 AT10',   ano: '2022/2022', cor: 'Cinza Magnetico',   km: '48.200', precoAquisicao: 248000, dataAquisicao: 'Mai 2022', dataSaida: 'Mar 2024', status: 'VENDIDO',     atual: false },
  { codigo: 'VC001C', clienteCodigo: 'C001', modelo: 'Ford Ka Sedan',     versao: 'SE 1.5 Flex',              ano: '2019/2020', cor: 'Branco Artico',     km: '92.100', precoAquisicao: 68900,  dataAquisicao: 'Fev 2020', dataSaida: 'Mai 2022', status: 'SUBSTITUIDO', atual: false },
  { codigo: 'VC002A', clienteCodigo: 'C002', modelo: 'Ford Territory Titanium', versao: '1.5 EcoBoost AT7',   ano: '2026/2026', cor: 'Branco Platinum',   km: '3.200',  precoAquisicao: 179900, dataAquisicao: 'Jan 2026', dataSaida: null,      status: 'ATIVO',       atual: true  },
  { codigo: 'VC002B', clienteCodigo: 'C002', modelo: 'Ford Maverick Hybrid', versao: 'XLT FWD 2.5 Hybrid',    ano: '2022/2022', cor: 'Azul Stellar',      km: '54.800', precoAquisicao: 169900, dataAquisicao: 'Jun 2022', dataSaida: 'Dez 2024', status: 'VENDIDO',     atual: false },
  { codigo: 'VC004A', clienteCodigo: 'C004', modelo: 'Ford Bronco Sport', versao: 'Outer Banks 2.0 EcoBoost', ano: '2023/2024', cor: 'Cactus Gray',       km: '22.100', precoAquisicao: 184900, dataAquisicao: 'Dez 2023', dataSaida: null,      status: 'ATIVO',       atual: true  },
  { codigo: 'VC007A', clienteCodigo: 'C007', modelo: 'Ford Bronco Sport', versao: 'Wildtrak 2.0 EcoBoost',    ano: '2024/2024', cor: 'Eruption Green',    km: '8.900',  precoAquisicao: 194900, dataAquisicao: 'Ago 2024', dataSaida: null,      status: 'ATIVO',       atual: true  },
];

async function seedVeiculosCliente(): Promise<void> {
  for (const v of VEICULOS_CLIENTE_SEED) {
    const cliente = await prisma.cliente.findUnique({ where: { codigo: v.clienteCodigo } });
    if (!cliente) {
      log('VEICULOS_CLIENTE', `Cliente ${v.clienteCodigo} nao encontrado, pulando ${v.codigo}`);
      continue;
    }
    await prisma.veiculoCliente.upsert({
      where: { codigo: v.codigo },
      update: {},
      create: {
        codigo: v.codigo,
        clienteId: cliente.id,
        modelo: v.modelo,
        versao: v.versao,
        ano: v.ano,
        cor: v.cor,
        km: v.km,
        precoAquisicao: v.precoAquisicao,
        dataAquisicao: parseMesAno(v.dataAquisicao),
        dataSaida: v.dataSaida ? parseMesAno(v.dataSaida) : null,
        status: v.status,
        atual: v.atual,
      },
    });
  }
  log('VEICULOS_CLIENTE', `${VEICULOS_CLIENTE_SEED.length} veiculos de clientes`);
}

// ---------------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------------

const ESTOQUE_SEED = [
  { codigo: 'E001', modelo: 'Ford Bronco Sport',     versao: 'Badlands 2.0 EcoBoost AT6',  ano: '2026', motor: '2.0 EcoBoost 250 cv', transmissao: 'Automatico 6 vel.',  condicao: 'NOVO',     status: 'Disponivel', preco: 209900, segmento: 'SUV',    cor: 'Azul Arizona',     quantidade: 4, km: null,         opcionais: ['Teto panoramico', 'Camera 360', 'Bancos em couro', 'Apple CarPlay'] },
  { codigo: 'E002', modelo: 'Ford Ranger Storm',     versao: '3.0 V6 Diesel 4x4 AT10',     ano: '2026', motor: '3.0 TDCi V6 250 cv',  transmissao: 'Automatico 10 vel.', condicao: 'NOVO',     status: 'Disponivel', preco: 299900, segmento: 'PICAPE', cor: 'Cinza Magnetico',  quantidade: 2, km: null,         opcionais: ['Pacote Off-Road', 'SYNC 4', 'Camera 360', 'Rodas 18'] },
  { codigo: 'E003', modelo: 'Ford Maverick Hybrid',  versao: 'XLT FWD 2.5 Hybrid',         ano: '2026', motor: '2.5 Hybrid 190 cv',   transmissao: 'CVT',                condicao: 'NOVO',     status: 'Disponivel', preco: 189900, segmento: 'PICAPE', cor: 'Azul Stellar',     quantidade: 2, km: null,         opcionais: ['FordPass Connect', 'SYNC 4', 'Bandeja de carga'] },
  { codigo: 'E004', modelo: 'Ford Territory Titanium', versao: '1.5 EcoBoost AT7',         ano: '2026', motor: '1.5 EcoBoost 150 cv', transmissao: 'Automatico 7 vel.',  condicao: 'NOVO',     status: 'Reservado',  preco: 179900, segmento: 'SUV',    cor: 'Branco Platinum',  quantidade: 1, km: null,         opcionais: ['Teto solar', 'Ambient Light', 'Driver Assistance Pack'] },
  { codigo: 'E005', modelo: 'Ford Ranger XLS',       versao: '2.2 Diesel 4x4 MT6',         ano: '2024', motor: '2.2 TDCi 158 cv',     transmissao: 'Manual 6 vel.',      condicao: 'NOVO',     status: 'Disponivel', preco: 219900, segmento: 'PICAPE', cor: 'Vermelho Race Red',quantidade: 6, km: null,         opcionais: ['Controle de tracao', 'Camera traseira'] },
  { codigo: 'E006', modelo: 'Ford Mustang GT',       versao: '5.0 V8 Fastback',            ano: '2024', motor: '5.0 V8 450 cv',       transmissao: 'Manual 6 vel.',      condicao: 'SEMINOVO', status: 'Disponivel', preco: 389900, segmento: 'SEDAN',  cor: 'Azul Grabber',     quantidade: 1, km: '18.400 km',  opcionais: ['Pacote Pony', 'Launch Control', 'Performance Exhaust'] },
  { codigo: 'E007', modelo: 'Ford Bronco Sport',     versao: 'Big Bend 2.0 AT6',           ano: '2024', motor: '2.0 EcoBoost 197 cv', transmissao: 'Automatico 6 vel.',  condicao: 'SEMINOVO', status: 'Disponivel', preco: 174900, segmento: 'SUV',    cor: 'Area 51 (Verde)',  quantidade: 1, km: '24.800 km',  opcionais: ['SYNC 3', 'Camera traseira', 'Sensores de estacionamento'] },
  { codigo: 'E008', modelo: 'Ford Territory SE',     versao: '1.5 EcoBoost AT7',           ano: '2023', motor: '1.5 EcoBoost 150 cv', transmissao: 'Automatico 7 vel.',  condicao: 'SEMINOVO', status: 'Disponivel', preco: 149900, segmento: 'SUV',    cor: 'Cinza Magnetic',   quantidade: 1, km: '31.200 km',  opcionais: ['SYNC 3', 'Camera traseira'] },
] as const;

async function seedEstoque(): Promise<void> {
  for (const e of ESTOQUE_SEED) {
    await prisma.estoqueVeiculo.upsert({
      where: { codigo: e.codigo },
      update: {},
      create: {
        codigo: e.codigo,
        modelo: e.modelo,
        versao: e.versao,
        ano: e.ano,
        motor: e.motor,
        transmissao: e.transmissao,
        condicao: e.condicao,
        status: e.status,
        preco: e.preco,
        segmento: e.segmento,
        cor: e.cor,
        quantidade: e.quantidade,
        km: e.km,
        opcionais: [...e.opcionais],
      },
    });
  }
  log('ESTOQUE', `${ESTOQUE_SEED.length} veiculos`);
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

const LEADS_SEED = [
  { codigo: 'L001', clienteNome: 'Carlos Silva',     iniciais: 'CS', veiculoInteresse: 'Ford Ranger Storm 2026',    necessidade: 'Upgrade de picape — vende Hilux',           urgencia: 'URGENTE', valorEstimado: 299900, telefone: '(11) 97788-4411', insight: 'Cliente com historico de troca a cada 2 anos.' },
  { codigo: 'L002', clienteNome: 'Maria Fernanda',   iniciais: 'MF', veiculoInteresse: 'Ford Territory Titanium',   necessidade: 'Primeiro carro proprio — quer parcelar',     urgencia: 'ALTA',    valorEstimado: 179900, telefone: '(11) 98811-2233', insight: '25 anos, recem-contratada.' },
  { codigo: 'L003', clienteNome: 'Rafael Costa',     iniciais: 'RC', veiculoInteresse: 'Ford Mustang GT 5.0',       necessidade: 'Colecionador — quer edicao especial',        urgencia: 'MEDIA',   valorEstimado: 389900, telefone: '(11) 96644-0099', insight: 'Alto poder aquisitivo.' },
  { codigo: 'L004', clienteNome: 'Patricia Nunes',   iniciais: 'PN', veiculoInteresse: 'Ford Maverick Hybrid',      necessidade: 'Substituir SUV urbano por picape compacta',  urgencia: 'ALTA',    valorEstimado: 189900, telefone: '(11) 99977-3344', insight: 'Engenheira, valoriza eficiencia.' },
  { codigo: 'L005', clienteNome: 'Diego Almeida',    iniciais: 'DA', veiculoInteresse: 'Ford Bronco Sport Badlands',necessidade: 'Trilhas nos fins de semana',                 urgencia: 'MEDIA',   valorEstimado: 209900, telefone: '(11) 94455-6677', insight: 'Perfil aventura.' },
  { codigo: 'L006', clienteNome: 'Camila Rocha',     iniciais: 'CR', veiculoInteresse: 'Ford Ranger XLS',           necessidade: 'Uso rural — fazenda no interior',            urgencia: 'BAIXA',   valorEstimado: 219900, telefone: '(11) 93322-5588', insight: 'Proprietaria rural.' },
] as const;

async function seedLeads(): Promise<void> {
  for (const l of LEADS_SEED) {
    await prisma.lead.upsert({
      where: { codigo: l.codigo },
      update: {},
      create: {
        codigo: l.codigo,
        clienteNome: l.clienteNome,
        iniciais: l.iniciais,
        veiculoInteresse: l.veiculoInteresse,
        necessidade: l.necessidade,
        urgencia: l.urgencia,
        valorEstimado: l.valorEstimado,
        telefone: l.telefone,
        insight: l.insight,
      },
    });
  }
  log('LEADS', `${LEADS_SEED.length} leads`);
}

// ---------------------------------------------------------------------------
// Financiamentos
// ---------------------------------------------------------------------------

const FINANCIAMENTOS_SEED = [
  { codigo: 'F001', clienteNome: 'Carlos Eduardo Mendes',  iniciais: 'CM', veiculo: 'Bronco Sport Badlands 2024', valor: 189900, entrada: 38000, prazo: 48, taxa: 1.49, parcela: 3842, status: 'APROVADO', data: 'Mar 2024' },
  { codigo: 'F002', clienteNome: 'Ana Paula Rodrigues',    iniciais: 'AR', veiculo: 'Territory Titanium 2026',    valor: 179900, entrada: 30000, prazo: 60, taxa: 1.52, parcela: 3104, status: 'APROVADO', data: 'Jan 2026' },
  { codigo: 'F003', clienteNome: 'Juliana Cardoso Santos', iniciais: 'JC', veiculo: 'Maverick Hybrid 2026',       valor: 189900, entrada: 20000, prazo: 60, taxa: 1.55, parcela: 3598, status: 'ANALISE',  data: 'Abr 2026' },
  { codigo: 'F004', clienteNome: 'Roberto Figueiredo',     iniciais: 'RF', veiculo: 'Mustang GT 2024',            valor: 389900, entrada: 80000, prazo: 48, taxa: 1.65, parcela: 8294, status: 'PENDENTE', data: 'Abr 2026' },
  { codigo: 'F005', clienteNome: 'Alexandre Torres',       iniciais: 'AT', veiculo: 'Ranger XLS 2026',            valor: 219900, entrada: 44000, prazo: 36, taxa: 1.49, parcela: 6218, status: 'APROVADO', data: 'Mar 2026' },
] as const;

async function seedFinanciamentos(): Promise<void> {
  for (const f of FINANCIAMENTOS_SEED) {
    await prisma.financiamento.upsert({
      where: { codigo: f.codigo },
      update: {},
      create: f,
    });
  }
  log('FINANCIAMENTOS', `${FINANCIAMENTOS_SEED.length} contratos`);
}

// ---------------------------------------------------------------------------
// Metas
// ---------------------------------------------------------------------------

const METAS_SEED = [
  { codigo: 'M001', titulo: 'Vendas Mensais',     periodo: 'Setembro/2026', indicador: 'vendas',  atual: 22,      alvo: 28,      unidade: 'un.',   responsavel: 'Equipe Comercial',      lowerIsBetter: false },
  { codigo: 'M002', titulo: 'Receita Mensal',     periodo: 'Setembro/2026', indicador: 'receita', atual: 1248000, alvo: 1200000, unidade: 'R$',    responsavel: 'Toda a Concessionaria', lowerIsBetter: false },
  { codigo: 'M003', titulo: 'NPS',                periodo: 'Setembro/2026', indicador: 'nps',     atual: 72,      alvo: 70,      unidade: 'pts',   responsavel: 'Atendimento',           lowerIsBetter: false },
  { codigo: 'M004', titulo: 'SLA Medio',          periodo: 'Setembro/2026', indicador: 'sla',     atual: 2.3,     alvo: 4,       unidade: 'h',     responsavel: 'Equipe Tecnica',        lowerIsBetter: true  },
  { codigo: 'M005', titulo: 'Leads Qualificados', periodo: 'Setembro/2026', indicador: 'leads',   atual: 61,      alvo: 80,      unidade: 'leads', responsavel: 'Marketing',             lowerIsBetter: false },
  { codigo: 'M006', titulo: 'Taxa de Conversao',  periodo: 'Setembro/2026', indicador: 'conv',    atual: 34.2,    alvo: 32,      unidade: '%',     responsavel: 'Ricardo Costa',         lowerIsBetter: false },
] as const;

async function seedMetas(): Promise<void> {
  for (const m of METAS_SEED) {
    await prisma.meta.upsert({
      where: { codigo: m.codigo },
      update: {},
      create: m,
    });
  }
  log('METAS', `${METAS_SEED.length} metas`);
}

// ---------------------------------------------------------------------------
// Avaliacoes
// ---------------------------------------------------------------------------

const AVALIACOES_SEED = [
  { cliente: 'Carlos Eduardo Mendes',  nota: 5, data: '15/04/2026', texto: 'Excelente atendimento! O consultor foi muito atencioso.', detalhe: 'Servico: Revisao 10.000 km - Veiculo: Bronco Sport 2024' },
  { cliente: 'Ana Paula Rodrigues',    nota: 5, data: '10/04/2026', texto: 'Muito satisfeita com a revisao.',                          detalhe: 'Servico: Revisao 1.000 km - Veiculo: Territory Titanium' },
  { cliente: 'Roberto Figueiredo',     nota: 4, data: '02/04/2026', texto: 'Bom atendimento. Tempo de espera um pouco maior.',         detalhe: 'Servico: Alinhamento - Veiculo: Ranger XLT' },
  { cliente: 'Juliana Cardoso Santos', nota: 5, data: '18/04/2026', texto: 'Problema resolvido rapidamente.',                          detalhe: 'Servico: Reparo eletrico - Veiculo: Territory SE' },
  { cliente: 'Paulo Ricardo Almeida',  nota: 5, data: '05/04/2026', texto: 'Cliente ha 8 anos e continuo fiel.',                       detalhe: 'Servico: Revisao 5.000 km - Veiculo: Bronco Sport Wildtrak' },
] as const;

async function seedAvaliacoes(): Promise<void> {
  const existing = await prisma.avaliacao.count();
  if (existing > 0) {
    log('AVALIACOES', `ja existem ${existing} (skip)`);
    return;
  }
  await prisma.avaliacao.createMany({ data: [...AVALIACOES_SEED] });
  log('AVALIACOES', `${AVALIACOES_SEED.length} avaliacoes`);
}

// ---------------------------------------------------------------------------
// Ordens de Servico
// ---------------------------------------------------------------------------

const ORDENS_SEED = [
  { numero: '#4831', cliente: 'Carlos Mendes',    veiculo: 'Bronco Sport 2024',  tipo: 'Revisao 20.000 km',                tecnico: 'Andre Souza',    prazo: 'Hoje, 14:00',   prioridade: 'RISCO',    valor: 1840, status: 'PREVISTO' },
  { numero: '#4832', cliente: 'Ana Rodrigues',    veiculo: 'Territory 2023',     tipo: 'Alinhamento + balanceamento',      tecnico: 'Eduardo Lima',   prazo: 'Hoje, 16:00',   prioridade: 'OK',       valor: 480,   status: 'PREVISTO' },
  { numero: '#4833', cliente: 'Fernanda Costa',   veiculo: 'Ranger Storm 2022',  tipo: 'Revisao 30.000 km',                tecnico: 'Andre Souza',    prazo: 'Amanha, 09:00', prioridade: 'OK',       valor: 3200, status: 'PREVISTO' },
  { numero: '#4834', cliente: 'Paulo Almeida',    veiculo: 'Maverick 2024',      tipo: 'Troca de pneus',                    tecnico: 'Marcos Vieira',  prazo: 'Amanha, 11:00', prioridade: 'OK',       valor: 2100, status: 'PREVISTO' },
  { numero: '#4835', cliente: 'Beatriz Neves',    veiculo: 'Ka Sedan 2021',      tipo: 'Revisao 15.000 km',                tecnico: 'Eduardo Lima',   prazo: '22/04, 09:00',  prioridade: 'OK',       valor: 1100, status: 'PREVISTO' },
  { numero: '#4821', cliente: 'Juliana Cardoso',  veiculo: 'Territory SE 2023',  tipo: 'Reparo eletrico - Sensor airbag',  tecnico: 'Bruna Castro',   prazo: 'Hoje, 12:00',   prioridade: 'ATRASADO', valor: 2400, status: 'ANDAMENTO' },
  { numero: '#4822', cliente: 'Marcelo Pires',    veiculo: 'Ecosport 2020',      tipo: 'Funilaria - Porta dianteira',      tecnico: 'Diego Ferreira', prazo: 'Hoje, 15:00',   prioridade: 'RISCO',    valor: 4200, status: 'ANDAMENTO' },
  { numero: '#4823', cliente: 'Alexandre Torres', veiculo: 'Ranger Storm 2022',  tipo: 'Substituicao de correias',         tecnico: 'Andre Souza',    prazo: 'Hoje, 17:00',   prioridade: 'OK',       valor: 1900, status: 'ANDAMENTO' },
  { numero: '#4810', cliente: 'Jose Melo',        veiculo: 'Ka Sedan 2020',      tipo: 'Revisao 60.000 km',                tecnico: 'Andre Souza',    prazo: 'Ontem',         prioridade: 'OK',       valor: 2100, status: 'CONCLUIDO' },
  { numero: '#4811', cliente: 'Mariana Silva',    veiculo: 'Territory 2022',     tipo: 'Alinhamento e balanceamento',      tecnico: 'Eduardo Lima',   prazo: 'Ontem',         prioridade: 'OK',       valor: 480,   status: 'CONCLUIDO' },
  { numero: '#4812', cliente: 'Paulo Almeida',    veiculo: 'Bronco Sport 2024',  tipo: 'Revisao 10.000 km',                tecnico: 'Marcos Vieira',  prazo: 'Ontem',         prioridade: 'OK',       valor: 1240, status: 'CONCLUIDO' },
  { numero: '#4813', cliente: 'Fernanda Costa',   veiculo: 'Maverick 2024',      tipo: 'Instalacao de acessorios',         tecnico: 'Diego Ferreira', prazo: 'Ontem',         prioridade: 'OK',       valor: 3800, status: 'CONCLUIDO' },
] as const;

async function seedOrdens(): Promise<void> {
  for (const o of ORDENS_SEED) {
    await prisma.ordemServico.upsert({
      where: { numero: o.numero },
      update: {},
      create: o,
    });
  }
  log('ORDENS', `${ORDENS_SEED.length} ordens de servico`);
}

// ---------------------------------------------------------------------------
// Agendamentos
// ---------------------------------------------------------------------------

/** Horarios de hoje (hora, minuto) com cliente/servico/tecnico realistas. */
const AGENDAMENTOS_SEED_HOJE: { hora: number; minuto: number; cliente: string; servico: string; tecnico: string }[] = [
  { hora: 7, minuto: 30, cliente: 'Carlos Mendes', servico: 'Revisao 10.000 km', tecnico: 'Andre Souza' },
  { hora: 8, minuto: 0, cliente: 'Ana Rodrigues', servico: 'Alinhamento', tecnico: 'Eduardo Lima' },
  { hora: 9, minuto: 0, cliente: 'Fernanda Costa', servico: 'Revisao 30.000 km', tecnico: 'Andre Souza' },
  { hora: 10, minuto: 30, cliente: 'Juliana Cardoso', servico: 'OS URGENTE - Eletrico', tecnico: 'Bruna Castro' },
  { hora: 12, minuto: 0, cliente: 'Beatriz Neves', servico: 'Revisao 15.000 km', tecnico: 'Eduardo Lima' },
];

async function seedAgendamentos(): Promise<void> {
  const existing = await prisma.agendamento.count();
  if (existing > 0) {
    log('AGENDAMENTOS', `ja existem ${existing} (skip)`);
    return;
  }
  const hoje = new Date();
  await prisma.agendamento.createMany({
    data: AGENDAMENTOS_SEED_HOJE.map((a) => ({
      cliente: a.cliente,
      servico: a.servico,
      tecnico: a.tecnico,
      dataHora: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), a.hora, a.minuto),
    })),
  });
  log('AGENDAMENTOS', `${AGENDAMENTOS_SEED_HOJE.length} agendamentos`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('Iniciando seed do banco...\n');

  await seedAdmin();
  await seedColaboradores();
  await seedTecnicos();
  await seedClientes();
  await seedVeiculosCliente();
  await seedEstoque();
  await seedLeads();
  await seedFinanciamentos();
  await seedMetas();
  await seedAvaliacoes();
  await seedOrdens();
  await seedAgendamentos();

  console.log('\nSeed concluido com sucesso.');
}

main()
  .catch((err) => {
    console.error('Erro durante seed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
