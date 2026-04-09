export interface CreateVehicleDto {
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
    observacao: string | null;
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
