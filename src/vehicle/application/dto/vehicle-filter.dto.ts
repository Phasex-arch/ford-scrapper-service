export interface VehicleFilterDto {
  categoria?: string;
  modelo?: string;
  versao?: string;
  cor?: string;
  tipo_veiculo?: string;
  combustivel?: string;
  tracao?: string;
  transmissao?: string;
  preco_min?: number;
  preco_max?: number;
  sort?: 'preco_asc' | 'preco_desc';
  page?: number;
  limit?: number;
}
