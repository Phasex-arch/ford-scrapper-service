import { Imagem, Fontes, Motorizacao, Cor } from "src/scrapper/domain/scrapped-info";

export interface Vehicle {
    id: string;
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

