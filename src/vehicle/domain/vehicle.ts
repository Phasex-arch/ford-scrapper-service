export class Vehicle {
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
  basePrice: number | null;
  currency: string;
  motorizacao: Motorizacao;
  cores: Cor[];
  imagens: Imagem[];
  fontes: Fontes;
  observacao: string | null;
  updatedAt: Date;
  createdAt: Date;
}

export interface Motorizacao {
  id: string;
  descricao: string;
  combustivel: string;
  potencia_cv: number;
  torque_nm: number;
  tracao: string;
  transmissao: string;
}

export interface Cor {
  id: string;
  nome: string;
  codigo: string | null;
  disponibilidade: string;
}

export interface Imagem {
  id: string;
  tipo: string;
  url: string;
}

export interface Fontes {
  id: string;
  modelo_url: string;
  versao_url: string | null;
  ficha_tecnica_url: string | null;
  cores_url: string;
}
