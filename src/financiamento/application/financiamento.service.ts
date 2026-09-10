import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  FinanciamentoListFilter,
  FinanciamentoRepository,
} from '../infrastructure/financiamento.repository.js';
import type { CreateFinanciamentoDto } from './dto/create-financiamento.dto.js';
import type { UpdateFinanciamentoDto } from './dto/update-financiamento.dto.js';

/** Tentativas de geracao antes de desistir — colisao aqui e evento raro. */
const TENTATIVAS_CODIGO = 5;

/**
 * Tolerancia relativa aceita entre a parcela enviada e a recalculada: 1%, com
 * piso de R$ 1. Cobre diferenca de arredondamento de quem calcula a simulacao
 * (o dealership arredonda o resultado final; outro cliente pode arredondar por
 * parcela ou usar mais casas na taxa) e continua recusando valor forjado — 1% de
 * uma parcela nao muda o total do contrato de forma util para quem fraudar.
 */
const TOLERANCIA_PARCELA = 0.01;

/**
 * Tabela Price (Sistema Frances) — espelho de `calcParcela` em
 * useFinanciamentos.ts: PMT = PV x [i x (1+i)^n] / [(1+i)^n - 1].
 *
 * Taxa zero cai na divisao simples: sem juros, a parcela e o financiado / prazo.
 */
export function parcelaPrice(
  valor: number,
  entrada: number,
  prazo: number,
  taxa: number,
): number {
  const financiado = valor - entrada;
  const t = taxa / 100;
  if (t === 0) return Math.round(financiado / prazo);
  const fator = Math.pow(1 + t, prazo);
  return Math.round((financiado * (t * fator)) / (fator - 1));
}

interface TermosFinanceiros {
  valor: number;
  entrada: number;
  prazo: number;
  taxa: number;
  parcela: number;
}

@Injectable()
export class FinanciamentoService {
  constructor(private readonly repo: FinanciamentoRepository) {}

  async list(opts: FinanciamentoListFilter) {
    const [data, total] = await Promise.all([
      this.repo.findAll(opts),
      this.repo.count(opts),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException('Financiamento nao encontrado');
    return item;
  }

  async create(dto: CreateFinanciamentoDto) {
    this.validarTermos(dto);
    if (dto.codigo) {
      const existing = await this.repo.findByCodigo(dto.codigo);
      if (existing) throw new ConflictException('Codigo ja cadastrado');
      return this.repo.create({ ...dto, codigo: dto.codigo });
    }
    // Chave de negocio gerada no servidor; o @unique do banco resolve corrida.
    const base = await this.repo.totalRegistros();
    for (let i = 1; i <= TENTATIVAS_CODIGO; i++) {
      const codigo = `F${String(base + i).padStart(6, '0')}`;
      try {
        return await this.repo.create({ ...dto, codigo });
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    throw new ConflictException('Nao foi possivel gerar um codigo de contrato');
  }

  async update(id: string, dto: UpdateFinanciamentoDto) {
    const atual = await this.findById(id);
    // Qualquer alteracao em um dos termos revalida o contrato inteiro: mudar so
    // `taxa` (ou so `parcela`) tambem forjaria as condicoes.
    const mexeuNosTermos =
      dto.valor !== undefined ||
      dto.entrada !== undefined ||
      dto.prazo !== undefined ||
      dto.taxa !== undefined ||
      dto.parcela !== undefined;
    if (mexeuNosTermos) {
      this.validarTermos({
        valor: dto.valor ?? atual.valor,
        entrada: dto.entrada ?? atual.entrada,
        prazo: dto.prazo ?? atual.prazo,
        taxa: dto.taxa ?? atual.taxa,
        parcela: dto.parcela ?? atual.parcela,
      });
    }
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  /**
   * O servidor recalcula: valor financeiro enviado pelo cliente nao e
   * confiavel. Sem isso, um POST com parcela 1 em um contrato de R$ 200 mil era
   * gravado como esta e a carteira ficava inauditavel.
   */
  private validarTermos(termos: TermosFinanceiros): void {
    if (termos.entrada > termos.valor) {
      throw new BadRequestException(
        'A entrada nao pode ser maior que o valor do veiculo',
      );
    }
    const esperada = parcelaPrice(
      termos.valor,
      termos.entrada,
      termos.prazo,
      termos.taxa,
    );
    const limite = Math.max(1, esperada * TOLERANCIA_PARCELA);
    if (Math.abs(termos.parcela - esperada) > limite) {
      throw new BadRequestException(
        `Parcela incoerente com os termos do contrato (tabela Price): esperado ${esperada}, recebido ${termos.parcela}`,
      );
    }
  }
}
