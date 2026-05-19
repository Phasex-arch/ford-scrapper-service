import type { VehicleInfo } from 'src/scrapper/domain/scrapped-info.js';
import type { CreateVehicleDto } from '../dto/create-vehicle.dto.js';

export function mapVehicleInfoToDto(info: VehicleInfo): CreateVehicleDto {
  return {
    slug: info.slug,
    categoria_principal: info.categoria_principal,
    categoria_secundaria: info.categoria_secundaria,
    tipo_veiculo: info.tipo_veiculo,
    familia: info.familia,
    modelo: info.modelo,
    versao: info.versao,
    ano_modelo: info.ano_modelo,
    status: info.status,
    preco_inicial: info.preco_inicial,
    basePrice: info.preco_inicial,
    currency: info.moeda,
    observacao: info.observacao,
    motorizacao: {
      descricao: info.motorizacao.descricao ?? '',
      combustivel: info.motorizacao.combustivel ?? '',
      potencia_cv: info.motorizacao.potencia_cv ?? 0,
      torque_nm: info.motorizacao.torque_nm ?? 0,
      tracao: info.motorizacao.tracao ?? '',
      transmissao: info.motorizacao.transmissao ?? '',
    },
    cores: info.cores.map((c) => ({
      nome: c.nome,
      codigo: c.codigo,
      disponibilidade: c.disponibilidade,
    })),
    imagens: info.imagens.map((i) => ({
      tipo: i.tipo,
      url: i.url,
    })),
    fontes: {
      modelo_url: info.fontes.modelo_url,
      versao_url: info.fontes.versao_url,
      ficha_tecnica_url: info.fontes.ficha_tecnica_url,
      cores_url: info.fontes.cores_url ?? '',
    },
  };
}
