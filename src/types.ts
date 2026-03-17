export interface PrecoItem {
  orgao: string;
  data: string;
  valor: number;
  idCompra?: string;
  nomeFornecedor?: string;
  marca?: string;
  itemSustentavel?: boolean;
  porteFornecedor?: string; // ME/EPP etc
  numeroControlePNCP?: string;
  selected?: boolean; // UI state
  categoria?: 'material' | 'servico';
}

export interface Estatisticas {
  menor: number;
  maior: number;
  media: number;
  mediana: number;
  desvioPadrao: number;
  amostras: number;
}

export interface CatalogoItem {
  codigo: string;
  nome: string;
  descricao?: string;
}

export interface LicitacaoItem {
  numero_licitacao: string;
  objeto: string;
  modalidade: string;
  data_abertura: string;
  orgao: string;
}

export interface ItemDetalhe {
  codigo: number;
  descricao: string;
  unidade_medida?: string;
  grupo?: string;
  classe?: string;
  descricaoDetalhada?: string;
}

export interface HistoryItem {
  codigo: string;
  titulo: string;
  tipo: 'material' | 'servico';
  data: string;
}
