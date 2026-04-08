export interface FordCatalogResponse {
  brand: string;
  market: string;
  collected_at: string;
  source: string;
  vehicles: VehicleInfo[];
}

export interface VehicleInfo {
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
  motorizacao: Motorizacao;
  cores: Cor[];
  imagens: Imagem[];
  fontes: Fontes;
  observacao: string | null;
}

export interface Motorizacao {
  descricao: string | null;
  combustivel: string | null;
  potencia_cv: number | null;
  torque_nm: number | null;
  tracao: string | null;
  transmissao: string | null;
}

export interface Cor {
  nome: string;
  codigo: string | null;
  disponibilidade: string;
}

export interface Imagem {
  tipo: string;
  url: string;
}

export interface Fontes {
  modelo_url: string;
  versao_url: string | null;
  ficha_tecnica_url: string | null;
  cores_url: string | null;
}

export interface CatalogEntry {
  name: string;
  category: string;
  price: number | null;
  modelPageUrl: string;
  versionPageUrl: string | null;
  modelYear: number | null;
  brVersion: string | null;
}

export interface ModelPageData {
  fichaTecnicaPdfUrl: string | null;
  versionUrls: string[];
  colors: string[];
  imageUrls: string[];
}

export interface VersionPageData {
  versionName: string;
  price: number | null;
  modelYear: number | null;
  specs: Record<string, Record<string, string>>;
  colors: string[];
  motorInfo: {
    description: string | null;
    fuel: string | null;
    powerCv: number | null;
    torqueNm: number | null;
    traction: string | null;
    transmission: string | null;
  };
}
