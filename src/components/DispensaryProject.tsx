import React, { useState, useMemo } from 'react';
import { ClipboardList, AlertTriangle, CheckCircle2, TrendingUp, Package, ArrowRight, ShieldAlert, FileText, Play, Trash2, FileUp, Search, Filter, Tag, BarChart3, Clock, Layers, Activity, Pill, ShieldCheck, Stethoscope } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { DispensaryAlerts } from './DispensaryAlerts';
import { CockpitFarmaceutico } from './CockpitFarmaceutico';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface Base1Item {
  id: string;
  name: string;
  qty: number;
  source: string;
}

interface Base2Item {
  id: string;
  name: string;
  qty: number;
  cost: number;
}

interface AlertItem {
  id: string;
  gaveta: string;
  produto: string;
  descricao: string;
  tipo: string;
  saldoAlerta: number;
  saldoGaveta: number;
  dataAlerta: string;
  tempo: string;
  dispensario: string;
  status: string;
  alerta: string;
  wlid: string;
  operacao: string;
  dataHora: string;
  quantidade: number;
  transferencia: string;
  observacoes: string;
}

export const DispensaryProject: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'analysis' | 'alerts' | 'cockpit'>('analysis');
  const [base1Raw, setBase1Raw] = useState('');
  const [base2Raw, setBase2Raw] = useState('');
  const [base1File, setBase1File] = useState<File | null>(null);
  const [base2File, setBase2File] = useState<File | null>(null);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [incSearch, setIncSearch] = useState('');
  const [incType, setIncType] = useState<'all' | 'med' | 'mat'>('all');
  const [incOrigin, setIncOrigin] = useState('all');
  const [rupSearch, setRupSearch] = useState('');
  const [rupType, setRupType] = useState<'all' | 'med' | 'mat'>('all');
  const [rupStatus, setRupStatus] = useState('all');

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }
    
    return fullText;
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    setRaw: (val: string) => void, 
    setFile: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      
      if (file.type === 'application/pdf') {
        setIsExtracting(true);
        try {
          const text = await extractTextFromPdf(file);
          setRaw(text);
        } catch (error) {
          console.error('Erro ao ler PDF:', error);
          alert('Erro ao extrair texto do PDF. Tente converter para texto ou CSV.');
        } finally {
          setIsExtracting(false);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setRaw(text);
        };
        reader.readAsText(file);
      }
    }
  };

  const analysis = useMemo(() => {
    if (!base1Raw && !base2Raw) return null;

    // Parse Base 1 (Satellite Orders) - Semicolon separated
    const base1Lines = base1Raw.split('\n');
    const base1Map: Record<string, Base1Item> = {};
    
    base1Lines.forEach(line => {
      if (line.includes('UTI 5 - PEDIATRICA')) {
        const parts = line.split(';');
        if (parts.length >= 10) {
          const id = parts[2]?.trim();
          const name = parts[3]?.trim();
          const qty = parseInt(parts[9]) || 0;
          const source = parts[8]?.trim();
          
          if (id && name) {
            if (base1Map[id]) {
              base1Map[id].qty += qty;
            } else {
              base1Map[id] = { id, name, qty, source };
            }
          }
        }
      }
    });

    // Parse Base 2 (Dispensary Consumption) - CSV or OCR Format
    const base2Lines = base2Raw.split('\n');
    const base2Map: Record<string, Base2Item> = {};
    
    base2Lines.forEach(line => {
      // Try CSV Format first (comma separated)
      if (line.includes(',')) {
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        if (parts.length >= 11) {
          const id = parts[1]?.replace(/"/g, '').trim();
          if (id && /^\d+$/.test(id)) {
            const name = parts[3]?.replace(/"/g, '').trim();
            const qty = parseInt(parts[10]?.replace(/"/g, '')) || 0;
            const costStr = parts[8]?.replace(/"/g, '').replace(',', '.') || '0';
            const cost = parseFloat(costStr) || 0;
            if (id) base2Map[id] = { id, name, qty, cost };
            return;
          }
        }
      }

      // Try OCR Format (Space separated with specific pattern)
      const ocrMatch = line.match(/^\s*(\d+)\s+(\d+)\s+(.+?)\s+([\d,.]+)\s+(\d+)\s+/);
      if (ocrMatch) {
        const id = ocrMatch[2];
        const name = ocrMatch[3];
        const costStr = ocrMatch[4].replace(',', '.');
        const cost = parseFloat(costStr) || 0;
        const qty = parseInt(ocrMatch[5]) || 0;
        if (id) base2Map[id] = { id, name, qty, cost };
        return;
      }

      // Fallback for messy OCR
      const parts = line.trim().split(/\s+/);
      if (parts.length > 5) {
        const idCandidate = parts[1];
        if (/^\d+$/.test(idCandidate)) {
          const costIndex = parts.findIndex(p => /^0,\d+$/.test(p) || /^\d+,\d{4}$/.test(p));
          if (costIndex !== -1 && parts[costIndex + 1]) {
            const qty = parseInt(parts[costIndex + 1]) || 0;
            const costStr = parts[costIndex].replace(',', '.');
            const cost = parseFloat(costStr) || 0;
            if (qty > 0) {
              base2Map[idCandidate] = { id: idCandidate, name: parts.slice(2, costIndex).join(' '), qty, cost };
            }
          }
        }
      }
    });

    // Analysis Logic
    const inclusions: any[] = [];
    const ruptures: any[] = [];

    // 1. Identify Inclusions (In Base 1 but NOT in Base 2)
    Object.values(base1Map).forEach(item => {
      if (!base2Map[item.id] && item.qty > 3) {
        let priority = 'Baixa';
        let gain = 'Otimização pontual de fluxo.';
        
        if (item.qty > 80) {
          priority = 'Crítica';
          gain = 'Redução massiva de retrabalho manual e risco de erro.';
        } else if (item.qty > 30) {
          priority = 'Alta';
          gain = 'Ganho operacional significativo na farmácia satélite.';
        } else if (item.qty > 10) {
          priority = 'Média';
          gain = 'Melhoria no tempo de resposta assistencial.';
        }

        inclusions.push({
          name: item.name,
          qty: item.qty,
          source: item.source,
          priority,
          gain
        });
      }
    });

    // 2. Identify Ruptures (In BOTH Base 1 and Base 2)
    Object.values(base1Map).forEach(item => {
      if (base2Map[item.id]) {
        const dispQty = base2Map[item.id].qty;
        const pharmQty = item.qty;
        const totalDemand = dispQty + pharmQty;
        const fulfillmentRate = (dispQty / totalDemand) * 100;
        const avgCost = base2Map[item.id].cost;
        const financialImpact = pharmQty * avgCost;
        
        let status = 'Atenção';
        let desc = '';
        
        if (fulfillmentRate < 40) {
          status = 'Crítico';
          desc = `Grade gravemente subdimensionada. O dispensário supre apenas ${fulfillmentRate.toFixed(0)}% da demanda.`;
        } else if (fulfillmentRate < 75) {
          status = 'Alerta';
          desc = `Capacidade insuficiente. ${(100 - fulfillmentRate).toFixed(0)}% do consumo foge do fluxo automatizado.`;
        } else {
          status = 'Otimização';
          desc = `Gargalo residual. A grade atende ${fulfillmentRate.toFixed(0)}%, mas ainda gera retrabalho na satélite.`;
        }

        ruptures.push({
          name: item.name,
          disp: dispQty,
          pharm: pharmQty,
          total: totalDemand,
          rate: fulfillmentRate,
          cost: avgCost,
          impact: financialImpact,
          status,
          desc
        });
      }
    });

    return {
      inclusions: inclusions.sort((a, b) => b.qty - a.qty),
      ruptures: ruptures.sort((a, b) => a.rate - b.rate)
    };
  }, [base1Raw, base2Raw]);

  const handleAnalyze = () => {
    if (!base1Raw || !base2Raw) {
      alert('Por favor, insira os dados das Bases 1 e 2.');
      return;
    }
    setIsAnalyzed(true);
  };

  const filteredInclusions = useMemo(() => {
    if (!analysis?.inclusions) return [];
    
    const isMaterial = (name: string) => 
      /AGULHA|SERINGA|EQUIPO|ESPACADOR|AVENTAL|SONDA|LUVA|HAC KIT|EXTENSOR|CAMPO|GAZE|COMPRESSA|ATADURA|ESPARADRAPO|FITA|SONDA|CATETER|DRENO|TUBO|MASCARA|GORRO|PROPÉ|LUVAS|KIT|EQUIP|EXTENS|SERING|AGULH/i.test(name);
    
    const isMed = (name: string) => {
      if (isMaterial(name)) return false;
      return /AMP|CP|FA|MG|ML|G|UI|COMP|FRASCO|FR|CAPS|BL|BISN|POM|XPE|SOL|GOTAS|GOT|DRG|SUP|EV|IM|VO|SC|ID|TOP/i.test(name);
    };

    return analysis.inclusions.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(incSearch.toLowerCase());
      const matchesOrigin = incOrigin === 'all' || item.source === incOrigin;
      const matchesType = incType === 'all' || (incType === 'med' ? isMed(item.name) : isMaterial(item.name));
      
      return matchesSearch && matchesOrigin && matchesType;
    });
  }, [analysis?.inclusions, incSearch, incType, incOrigin]);

  const filteredRuptures = useMemo(() => {
    if (!analysis?.ruptures) return [];

    const isMaterial = (name: string) => 
      /AGULHA|SERINGA|EQUIPO|ESPACADOR|AVENTAL|SONDA|LUVA|HAC KIT|EXTENSOR|CAMPO|GAZE|COMPRESSA|ATADURA|ESPARADRAPO|FITA|SONDA|CATETER|DRENO|TUBO|MASCARA|GORRO|PROPÉ|LUVAS|KIT|EQUIP|EXTENS|SERING|AGULH/i.test(name);
    
    const isMed = (name: string) => {
      if (isMaterial(name)) return false;
      return /AMP|CP|FA|MG|ML|G|UI|COMP|FRASCO|FR|CAPS|BL|BISN|POM|XPE|SOL|GOTAS|GOT|DRG|SUP|EV|IM|VO|SC|ID|TOP/i.test(name);
    };

    return analysis.ruptures.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(rupSearch.toLowerCase());
      const matchesStatus = rupStatus === 'all' || item.status === rupStatus;
      const matchesType = rupType === 'all' || (rupType === 'med' ? isMed(item.name) : isMaterial(item.name));
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [analysis?.ruptures, rupSearch, rupType, rupStatus]);

  const uniqueOrigins = useMemo(() => {
    if (!analysis?.inclusions) return [];
    const origins = new Set(analysis.inclusions.map(i => i.source));
    return Array.from(origins).sort();
  }, [analysis?.inclusions]);

  const clearData = () => {
    setBase1Raw('');
    setBase2Raw('');
    setBase1File(null);
    setBase2File(null);
    setIsAnalyzed(false);
    setIncSearch('');
    setIncType('all');
    setIncOrigin('all');
    setRupSearch('');
    setRupType('all');
    setRupStatus('all');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <ClipboardList className="w-32 h-32 text-indigo-600" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Análise Especialista
            </span>
            <span className="text-slate-400 text-sm">|</span>
            <span className="text-slate-500 text-sm font-medium">UTI Pediátrica - Inteligência Logística</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Projeto Dispensário: Otimização Logística</h2>
          <p className="text-slate-600 max-w-3xl leading-relaxed">
            Ferramenta de cruzamento de dados para identificação de retrabalho e rupturas. 
            Compare pedidos avulsos às farmácias satélite com o consumo real do dispensário eletrônico.
          </p>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('analysis')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeSubTab === 'analysis' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Cruzamento de Bases (Satélite x Dispensário)
        </button>
        <button
          onClick={() => setActiveSubTab('alerts')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeSubTab === 'alerts' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Monitoramento de Alertas de Estoque
        </button>
        <button
          onClick={() => setActiveSubTab('cockpit')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeSubTab === 'cockpit' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Cockpit Farmacêutico
        </button>
      </div>

      {activeSubTab === 'analysis' ? (
        <>
          {/* Input Section */}
          {!isAnalyzed ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Base 1: Pedidos às Farmácias Satélite (CSV)
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => handleFileUpload(e, setBase1Raw, setBase1File)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all ${
                      base1File ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 group-hover:border-indigo-300'
                    }`}>
                      <div className={`p-3 rounded-full ${base1File ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-400'}`}>
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">
                          {base1File ? base1File.name : 'Clique para selecionar ou arraste o arquivo'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Formato: CSV ou TXT</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    Base 2: Consumo Interno Dispensário (PDF/CSV)
                  </label>
                  <div className="relative group">
                    <input
                      type="file"
                      accept=".pdf,.csv,.txt"
                      onChange={(e) => handleFileUpload(e, setBase2Raw, setBase2File)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 transition-all ${
                      base2File ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 group-hover:border-emerald-300'
                    }`}>
                      <div className={`p-3 rounded-full ${base2File ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400'}`}>
                        {isExtracting ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent" />
                        ) : (
                          <FileUp className="w-6 h-6" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-slate-700">
                          {isExtracting ? 'Extraindo dados do PDF...' : base2File ? base2File.name : 'Clique para selecionar ou arraste o arquivo'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">Formato: PDF, CSV ou TXT</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleAnalyze}
                  disabled={!base1File || !base2File || isExtracting}
                  className={`flex items-center gap-2 px-8 py-4 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
                    !base1File || !base2File || isExtracting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                  }`}
                >
                  <Play className="w-5 h-5 fill-current" />
                  {isExtracting ? 'AGUARDE...' : 'PROCESSAR ANÁLISE LOGÍSTICA'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  onClick={clearData}
                  className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-rose-600 transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Dados e Nova Análise
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Oportunidades de Inclusão */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-emerald-900 text-lg">Oportunidades de Inclusão</h3>
                  </div>
                  <div className="p-6 flex-1 space-y-6">
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 italic">
                        Itens com alto volume de saída direta das farmácias satélite que deveriam estar no dispensário.
                      </p>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Procurar item..."
                            value={incSearch}
                            onChange={(e) => setIncSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                          />
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <div className="flex-1 min-w-[140px]">
                            <div className="relative">
                              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <select
                                value={incType}
                                onChange={(e) => setIncType(e.target.value as any)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="all">Todos os Tipos</option>
                                <option value="med">Medicamentos</option>
                                <option value="mat">Materiais</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex-1 min-w-[140px]">
                            <div className="relative">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <select
                                value={incOrigin}
                                onChange={(e) => setIncOrigin(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="all">Todas as Origens</option>
                                {uniqueOrigins.map(origin => (
                                  <option key={origin} value={origin}>{origin}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredInclusions.length ? filteredInclusions.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all group space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-lg shadow-sm group-hover:bg-emerald-50 transition-colors">
                                <Package className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-sm leading-tight">{item.name}</h4>
                                <p className="text-[10px] text-slate-400 uppercase tracking-tight mt-0.5">Origem: {item.source}</p>
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <span className="text-lg font-bold text-emerald-600 leading-none">{item.qty}</span>
                              <span className="text-[9px] text-slate-400 uppercase font-bold">Pedidos</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                item.priority === 'Crítica' ? 'bg-rose-600 text-white' : 
                                item.priority === 'Alta' ? 'bg-rose-100 text-rose-700' : 
                                item.priority === 'Média' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                              }`}>
                                Prioridade {item.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 italic font-medium">
                              {item.gain}
                            </p>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-12 text-slate-400">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Nenhum item encontrado com os filtros atuais.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Alertas de Rutura / Parametrização */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-rose-600" />
                    <h3 className="font-bold text-rose-900 text-lg">Alertas de Rutura / Parametrização</h3>
                  </div>
                  <div className="p-6 flex-1 space-y-6">
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 italic">
                        Itens presentes no dispensário com alto volume de pedidos avulsos (Gargalo de Grade).
                      </p>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Procurar item..."
                            value={rupSearch}
                            onChange={(e) => setRupSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
                          />
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <div className="flex-1 min-w-[140px]">
                            <div className="relative">
                              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <select
                                value={rupType}
                                onChange={(e) => setRupType(e.target.value as any)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none outline-none focus:ring-2 focus:ring-rose-500"
                              >
                                <option value="all">Todos os Tipos</option>
                                <option value="med">Medicamentos</option>
                                <option value="mat">Materiais</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex-1 min-w-[140px]">
                            <div className="relative">
                              <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <select
                                value={rupStatus}
                                onChange={(e) => setRupStatus(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 appearance-none outline-none focus:ring-2 focus:ring-rose-500"
                              >
                                <option value="all">Todos os Status</option>
                                <option value="Crítico">Crítico</option>
                                <option value="Alerta">Alerta</option>
                                <option value="Acompanhar">Acompanhar</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredRuptures.length ? filteredRuptures.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-bold text-slate-800 text-sm">{item.name}</h4>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                      item.rate < 40 ? 'bg-rose-600' : item.rate < 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${item.rate}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                  {item.rate.toFixed(0)}% Atendimento
                                </span>
                              </div>
                            </div>
                            <span className={`ml-3 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.status === 'Crítico' ? 'bg-rose-600 text-white' : 
                              item.status === 'Alerta' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                            }`}>
                              {item.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white/60 p-2 rounded-lg border border-rose-100 text-center">
                              <p className="text-[8px] text-slate-400 uppercase font-bold">Consumo Máquina</p>
                              <p className="text-base font-bold text-slate-700">{item.disp}</p>
                            </div>
                            <div className="bg-rose-100/40 p-2 rounded-lg border border-rose-200 text-center">
                              <p className="text-[8px] text-rose-400 uppercase font-bold">Pedidos Satélite</p>
                              <p className="text-base font-bold text-rose-600">{item.pharm}</p>
                            </div>
                            <div className="bg-slate-100/60 p-2 rounded-lg border border-slate-200 text-center">
                              <p className="text-[8px] text-slate-400 uppercase font-bold">Custo Médio</p>
                              <p className="text-base font-bold text-slate-900">R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-indigo-50/60 p-2 rounded-lg border border-indigo-100 text-center">
                              <p className="text-[8px] text-indigo-400 uppercase font-bold">Impacto Financeiro</p>
                              <p className="text-base font-bold text-indigo-600">R$ {item.impact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>
                          </div>
                          
                          <p className="text-[11px] text-slate-600 leading-relaxed flex items-start gap-2 bg-white/40 p-2 rounded-lg">
                            <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                              item.status === 'Crítico' ? 'text-rose-500' : 'text-amber-500'
                            }`} />
                            {item.desc}
                          </p>
                        </div>
                      )) : (
                        <div className="text-center py-12 text-slate-400">
                          <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm">Nenhum alerta encontrado com os filtros atuais.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Plano de Ação Section */}
              <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl relative overflow-hidden">
                <div className="absolute bottom-0 right-0 p-4 opacity-5">
                  <ShieldCheck className="w-64 h-64 text-white" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-emerald-500 p-2 rounded-lg shadow-lg shadow-emerald-500/20">
                      <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Plano de Ação Farmacêutico e Logístico</h3>
                      <p className="text-slate-400 text-sm">Diretrizes baseadas em Segurança do Paciente e Eficiência Operacional</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { 
                        title: 'Otimização de Portfólio (Segurança e Agilidade)', 
                        icon: <Pill className="w-4 h-4 text-emerald-400" />,
                        actions: analysis?.inclusions.slice(0, 3).map(i => 
                          `Padronizar ${i.name} no dispensário. Reduz o tempo de espera assistencial e o risco de erro no transporte manual (Demanda: ${i.qty}).`
                        ) || []
                      },
                      { 
                        title: 'Ajuste de Grade e Parametrização (Prevenção de Ruptura)', 
                        icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
                        actions: analysis?.ruptures.slice(0, 2).map(r => 
                          `Revisar estoque máximo de ${r.name}. Atendimento atual de apenas ${r.rate.toFixed(0)}% gera sobrecarga na farmácia satélite e risco de atraso na dose.`
                        ) || []
                      },
                      { 
                        title: 'Gestão de Custos e Riscos (Impacto Financeiro)', 
                        icon: <Activity className="w-4 h-4 text-amber-400" />,
                        actions: analysis?.ruptures
                          .filter(r => r.impact > 100)
                          .slice(0, 2)
                          .map(r => `Monitorar giro de ${r.name} (Impacto: R$ ${r.impact.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Otimizar reposição para evitar imobilização de capital.`) || [
                            'Auditoria de devoluções e sobras de medicamentos de alto custo.',
                            'Controle rigoroso de validade (FEFO) nos itens de baixo giro.'
                          ]
                      },
                      { 
                        title: 'KPIs e Metas de Qualidade Farmacêutica', 
                        icon: <TrendingUp className="w-4 h-4 text-indigo-400" />,
                        actions: [
                          'Elevar a Taxa de Atendimento do Dispensário para > 85%.',
                          'Reduzir em 50% as requisições de urgência por falta de parametrização.',
                          'Garantir 100% de rastreabilidade nos itens de Portaria 344 e Antimicrobianos.'
                        ]
                      },
                    ].map((section, idx) => (
                      <div key={idx} className="bg-white/5 p-6 rounded-xl border border-white/10 hover:bg-white/10 transition-all hover:translate-y-[-2px]">
                        <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                          {section.icon}
                          {section.title}
                        </h4>
                        <ul className="space-y-3">
                          {section.actions.map((action, actionIdx) => (
                            <li key={actionIdx} className="flex items-start gap-3 text-sm text-slate-300">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : activeSubTab === 'alerts' ? (
        <DispensaryAlerts />
      ) : (
        <CockpitFarmaceutico />
      )}
    </div>
  );
};
