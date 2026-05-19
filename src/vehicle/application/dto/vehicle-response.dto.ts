import type { Vehicle } from '../../domain/vehicle.js';

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface VehicleListResponse {
  brand: string;
  market: string;
  collected_at: string;
  source: string;
  pagination: PaginationMeta;
  vehicles: VehicleResponseItem[];
}

export interface VehicleResponseItem {
  id: string;
  slug: string;
  categoria_principal: string;
  categoria_secundaria: string | null;
  tipo_veiculo: string;
  familia: string;
  modelo: string;
  versao: string;
  ano_modelo: number;
  status: string;
  preco_inicial: number | null;
  moeda: string;
  motorizacao: {
    descricao: string;
    combustivel: string;
    potencia_cv: number;
    torque_nm: number;
    tracao: string;
    transmissao: string;
  };
  cores: {
    nome: string;
    codigo: string | null;
    disponibilidade: string;
  }[];
  imagens: {
    tipo: string;
    url: string;
  }[];
  fontes: {
    modelo_url: string;
    versao_url: string | null;
    ficha_tecnica_url: string | null;
    cores_url: string;
  };
}

export function mapVehicleToResponse(vehicle: Vehicle): VehicleResponseItem {
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    categoria_principal: vehicle.categoria_principal,
    categoria_secundaria: vehicle.categoria_secundaria,
    tipo_veiculo: vehicle.tipo_veiculo,
    familia: vehicle.familia,
    modelo: vehicle.modelo,
    versao: vehicle.versao,
    ano_modelo: vehicle.ano_modelo,
    status: vehicle.status,
    preco_inicial: vehicle.preco_inicial,
    moeda: vehicle.currency,
    motorizacao: {
      descricao: vehicle.motorizacao.descricao,
      combustivel: vehicle.motorizacao.combustivel,
      potencia_cv: vehicle.motorizacao.potencia_cv,
      torque_nm: vehicle.motorizacao.torque_nm,
      tracao: vehicle.motorizacao.tracao,
      transmissao: vehicle.motorizacao.transmissao,
    },
    cores: vehicle.cores.map((c) => ({
      nome: c.nome,
      codigo: c.codigo,
      disponibilidade: c.disponibilidade,
    })),
    imagens: vehicle.imagens.map((i) => ({
      tipo: i.tipo,
      url: i.url,
    })),
    fontes: {
      modelo_url: vehicle.fontes.modelo_url,
      versao_url: vehicle.fontes.versao_url,
      ficha_tecnica_url: vehicle.fontes.ficha_tecnica_url,
      cores_url: vehicle.fontes.cores_url,
    },
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
