import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Download, 
  Trash2, 
  TrendingUp, 
  Calculator, 
  AlertCircle, 
  CheckCircle2, 
  Filter, 
  BarChart3, 
  X, 
  Package, 
  Settings2, 
  ArrowRight, 
  Loader2, 
  History, 
  Clock, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  Gavel,
  ExternalLink,
  Calendar
} from 'lucide-react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { PrecoItem, Estatisticas, CatalogoItem, HistoryItem, LicitacaoItem, ItemDetalhe } from './types';

export default function App() {
  const [catmat, setCatmat] = useState('');
  const [titulo, setTitulo] = useState('Aquisição de Materiais');
  const [loading, setLoading] = useState(false);
  const [rawDados, setRawDados] = useState<PrecoItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [removeOutliers, setRemoveOutliers] = useState(true);

  // Advanced Filters
  const [filterUF, setFilterUF] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [catmatError, setCatmatError] = useState<string | null>(null);

  // New Data States
  const [itemDetalhe, setItemDetalhe] = useState<ItemDetalhe | null>(null);
  const [licitacoes, setLicitacoes] = useState<LicitacaoItem[]>([]);
  const [activeTab, setActiveTab] = useState<'precos' | 'licitacoes'>('precos');
  const [expandedLicitacao, setExpandedLicitacao] = useState<number | null>(null);
  const [isItemDetailExpanded, setIsItemDetailExpanded] = useState(false);

  // Catalog Search State
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [catalogType, setCatalogType] = useState<'material' | 'servico'>('material');
  const [catalogResults, setCatalogResults] = useState<CatalogoItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Filter State
  const [categoryFilter, setCategoryFilter] = useState<'todos' | 'material' | 'servico'>('todos');

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('govprice_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const addToHistory = (codigo: string, titulo: string, tipo: 'material' | 'servico') => {
    const newItem: HistoryItem = {
      codigo,
      titulo,
      tipo,
      data: new Date().toISOString()
    };

    setHistory(prev => {
      const filtered = prev.filter(item => item.codigo !== codigo);
      const updated = [newItem, ...filtered].slice(0, 10);
      localStorage.setItem('govprice_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('govprice_history');
  };

  const validateCatmat = (value: string) => {
    if (!value) {
      setCatmatError(null);
      return;
    }
    const isNumeric = /^\d+$/.test(value);
    if (!isNumeric) {
      setCatmatError('O código deve conter apenas números');
    } else if (value.length > 10) {
      setCatmatError('O código deve ter no máximo 10 dígitos');
    } else {
      setCatmatError(null);
    }
  };

  const handleCatmatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCatmat(value);
    validateCatmat(value);
  };

  const toggleItemSelection = (index: number) => {
    setRawDados(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  };

  const handleSearch = async (e?: React.FormEvent, directCatmat?: string, directTitulo?: string, type?: 'material' | 'servico') => {
    if (e) e.preventDefault();
    const targetCatmat = directCatmat || catmat;
    if (!targetCatmat) return;

    const searchType = type || catalogType;

    setLoading(true);
    setError(null);
    setItemDetalhe(null);
    setLicitacoes([]);
    
    try {
      // Parallel requests for better performance
      const [precosRes, detalheRes, licitacoesRes] = await Promise.allSettled([
        axios.get(`/api/precos/${targetCatmat}`, {
          params: { uf: filterUF, dataInicio: filterDate }
        }),
        axios.get(`/api/catalogo/detalhe/${searchType}/${targetCatmat}`),
        axios.get(`/api/licitacoes/item/${targetCatmat}`)
      ]);

      if (precosRes.status === 'fulfilled') {
        // Categorize results based on the search type
        const data = precosRes.value.data.map((item: any) => ({
          ...item,
          categoria: searchType
        }));
        setRawDados(data);
      } else {
        setError('Falha ao buscar preços.');
      }

      if (detalheRes.status === 'fulfilled') {
        setItemDetalhe(detalheRes.value.data);
      }

      if (licitacoesRes.status === 'fulfilled') {
        const data = licitacoesRes.value.data;
        const list = data._embedded?.item_licitacoes || [];
        setLicitacoes(list.slice(0, 5));
      }
      
      if (directCatmat) {
        setCatmat(directCatmat);
        setCatmatError(null);
      }
      if (directTitulo) setTitulo(directTitulo);

      addToHistory(targetCatmat, directTitulo || titulo, searchType);
      setShowHistory(false);
    } catch (err) {
      setError('Falha ao buscar dados. Verifique o código CATMAT.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchCatalog = async () => {
    if (!catalogSearchTerm) return;
    setCatalogLoading(true);
    try {
      const response = await axios.get('/api/catalogo/search', {
        params: { termo: catalogSearchTerm, tipo: catalogType }
      });
      const results = Array.isArray(response.data) ? response.data : (response.data.resultado || []);
      setCatalogResults(results);
    } catch (err) {
      console.error("Erro ao buscar catálogo", err);
    } finally {
      setCatalogLoading(false);
    }
  };

  const selectCatalogItem = (item: CatalogoItem) => {
    const newTitulo = `Aquisição de ${item.nome}`;
    setCatmat(item.codigo);
    setCatmatError(null);
    setTitulo(newTitulo);
    setShowCatalogModal(false);
    handleSearch(undefined, item.codigo, newTitulo, catalogType);
  };

  const processedData = useMemo(() => {
    if (rawDados.length === 0) return { filtered: [], stats: null };

    // Only consider items selected by the user
    let filtered = rawDados.filter(d => d.selected);

    // Apply Category Filter
    if (categoryFilter !== 'todos') {
      filtered = filtered.filter(d => (d as any).categoria === categoryFilter);
    }
    
    // Calculate initial median for outlier removal
    const values = filtered.map(d => d.valor).sort((a, b) => a - b);
    if (values.length === 0) return { filtered: [], stats: null };

    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 !== 0 ? values[mid] : (values[mid - 1] + values[mid]) / 2;

    if (removeOutliers) {
      filtered = filtered.filter(d => d.valor <= median * 1.5);
    }

    const finalValues = filtered.map(d => d.valor).sort((a, b) => a - b);
    if (finalValues.length === 0) return { filtered: [], stats: null };

    const sum = finalValues.reduce((a, b) => a + b, 0);
    const mean = sum / finalValues.length;
    
    // Standard Deviation
    const squareDiffs = finalValues.map(v => Math.pow(v - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    const stdDev = Math.sqrt(avgSquareDiff);

    const finalMid = Math.floor(finalValues.length / 2);
    const finalMedian = finalValues.length % 2 !== 0 
      ? finalValues[finalMid] 
      : (finalValues[finalMid - 1] + finalValues[finalMid]) / 2;

    const stats: Estatisticas = {
      menor: Math.min(...finalValues),
      maior: Math.max(...finalValues),
      media: mean,
      mediana: finalMedian,
      desvioPadrao: stdDev,
      amostras: finalValues.length
    };

    return { filtered, stats };
  }, [rawDados, removeOutliers, categoryFilter]);

  const generatePDF = () => {
    const { filtered, stats } = processedData;
    if (!stats) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.setTextColor(20, 20, 20);
    doc.text('Relatório de Pesquisa de Preços', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('(Lei 14.133/21 e IN SEGES/ME nº 65/2021)', pageWidth / 2, 26, { align: 'center' });

    // Info
    doc.setFontSize(12);
    doc.text(`Título: ${titulo}`, 20, 40);
    doc.text(`Código CATMAT: ${catmat}`, 20, 48);
    doc.text(`Data da Pesquisa: ${format(new Date(), 'dd/MM/yyyy')}`, 20, 56);

    // Summary Table
    autoTable(doc, {
      startY: 65,
      head: [['Menor Preço', 'Média', 'Mediana', 'Amostras']],
      body: [[
        `R$ ${stats.menor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${stats.media.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${stats.mediana.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        stats.amostras.toString()
      ]],
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40] }
    });

    // Details Table
    doc.setFontSize(12);
    doc.text('Detalhamento das Fontes Selecionadas:', 20, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['#', 'Órgão / Fonte', 'Data', 'Valor (R$)']],
      body: filtered.map((d, i) => [
        (i + 1).toString(),
        d.orgao,
        d.data,
        d.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      ]),
      theme: 'striped'
    });

    // Note
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const note = "Nota Técnica: Pesquisa realizada conforme Instrução Normativa SEGES/ME nº 65/2021. Foram aplicados filtros para remoção de valores atípicos (outliers) visando a seleção da mediana como parâmetro de preço estimado.";
    doc.text(doc.splitTextToSize(note, pageWidth - 40), 20, finalY);

    doc.save(`pesquisa_precos_${catmat}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">GovPrice</h1>
          </div>
          <div className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Lei 14.133/21 Compliance
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Search & Config */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Search className="w-4 h-4" /> Parâmetros de Busca
                </h2>
                {history.length > 0 && (
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      showHistory ? "bg-indigo-100 text-indigo-600" : "text-slate-400 hover:bg-slate-100"
                    )}
                    title="Histórico Recente"
                  >
                    <History className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showHistory && history.length > 0 && (
                <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buscas Recentes</span>
                    <button onClick={clearHistory} className="text-[10px] text-red-400 hover:text-red-600 font-bold uppercase transition-colors">Limpar</button>
                  </div>
                  <div className="space-y-1">
                    {history.map((item, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handleSearch(undefined, item.codigo, item.titulo)}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left group transition-all"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Clock className="w-3 h-3 text-slate-300 group-hover:text-indigo-400" />
                          <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-600">{item.codigo}</span>
                          <span className="text-xs text-slate-600 truncate">{item.titulo.replace('Aquisição de ', '')}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-200 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-slate-100 mt-4" />
                </div>
              )}

              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título da Pesquisa</label>
                  <input 
                    type="text" 
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    placeholder="Ex: Aquisição de Ventiladores"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código CATMAT / CATSER</label>
                  <div className="flex gap-2 relative">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        value={catmat}
                        onChange={handleCatmatChange}
                        className={cn(
                          "w-full px-4 py-2 rounded-xl border focus:ring-2 focus:border-transparent outline-none transition-all",
                          catmatError ? "border-red-300 focus:ring-red-500 bg-red-50/30" : "border-slate-200 focus:ring-indigo-500"
                        )}
                        placeholder="Ex: 470674"
                      />
                      {catmatError && (
                        <p className="absolute -bottom-5 left-0 text-[10px] font-bold text-red-500 uppercase tracking-tight animate-in fade-in slide-in-from-top-1 duration-200">
                          {catmatError}
                        </p>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowCatalogModal(true)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-xl transition-colors h-[42px]"
                      title="Pesquisar no Catálogo"
                    >
                      <Package className="w-6 h-6" />
                    </button>
                    <button 
                      type="submit"
                      disabled={loading || !!catmatError || !catmat}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl transition-colors disabled:opacity-50 h-[42px]"
                    >
                      <Search className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </form>
            </section>

            {/* Catalog Modal */}
            {showCatalogModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-xl">
                        <Package className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Pesquisa de Catálogo</h3>
                        <p className="text-xs text-slate-400">Busque por materiais ou serviços (CATMAT/CATSER)</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setShowCatalogModal(false)}
                      className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="flex gap-4 p-1 bg-slate-100 rounded-xl">
                      <button 
                        onClick={() => setCatalogType('material')}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                          catalogType === 'material' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Materiais (CATMAT)
                      </button>
                      <button 
                        onClick={() => setCatalogType('servico')}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-sm font-medium transition-all",
                          catalogType === 'servico' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        Serviços (CATSER)
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                          type="text" 
                          value={catalogSearchTerm}
                          onChange={(e) => setCatalogSearchTerm(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchCatalog()}
                          placeholder={`Buscar ${catalogType === 'material' ? 'material' : 'serviço'}...`}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <button 
                        onClick={searchCatalog}
                        disabled={catalogLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {catalogLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Buscar
                      </button>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                      {catalogResults.length > 0 ? (
                        catalogResults.map((item) => (
                          <button 
                            key={item.codigo}
                            onClick={() => selectCatalogItem(item)}
                            className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                                  {item.codigo}
                                </span>
                                <h4 className="font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                                  {item.nome}
                                </h4>
                              </div>
                              {item.descricao && (
                                <p className="text-xs text-slate-400 line-clamp-1">{item.descricao}</p>
                              )}
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
                          </button>
                        ))
                      ) : catalogLoading ? (
                        <div className="py-12 text-center text-slate-400">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 opacity-20" />
                          <p>Buscando no catálogo oficial...</p>
                        </div>
                      ) : (
                        <div className="py-12 text-center text-slate-300 italic">
                          Nenhum resultado para exibir.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtros de Categoria
              </h2>
              <div className="flex flex-col gap-2">
                {[
                  { id: 'todos', label: 'Todos os Itens', icon: BarChart3 },
                  { id: 'material', label: 'Apenas Materiais', icon: Package },
                  { id: 'servico', label: 'Apenas Serviços', icon: Settings2 },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setCategoryFilter(filter.id as any)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                      categoryFilter === filter.id 
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                        : "text-slate-600 hover:bg-slate-50 border border-transparent"
                    )}
                  >
                    <filter.icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4" /> Tratamento Estatístico
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={removeOutliers}
                      onChange={(e) => setRemoveOutliers(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={cn(
                      "w-10 h-6 rounded-full transition-colors",
                      removeOutliers ? "bg-indigo-600" : "bg-slate-200"
                    )} />
                    <div className={cn(
                      "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
                      removeOutliers ? "translate-x-4" : "translate-x-0"
                    )} />
                  </div>
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                    Remover Outliers (Art. 6º IN 65/21)
                  </span>
                </label>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Remove automaticamente valores que excedem 50% da mediana bruta, garantindo maior precisão no preço estimado.
                </p>
              </div>
            </section>

            {processedData.stats && (
              <button 
                onClick={generatePDF}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
              >
                <Download className="w-5 h-5" /> Gerar Relatório PDF
              </button>
            )}
          </div>

          {/* Right Panel: Results & Charts */}
          <div className="lg:col-span-8 space-y-6">
            {loading ? (
              <div className="bg-white rounded-2xl p-12 border border-slate-200 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Consultando base de dados do Governo Federal...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800">Erro na Consulta</h3>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            ) : processedData.stats ? (
              <>
                {/* Item Details Card */}
                {itemDetalhe && (
                  <div className={cn(
                    "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300",
                    isItemDetailExpanded ? "ring-2 ring-indigo-100" : ""
                  )}>
                    <button 
                      onClick={() => setIsItemDetailExpanded(!isItemDetailExpanded)}
                      className="w-full p-6 flex items-start justify-between hover:bg-slate-50/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-xl">
                          <Info className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800">Detalhes do Item</h3>
                          <p className="text-xs text-slate-400">Informações técnicas do catálogo oficial</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
                          {catalogType.toUpperCase()} {itemDetalhe.codigo}
                        </span>
                        {isItemDetailExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </button>
                    
                    {isItemDetailExpanded && (
                      <div className="px-6 pb-6 animate-in slide-in-from-top-2 duration-200">
                        <div className="h-px bg-slate-100 mb-6" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Descrição Completa</p>
                            <p className="text-slate-800 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                              {itemDetalhe.descricao}
                            </p>
                          </div>
                          <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidade de Medida</p>
                                <div className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-semibold border border-indigo-100">
                                  {itemDetalhe.unidade_medida || 'N/A'}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código</p>
                                <div className="bg-slate-50 text-slate-700 px-3 py-2 rounded-lg font-mono font-bold border border-slate-100">
                                  {itemDetalhe.codigo}
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grupo</p>
                                <p className="text-slate-700 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{itemDetalhe.grupo || 'N/A'}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classe</p>
                                <p className="text-slate-700 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{itemDetalhe.classe || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tabs */}
                <div className="flex gap-4 border-b border-slate-200">
                  <button 
                    onClick={() => setActiveTab('precos')}
                    className={cn(
                      "pb-4 px-2 text-sm font-semibold transition-all relative",
                      activeTab === 'precos' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Análise de Preços
                    {activeTab === 'precos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab('licitacoes')}
                    className={cn(
                      "pb-4 px-2 text-sm font-semibold transition-all relative",
                      activeTab === 'licitacoes' ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Licitações Relacionadas
                    {activeTab === 'licitacoes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                  </button>
                </div>

                {activeTab === 'precos' ? (
                  <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { label: 'Menor Preço', value: processedData.stats.menor, icon: TrendingUp, color: 'text-emerald-600' },
                        { label: 'Média', value: processedData.stats.media, icon: Calculator, color: 'text-indigo-600' },
                        { label: 'Mediana', value: processedData.stats.mediana, icon: BarChart3, color: 'text-blue-600' },
                        { label: 'Desvio Padrão', value: processedData.stats.desvioPadrao, icon: Settings2, color: 'text-amber-600' },
                        { label: 'Amostras', value: processedData.stats.amostras, icon: CheckCircle2, color: 'text-slate-600', isCurrency: false },
                      ].map((stat, i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <stat.icon className={cn("w-4 h-4", stat.color)} />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
                          </div>
                          <div className="text-lg font-bold text-slate-800">
                            {stat.isCurrency === false ? stat.value : `R$ ${stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">Distribuição de Preços</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={processedData.filtered}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="orgao" hide />
                            <YAxis 
                              tick={{ fontSize: 10, fill: '#94A3B8' }}
                              tickFormatter={(val) => `R$ ${val}`}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Preço']}
                            />
                            <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                              {processedData.filtered.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.valor === processedData.stats?.mediana ? '#4F46E5' : '#94A3B8'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Resultados Brutos (Seleção Manual)</h3>
                        <span className="text-xs text-slate-400">{processedData.filtered.length} de {rawDados.length} selecionados</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-medium">
                              <th className="px-6 py-3 w-10">
                                <CheckCircle2 className="w-4 h-4" />
                              </th>
                              <th className="px-6 py-3">Fornecedor / ID Compra</th>
                              <th className="px-6 py-3">Marca / Data</th>
                              <th className="px-6 py-3 text-right">Valor Unitário</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {rawDados.map((item, i) => (
                              <tr key={i} className={cn(
                                "hover:bg-slate-50 transition-colors",
                                !item.selected && "opacity-50 grayscale"
                              )}>
                                <td className="px-6 py-4">
                                  <input 
                                    type="checkbox"
                                    checked={item.selected}
                                    onChange={() => toggleItemSelection(i)}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 truncate max-w-[200px]" title={item.nomeFornecedor}>
                                      {item.nomeFornecedor}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">
                                        {item.idCompra}
                                      </span>
                                      {item.porteFornecedor === 'ME/EPP' && (
                                        <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
                                          ME/EPP
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-slate-600 font-medium">{item.marca}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-slate-400">{item.data}</span>
                                      {item.itemSustentavel && (
                                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                                          <TrendingUp className="w-3 h-3" /> Sustentável
                                        </span>
                                      )}
                                      {item.numeroControlePNCP && (
                                        <a 
                                          href={`https://pncp.gov.br/app/editais/v1/visualizar/${item.numeroControlePNCP}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold hover:bg-indigo-100 transition-colors"
                                          title="Ver Edital no PNCP"
                                        >
                                          <ExternalLink className="w-2.5 h-2.5" /> PNCP
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="text-sm font-bold text-slate-900">
                                    R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                  {item.numeroControlePNCP && (
                                    <a 
                                      href={`https://pncp.gov.br/app/editais/${item.numeroControlePNCP}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-indigo-600 hover:underline flex items-center justify-end gap-1 mt-1"
                                    >
                                      Ver no PNCP <ExternalLink className="w-2 h-2" />
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    {licitacoes.length > 0 ? (
                      licitacoes.map((lic, idx) => {
                        const isExpanded = expandedLicitacao === idx;
                        // Construct official link if possible (Compras.gov pattern)
                        // Example: https://www.comprasnet.gov.br/consulta_licitacoes/v_licitacao_detalhe.asp?coduasg=120001&numprp=12023
                        const uasg = lic.numero_licitacao?.substring(0, 6);
                        const num = lic.numero_licitacao?.substring(6);
                        const officialLink = uasg && num ? `https://www.comprasnet.gov.br/consulta_licitacoes/v_licitacao_detalhe.asp?coduasg=${uasg}&numprp=${num}` : null;

                        return (
                          <div key={idx} className={cn(
                            "bg-white rounded-2xl border transition-all duration-300 group overflow-hidden",
                            isExpanded ? "border-indigo-300 shadow-md" : "border-slate-200 shadow-sm hover:border-indigo-200"
                          )}>
                            <div className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "p-2 rounded-xl transition-colors",
                                    isExpanded ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"
                                  )}>
                                    <Gavel className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-slate-800">Licitação {lic.numero_licitacao || 'N/A'}</h4>
                                    <p className="text-xs text-slate-400">{lic.modalidade || 'Modalidade N/A'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  {lic.data_abertura ? format(new Date(lic.data_abertura), 'dd/MM/yyyy') : 'Data N/A'}
                                </div>
                              </div>
                              
                              <p className={cn(
                                "text-sm text-slate-600 leading-relaxed transition-all",
                                isExpanded ? "" : "line-clamp-2"
                              )}>
                                {lic.objeto || 'Sem descrição do objeto disponível.'}
                              </p>

                              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
                                <span className="text-xs font-semibold text-slate-500 truncate max-w-[60%]">{lic.orgao}</span>
                                <div className="flex items-center gap-3">
                                  {officialLink && (
                                    <a 
                                      href={officialLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1 transition-colors"
                                    >
                                      Portal Oficial <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                  <button 
                                    onClick={() => setExpandedLicitacao(isExpanded ? null : idx)}
                                    className="text-slate-400 hover:text-slate-600 text-xs font-bold flex items-center gap-1 transition-colors"
                                  >
                                    {isExpanded ? 'Recolher' : 'Ver Detalhes'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-white rounded-2xl p-12 border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
                        <Gavel className="w-12 h-12 text-slate-200 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Sem licitações recentes</h3>
                        <p className="text-slate-500 max-w-xs">Não encontramos processos licitatórios recentes para este item no sistema do Governo.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-2xl p-12 border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
                <div className="bg-slate-50 p-6 rounded-full mb-4">
                  <FileText className="w-12 h-12 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Nenhuma pesquisa ativa</h3>
                <p className="text-slate-500 max-w-xs">
                  Insira um código CATMAT ao lado para iniciar a coleta de preços praticados na administração pública.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs">
          <p>© 2026 GovPrice - Ferramenta de Apoio à Gestão Pública</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-indigo-600 transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacidade</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Documentação API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
