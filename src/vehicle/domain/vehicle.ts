import { Imagem, Fontes, Motorizacao, Cor } from "../../scrapper/domain/scrapped-info";

export interface Vehicle {
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

