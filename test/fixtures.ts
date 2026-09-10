/**
 * @file test/fixtures.ts
 * @description Payloads válidos mínimos por recurso.
 *
 * Cada função recebe um sufixo para manter únicos os campos `@unique`
 * (`codigo`, `numero`, `email`, `cpf`, `registro`) entre testes que criam
 * registros na mesma suíte.
 */

export const cliente = (s = '1') => ({
  codigo: `C-T${s}`,
  nome: 'Cliente De Teste',
  telefone: '(11) 98245-1122',
  email: `cliente.t${s}@example.com`,
  iniciais: 'CT',
  segmento: 'Premium',
});

export const estoque = (s = '1') => ({
  codigo: `E-T${s}`,
  modelo: 'Ford Ranger',
  versao: 'XLS 2.2',
  ano: '2026',
  motor: '2.2 TDCi',
  transmissao: 'Manual 6 vel.',
  condicao: 'NOVO',
  preco: 219900,
  segmento: 'PICAPE',
  cor: 'Vermelho',
  opcionais: ['Camera traseira'],
});

export const lead = (s = '1') => ({
  codigo: `L-T${s}`,
  clienteNome: 'Lead De Teste',
  iniciais: 'LT',
  veiculoInteresse: 'Ford Ranger Storm',
  necessidade: 'Troca de picape',
  urgencia: 'MEDIA',
  valorEstimado: 299900,
  telefone: '(11) 97788-4411',
});

export const servico = (s = '1') => ({
  numero: `#T${s}`,
  cliente: 'Cliente De Teste',
  veiculo: 'Ranger 2026',
  tipo: 'Revisao 20.000 km',
  tecnico: 'Tecnico De Teste',
  prazo: 'Hoje, 14:00',
  valor: 'R$ 1.840',
});

export const meta = (s = '1') => ({
  codigo: `M-T${s}`,
  titulo: 'Vendas',
  periodo: 'Abril/2026',
  indicador: 'vendas',
  atual: 10,
  alvo: 30,
  unidade: 'un.',
  responsavel: 'Responsavel Teste',
  lowerIsBetter: false,
});

/** `parcela` coerente com valor/entrada/prazo/taxa pela tabela Price. */
export const financiamento = (s = '1') => ({
  codigo: `F-T${s}`,
  clienteNome: 'Cliente De Teste',
  iniciais: 'CT',
  veiculo: 'Ranger XLS 2026',
  valor: 200000,
  entrada: 40000,
  prazo: 48,
  taxa: 1.49,
  parcela: 4698,
  status: 'PENDENTE',
  data: 'Abr 2026',
});

export const tecnico = (s = '1') => ({
  nome: `Tecnico Teste ${s}`,
  iniciais: 'TT',
  especialidade: 'Mecanica geral',
});

export const avaliacao = (s = '1') => ({
  cliente: `Cliente Avaliador ${s}`,
  nota: 5,
  data: '15/04/2026',
  texto: 'Atendimento excelente do comeco ao fim.',
});

/**
 * CPF de 11 dígitos derivado do sufixo.
 *
 * O `@Matches` do DTO exige dígitos, e a versão anterior fazia
 * `529982247${s.padStart(2,'0')}` — que só funcionava com sufixo numérico de até
 * dois caracteres. Com `'inativo'` saía `529982247inativo`, e com `'p'` saía
 * `5299822470p`: o POST tomava 400 e o teste passava à toa, porque a matriz de
 * RBAC só afirma "não é 403".
 */
const cpfDoSufixo = (s: string): string => {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)!) % 100_000_000;
  return `529${String(h).padStart(8, '0')}`;
};

export const colaborador = (s = '1') => ({
  nome: 'Colaborador De Teste',
  cpf: cpfDoSufixo(s),
  telefone: '(11) 90000-0000',
  email: `colab.t${s}@ford.com.br`,
  endereco: 'Av. Teste, 100',
  registro: `T-REG-${s}`,
  cargo: 'Consultor',
  senha: 'SenhaDeTeste@2026',
});

export const leadPublico = (s = '1') => ({
  nome: `Lead Publico ${s}`,
  email: `publico.t${s}@example.com`,
  telefone: '(11) 97788-4411',
  veiculoInteresse: 'Ford Ranger Storm',
  mensagem: 'Gostaria de receber uma proposta comercial.',
});
