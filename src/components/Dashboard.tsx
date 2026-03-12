import React, { useState, useEffect } from 'react';
import { ProcessedProduct } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  TrendingDown, 
  Clock, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ShieldAlert,
  Layers,
  Sparkles,
  BrainCircuit,
  Info,
  ChevronRight,
  Zap,
  RefreshCw,
  Calendar,
  Gauge,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  FileSpreadsheet,
  CheckSquare
} from 'lucide-react';
import Papa from 'papaparse';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  data: ProcessedProduct[];
}

const COLORS = {
  primary: '#4f46e5', // Indigo 600
  success: '#10b981', // Emerald 500
  warning: '#f59e0b', // Amber 500
  danger: '#ef4444',  // Red 500
  info: '#3b82f6',    // Blue 500
  slate: '#64748b',   // Slate 500
  purple: '#8b5cf6',  // Purple 500
  rose: '#f43f5e',    // Rose 500
};

const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.info, COLORS.purple];

export const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  const [aiInsight, setAiInsight] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [paretoCount, setParetoCount] = useState<number>(10);

  // Novos Estados para CSVs importados localmente
  const [consumoRaw, setConsumoRaw] = useState<any[]>([]);
  const [lotesRaw, setLotesRaw] = useState<any[]>([]);
  const [consumoStatus, setConsumoStatus] = useState<string>('Nenhum');
  const [lotesStatus, setLotesStatus] = useState<string>('Nenhum');

  const parseCSVLocal = (file: File | undefined, setter: React.Dispatch<any>, statusSetter: React.Dispatch<string>) => {
    if (!file) return;
    statusSetter('Carregando...');
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (res) => {
        setter(res.data);
        statusSetter(`Carregado (${res.data.length})`);
      },
      error: () => statusSetter('Erro')
    });
  };

  // KPIs Novos baseados em CSV Local
  const dynamicKpis = React.useMemo(() => {
    let linhasConsumo = 0;
    let pendenciasLote = 0;

    if (consumoRaw.length > 0) {
      linhasConsumo = consumoRaw.length - 1; // Desconta cabeçalho
    }

    if (lotesRaw.length > 0) {
      pendenciasLote = lotesRaw.length - 1; 
    }

    return { linhasConsumo, pendenciasLote };
  }, [consumoRaw, lotesRaw]);

  // 1. Processamento Dinâmico de CSVs
  const processedData = React.useMemo(() => {
    if (consumoRaw.length === 0) return data;
    
    // Mesclar a cópia da data com o consumoReal
    const map = new Map<string, any>();
    data.forEach(d => map.set(d.id, { ...d }));
    
    // Encontrar colunas de Produto, Consumo e Saldo de forma dinâmica (fuzzy match)
    const columns = consumoRaw.length > 0 ? Object.keys(consumoRaw[0]) : [];
    const idKey = columns.find(c => c.toLowerCase().includes('cód') || c.toLowerCase().includes('id'));
    const nameKey = columns.find(c => c.toLowerCase().includes('produto') || c.toLowerCase().includes('descrição') || c.toLowerCase().includes('descricao'));
    const consKey = columns.find(c => c.toLowerCase().includes('consumo'));
    const stockKey = columns.find(c => c.toLowerCase().includes('estoque') || c.toLowerCase().includes('saldo'));

    if (idKey && (consKey || stockKey)) {
      consumoRaw.forEach(row => {
        const id = String(row[idKey]).trim();
        if (!id || id === 'undefined') return;
        
        const consValue = consKey ? parseFloat(String(row[consKey]).replace(',', '.')) : 0;
        const stockValue = stockKey ? parseFloat(String(row[stockKey]).replace(',', '.')) : 0;
        
        if (map.has(id)) {
          const item = map.get(id);
          if (consKey) item.dailyConsumption = isNaN(consValue) ? 0 : consValue;
          if (stockKey) item.physicalStock = isNaN(stockValue) ? 0 : stockValue;
          item.coverageDays = item.dailyConsumption > 0 ? item.physicalStock / item.dailyConsumption : 999;
          
          if (item.coverageDays === 0) item.status = 'URGENTE!';
          else if (item.coverageDays < 3) item.status = 'VERIFICAR INVENTÁRIO';
          else item.status = 'OK';
        } else {
          // Se não existir na base mockada, criar novo
          const cons = isNaN(consValue) ? 0 : consValue;
          const stock = isNaN(stockValue) ? 0 : stockValue;
          map.set(id, {
            id, 
            name: row[nameKey || ''] || 'Produto Desconhecido', 
            dailyConsumption: cons,
            physicalStock: stock,
            coverageDays: cons > 0 ? stock / cons : 999,
            status: cons > 0 && stock <= 0 ? 'URGENTE!' : 'OK',
            category: 'Geral',
            expiryDate: new Date().toISOString()
          });
        }
      });
    }

    return Array.from(map.values());
  }, [data, consumoRaw]);

  // Processar CSV de Lotes
  const parsedLotes = React.useMemo(() => {
    if (lotesRaw.length === 0) return { lotesValidos: null, agrupadoLotes: null };
    const lotesValidos: any[] = [];
    const agrupadoLotes = new Map<string, { nome: string; saldoTotal: number }>();
    
    const columns = Object.keys(lotesRaw[0] || {});
    const idKey = columns.find(c => c.toLowerCase().includes('cód') || c.toLowerCase().includes('id'));
    const nameKey = columns.find(c => c.toLowerCase().includes('produto') || c.toLowerCase().includes('descrição') || c.toLowerCase().includes('descricao'));
    const valKey = columns.find(c => c.toLowerCase().includes('vald') || c.toLowerCase().includes('validade'));
    const qtyKey = columns.find(c => c.toLowerCase().includes('qt') || c.toLowerCase().includes('saldo') || c.toLowerCase().includes('quantidade'));

    lotesRaw.forEach(row => {
      // 1. Processamento Validades
      if (valKey) {
        const dateStr = String(row[valKey]).trim();
        if (dateStr && dateStr !== 'undefined') {
          let dateObj = new Date(dateStr);
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length >= 3) {
               dateObj = new Date(`${parts[2].substring(0,4)}-${parts[1]}-${parts[0]}`);
            }
          }
          if (!isNaN(dateObj.getTime())) {
            lotesValidos.push({
              dateObj,
              qty: qtyKey ? parseFloat(String(row[qtyKey]).replace(',', '.')) || 1 : 1
            });
          }
        }
      }

      // 2. Agrupamento de Saldo Real por Produto
      if (idKey && qtyKey) {
         const id = String(row[idKey]).trim();
         const qty = parseFloat(String(row[qtyKey]).replace(',', '.'));
         const name = nameKey ? String(row[nameKey]) : 'Desconhecido';
         
         if (id && id !== 'undefined' && !isNaN(qty)) {
            if (agrupadoLotes.has(id)) {
               agrupadoLotes.get(id)!.saldoTotal += qty;
            } else {
               agrupadoLotes.set(id, { nome: name, saldoTotal: qty });
            }
         }
      }
    });

    return { lotesValidos, agrupadoLotes };
  }, [lotesRaw]);


  // 2. Stats Calculation (baseado em processedData)
  const stats = React.useMemo(() => {
    const total = processedData.length;
    const critical = processedData.filter(p => p.status === 'URGENTE!').length;
    const warning = processedData.filter(p => p.status === 'VERIFICAR INVENTÁRIO').length;
    const ok = processedData.filter(p => p.status === 'OK').length;
    const avgCoverage = processedData.reduce((acc, curr) => acc + (curr.coverageDays > 900 ? 900 : curr.coverageDays), 0) / (total || 1);
    
    const totalExits = processedData.reduce((acc, curr) => acc + (curr.dailyConsumption * 30), 0);
    const avgStock = processedData.reduce((acc, curr) => acc + curr.physicalStock, 0) / (total || 1);
    const turnover = totalExits / (avgStock * 30 || 1); 
    
    return { total, critical, warning, ok, avgCoverage, turnover };
  }, [processedData]);

  // 3. Heatmap de Validade (Next 30 days) - Baseado no arquivo de Lotes se existir
  const expiryHeatmap = React.useMemo(() => {
    const days: Record<string, number> = {};
    const today = new Date();
    const next30 = new Date(today);
    next30.setDate(today.getDate() + 30);

    if (parsedLotes.lotesValidos) {
      parsedLotes.lotesValidos.forEach(lote => {
        if (lote.dateObj >= today && lote.dateObj <= next30) {
          const dateStr = lote.dateObj.toISOString().split('T')[0];
          days[dateStr] = (days[dateStr] || 0) + lote.qty;
        }
      });
    } else {
      processedData.forEach(item => {
        const expiry = new Date(item.expiryDate);
        if (expiry >= today && expiry <= next30) {
          const dateStr = expiry.toISOString().split('T')[0];
          days[dateStr] = (days[dateStr] || 0) + 1;
        }
      });
    }

    return Object.keys(days).map(date => ({
      date,
      count: days[date],
      day: new Date(date).getDate(),
      month: new Date(date).getMonth() + 1
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [processedData, parsedLotes]);

  // 4. Pareto de Ruptura (Items causing most shortages)
  const paretoData = React.useMemo(() => {
    const sorted = [...processedData]
      .filter(p => p.coverageDays < 7)
      .sort((a, b) => b.dailyConsumption - a.dailyConsumption)
      .slice(0, paretoCount);
    
    let cumulative = 0;
    const totalConsumption = processedData.reduce((acc, curr) => acc + curr.dailyConsumption, 0);

    return sorted.map(item => {
      cumulative += item.dailyConsumption;
      return {
        name: item.name.substring(0, 15),
        consumption: parseFloat(item.dailyConsumption.toFixed(1)),
        percentage: totalConsumption > 0 ? parseFloat(((cumulative / totalConsumption) * 100).toFixed(1)) : 0
      };
    });
  }, [processedData, paretoCount]);

  // 5. Estoque de Segurança
  const securityStockAlerts = React.useMemo(() => {
    return processedData
      .filter(p => p.physicalStock < (p.dailyConsumption * 3)) 
      .sort((a, b) => a.coverageDays - b.coverageDays)
      .slice(0, 6);
  }, [processedData]);

  // 6. Oportunidades de Transferência (Excesso de Estoque relativo ao Consumo/Conferência)
  const transferOpportunities = React.useMemo(() => {
    // Definimos a lista base: Se tivermos agrupamento de lotes (Arquivo Roxo), ele tem precedência no Saldo Fisico.
    let baseList = [...processedData];
    let sourcesMerged = false;

    if (parsedLotes.agrupadoLotes && parsedLotes.agrupadoLotes.size > 0) {
      sourcesMerged = true;
      const mergedList: any[] = [];
      const lotesMap = parsedLotes.agrupadoLotes;
      
      // Para cada item da Conferência, checa se sabe o consumo (ou assume 0 para forçar o excesso)
      lotesMap.forEach((dataLote, keyId) => {
         const matchConsumo = processedData.find(p => p.id === keyId);
         const cdm = matchConsumo ? matchConsumo.dailyConsumption : 0.1; // fallback para evitar divisão por 0
         
         mergedList.push({
            id: keyId,
            name: dataLote.nome,
            physicalStock: dataLote.saldoTotal,
            dailyConsumption: cdm,
            coverageDays: dataLote.saldoTotal / cdm
         });
      });
      baseList = mergedList;
    }

    return baseList
      .filter(p => p.coverageDays > (sourcesMerged ? 15 : 45) && p.physicalStock > 10) // Ajuste fino
      .sort((a, b) => b.physicalStock - a.physicalStock)
      .slice(0, 5);
  }, [processedData, parsedLotes]);

  // 7. Radar Profile (Existing)
  const riskProfile = React.useMemo(() => {
    const categories = ['Medicamento', 'Material', 'Portaria 344'];
    return categories.map(cat => {
      const catItems = processedData.filter(p => p.category === cat);
      const avgCov = catItems.reduce((acc, curr) => acc + (curr.coverageDays > 100 ? 100 : curr.coverageDays), 0) / (catItems.length || 1);
      const riskItems = catItems.filter(p => p.coverageDays < 7).length;
      const riskScore = (riskItems / (catItems.length || 1)) * 100;
      
      return {
        subject: cat,
        A: parseFloat(avgCov.toFixed(1)),
        B: parseFloat(riskScore.toFixed(1)),
        fullMark: 100,
      };
    });
  }, [processedData]);

  // AI Analysis Effect
  useEffect(() => {
    const analyzeData = async () => {
      if (processedData.length === 0) return;
      setIsAnalyzing(true);
      try {
        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        const criticalList = processedData.filter(p => p.status === 'URGENTE!').map(p => p.name).join(', ');
        
        const prompt = `Você é um especialista sênior em gestão de farmácia hospitalar e logística. 
        Analise os dados abaixo e forneça 3 insights estratégicos e acionáveis (formato bullet points).
        
        Dados Gerais:
        - Total de Itens: ${stats.total}
        - Itens em Ruptura (Críticos): ${stats.critical}
        - Giro de Estoque Médio (Diário): ${stats.turnover.toFixed(2)}
        
        Lista de Itens Críticos (Amostra): ${criticalList.substring(0, 300)}...

        Foque em:
        1. **Risco de Desabastecimento**: Ações imediatas para os itens críticos.
        2. **Eficiência de Estoque**: Como melhorar o giro (se estiver baixo < 0.5 ou muito alto > 1.5).
        3. **Otimização**: Sugestão para evitar perdas ou excessos.

        Use tom profissional, direto e executivo. Evite obviedades.`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        
        setAiInsight(response.text || 'Não foi possível gerar insights no momento.');
      } catch (error) {
        console.error('AI Analysis error:', error);
        setAiInsight('Erro ao conectar com a inteligência artificial.');
      } finally {
        setIsAnalyzing(false);
      }
    };

    const timer = setTimeout(analyzeData, 1000);
    return () => clearTimeout(timer);
  }, [processedData, stats.total, stats.critical, stats.turnover]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-12 relative"
    >
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-[0.03]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500 blur-[120px]" />
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Insights do Farma</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Insights do Farma</h2>
          <p className="text-slate-500 mt-1">Dicas estratégicas e indicadores avançados para manejo de estoque.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Análise em Tempo Real
          </div>
        </div>
      </div>

      {/* Seção de Importação Avançada Local */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <FileSpreadsheet className="w-16 h-16 text-blue-600" />
          </div>
          <div className="flex items-center gap-3 relative z-10 w-full">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Upload Base: Consumo Real</h4>
              <p className="text-xs text-slate-500">Otimiza os KPIs de Giro e Pareto</p>
            </div>
          </div>
          <label className="relative z-10 w-full sm:w-auto mt-2 sm:mt-0 cursor-pointer">
            <input 
              type="file" accept=".csv" className="hidden" 
              onChange={(e) => parseCSVLocal(e.target.files?.[0], setConsumoRaw, setConsumoStatus)} 
            />
            <div className={`px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap text-center transition-all ${consumoRaw.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-blue-300 hover:text-blue-600'}`}>
              {consumoRaw.length > 0 ? `✓ ${consumoStatus}` : 'Selecionar CSV'}
            </div>
          </label>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <CheckSquare className="w-16 h-16 text-indigo-600" />
          </div>
          <div className="flex items-center gap-3 relative z-10 w-full">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Upload Base: Conferência Lotes</h4>
              <p className="text-xs text-slate-500">Alimenta painel de Divergências</p>
            </div>
          </div>
          <label className="relative z-10 w-full sm:w-auto mt-2 sm:mt-0 cursor-pointer">
            <input 
              type="file" accept=".csv" className="hidden" 
              onChange={(e) => parseCSVLocal(e.target.files?.[0], setLotesRaw, setLotesStatus)} 
            />
            <div className={`px-4 py-2.5 rounded-xl text-xs font-bold border whitespace-nowrap text-center transition-all ${lotesRaw.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-white hover:border-indigo-300 hover:text-indigo-600'}`}>
              {lotesRaw.length > 0 ? `✓ ${lotesStatus}` : 'Selecionar CSV'}
            </div>
          </label>
        </div>
      </div>

      {/* AI Insights Banner */}
      <motion.div 
        variants={itemVariants}
        className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <BrainCircuit className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md">
            <Sparkles className="w-8 h-8 text-yellow-300" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
              Dicas de Manejo (IA Gemini)
              {isAnalyzing && <RefreshCw className="w-4 h-4 animate-spin opacity-60" />}
            </h3>
            <div className="text-indigo-50 text-sm leading-relaxed max-w-3xl">
              {isAnalyzing ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-48 bg-white/20 rounded animate-pulse" />
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  {aiInsight.split('\n').map((line, i) => (
                    <p key={i} className="m-0">{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {consumoRaw.length > 0 ? (
          <SummaryCard 
            title="Série Consumo Real" 
            value={dynamicKpis.linhasConsumo.toLocaleString('pt-BR')} 
            icon={<FileSpreadsheet className="w-5 h-5" />}
            trend="Upload Recente"
            trendUp={true}
            color="indigo"
            description="Registros de consumo mapeados"
          />
        ) : (
          <SummaryCard 
            title="Giro de Estoque Estim." 
            value={stats.turnover.toFixed(2)} 
            icon={<Gauge className="w-5 h-5" />}
            trend="Indicador de Giro"
            trendUp={stats.turnover > 0.5}
            color="indigo"
            description="Relação Saída Média / Estoque Físico"
          />
        )}

        <SummaryCard 
          title="Rupturas Atuais" 
          value={stats.critical} 
          icon={<AlertTriangle className="w-5 h-5" />}
          trend="Estoque Zerado"
          trendUp={false}
          color="red"
          description="Atenção Imediata Necessária"
        />

        {lotesRaw.length > 0 ? (
          <SummaryCard 
            title="Pendências Conf. Lote" 
            value={dynamicKpis.pendenciasLote.toLocaleString('pt-BR')} 
            icon={<CheckSquare className="w-5 h-5" />}
            trend="Ação Necessária"
            trendUp={false}
            color="amber"
            description="Lotes a inventariar apontados no CSV"
          />
        ) : (
          <SummaryCard 
            title="Validades Próximas" 
            value={expiryHeatmap.length} 
            icon={<Calendar className="w-5 h-5" />}
            trend="Próximos 30 dias"
            trendUp={false}
            color="amber"
            description="Alertas do Heatmap FEFO"
          />
        )}
        <SummaryCard 
          title="Segurança" 
          value={securityStockAlerts.length} 
          icon={<ShieldCheck className="w-5 h-5" />}
          trend="Abaixo do Nível"
          trendUp={securityStockAlerts.length === 0}
          color="emerald"
          description="Itens abaixo do estoque crítico"
        />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Heatmap de Validade - Calendar Style */}
        <motion.div variants={itemVariants} className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              Heatmap de Validade
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Próximos 30 Dias</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-slate-300 mb-1">{d}</div>
            ))}
            {Array.from({ length: 31 }).map((_, i) => {
              const day = i + 1;
              const hasExpiry = expiryHeatmap.find(h => h.day === day);
              const intensity = hasExpiry ? Math.min(hasExpiry.count * 20, 100) : 0;
              
              return (
                <div 
                  key={i} 
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all relative group ${
                    hasExpiry ? 'text-white' : 'text-slate-300 bg-slate-50'
                  }`}
                  style={{ 
                    backgroundColor: hasExpiry ? `rgba(245, 158, 11, ${intensity / 100})` : undefined,
                    boxShadow: hasExpiry ? '0 4px 6px -1px rgb(245 158 11 / 0.3)' : undefined
                  }}
                >
                  {day}
                  {hasExpiry && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-20 whitespace-nowrap">
                      {hasExpiry.count} lotes vencendo
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              <strong>Atenção:</strong> Dias com cores mais intensas indicam maior volume de vencimento. Priorize o remanejamento FEFO nestas datas.
            </p>
          </div>
        </motion.div>

        {/* Pareto de Ruptura - Bar + Line Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-slate-600" />
                Pareto de Ruptura
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Curva ABC: 80% do impacto vem de 20% dos itens.
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setParetoCount(10)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${paretoCount === 10 ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                Top 10
              </button>
              <button 
                onClick={() => setParetoCount(20)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${paretoCount === 20 ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                Top 20
              </button>
            </div>
          </div>

          {/* Top 3 Critical Items Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {paretoData.slice(0, 3).map((item, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-3 border border-slate-100 relative overflow-hidden group hover:border-slate-300 transition-colors">
                <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="text-4xl font-black text-slate-900">#{index + 1}</span>
                </div>
                <div className="relative z-10">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Top {index + 1} Impacto</p>
                  <p className="text-sm font-bold text-slate-800 truncate" title={item.name}>{item.name}</p>
                  <div className="flex items-end gap-1 mt-2">
                    <span className="text-lg font-black text-slate-900">{item.consumption}</span>
                    <span className="text-[10px] text-slate-500 mb-1">un/dia</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div className="bg-slate-800 h-full" style={{ width: `${(item.consumption / (paretoData[0].consumption || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end" 
                  height={60} 
                />
                <YAxis 
                  yAxisId="left" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  label={{ value: 'Consumo Diário', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  unit="%" 
                  domain={[0, 100]} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Inter, sans-serif' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 500 }} />
                
                {/* Bars - Professional Navy Blue */}
                <Bar 
                  yAxisId="left" 
                  dataKey="consumption" 
                  name="Consumo Diário" 
                  fill="#334155" // Slate 700
                  radius={[4, 4, 0, 0]} 
                  barSize={32}
                  animationDuration={1500}
                >
                  {/* Label List for exact values on top of bars */}
                  {/* <LabelList dataKey="consumption" position="top" style={{ fontSize: '10px', fill: '#64748b', fontWeight: 'bold' }} /> */}
                </Bar>
                
                {/* Line - High Contrast Red/Orange */}
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="percentage" 
                  name="% Acumulado" 
                  stroke="#ef4444" // Red 500
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={2000}
                />
                
                {/* Reference Line for 80% - The Pareto Principle */}
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey={() => 80} 
                  stroke="#94a3b8" 
                  strokeDasharray="4 4" 
                  strokeWidth={1} 
                  dot={false} 
                  activeDot={false} 
                  name="Corte 80%" 
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-2">
             <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
             <p className="text-xs text-slate-500">
               <strong>Insight:</strong> Os 3 primeiros itens representam {(paretoData[2]?.percentage || 0).toFixed(0)}% do volume total de consumo. 
               Priorize a negociação destes itens para evitar rupturas de alto impacto.
             </p>
          </div>
        </motion.div>

        {/* Estoque de Segurança - List Alerts */}
        <motion.div variants={itemVariants} className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Estoque de Segurança
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Itens abaixo da margem segura (3 dias).
              </p>
            </div>
            <div className="flex gap-2">
               <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">Ruptura (0 dias)</span>
               <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">Alerta (&lt; 3 dias)</span>
            </div>
          </div>
          
          <div className="space-y-3 overflow-y-auto pr-2 max-h-[340px] custom-scrollbar">
            {securityStockAlerts.map((item) => {
              // Simple ABC Logic for UI demo: 
              // A: Consumption > 100, B: > 20, C: < 20 (This is arbitrary, real logic would be cumulative %)
              // Let's use a relative metric based on the max consumption in the dataset to be more dynamic
              const maxCons = Math.max(...data.map(d => d.dailyConsumption));
              const abcClass = item.dailyConsumption > (maxCons * 0.2) ? 'A' : item.dailyConsumption > (maxCons * 0.05) ? 'B' : 'C';
              
              const isRupture = item.coverageDays <= 0;
              
              return (
                <div 
                  key={item.id} 
                  className={`relative p-4 rounded-2xl border transition-all group hover:shadow-md ${
                    isRupture 
                      ? 'bg-rose-50/50 border-rose-100 hover:border-rose-300' 
                      : 'bg-amber-50/50 border-amber-100 hover:border-amber-300'
                  }`}
                >
                  {/* ABC Tag */}
                  <div className="absolute top-4 right-4">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded text-slate-500 bg-white border border-slate-200 opacity-70`}>
                      CURVA {abcClass}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-bold text-slate-800 pr-16 truncate" title={item.name}>{item.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Consumo Médio</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-slate-700">{item.dailyConsumption.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">un/dia</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Cobertura Atual</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-lg font-black ${isRupture ? 'text-rose-600' : 'text-amber-600'}`}>
                          {item.coverageDays.toFixed(1)}
                        </span>
                        <span className={`text-[10px] ${isRupture ? 'text-rose-400' : 'text-amber-400'}`}>dias</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar Visual for Coverage (0-3 days) */}
                  <div className="mt-3 h-1.5 w-full bg-white rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className={`h-full rounded-full ${isRupture ? 'bg-rose-500' : 'bg-amber-500'}`} 
                      style={{ width: `${Math.min((item.coverageDays / 3) * 100, 100)}%` }} 
                    />
                  </div>
                </div>
              );
            })}
            
            {securityStockAlerts.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShieldCheck className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-medium">Estoque Seguro</p>
                <p className="text-slate-400 text-xs mt-1">Nenhum item abaixo de 3 dias de cobertura.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Indicador de Giro - KPI Card Moderno */}
        <motion.div variants={itemVariants} className="lg:col-span-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-indigo-500" />
                Indicador de Giro
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Velocidade de renovação do estoque.</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
               <Activity className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center relative">
            {/* Big Number */}
            <div className="text-center relative z-10">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-7xl font-black text-slate-900 tracking-tighter">
                  {stats.turnover.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-slate-300">x</span>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Giro Diário Médio</p>
            </div>

            {/* Status Badge */}
            <div className={`mt-8 px-6 py-2 rounded-full border-2 text-sm font-bold flex items-center gap-2 ${
               stats.turnover < 0.5 ? 'bg-amber-50 border-amber-100 text-amber-700' :
               stats.turnover > 1.5 ? 'bg-purple-50 border-purple-100 text-purple-700' :
               'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                 stats.turnover < 0.5 ? 'bg-amber-500' :
                 stats.turnover > 1.5 ? 'bg-purple-500' :
                 'bg-emerald-500'
              }`} />
              {stats.turnover < 0.5 ? 'Lento / Excesso' : stats.turnover > 1.5 ? 'Rápido / Risco' : 'Giro Ideal'}
            </div>

            {/* Simulated Trend */}
            <div className="mt-6 flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">
               <span className="flex items-center text-emerald-500">
                 <ArrowUpRight className="w-3 h-3 mr-1" />
                 +12%
               </span>
               <span>vs. mês anterior</span>
            </div>

            {/* Background Decoration */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
               <div className={`w-64 h-64 rounded-full blur-3xl ${
                 stats.turnover < 0.5 ? 'bg-amber-500' :
                 stats.turnover > 1.5 ? 'bg-purple-500' :
                 'bg-emerald-500'
               }`} />
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 text-center">
             <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] text-slate-400 mb-1">Meta Mínima</p>
                <p className="text-sm font-bold text-slate-600">0.5</p>
             </div>
             <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] text-slate-400 mb-1">Meta Máxima</p>
                <p className="text-sm font-bold text-slate-600">1.5</p>
             </div>
             <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] text-slate-400 mb-1">Tendência</p>
                <p className="text-sm font-bold text-emerald-600">Estável</p>
             </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend: string;
  trendUp: boolean;
  color: 'indigo' | 'red' | 'amber' | 'emerald';
  description: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, trend, trendUp, color, description }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };

  const trendIcon = trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />;
  const trendColor = trendUp ? 'text-emerald-600' : 'text-red-600';

  return (
    <motion.div 
      whileHover={{ y: -6, shadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all relative group"
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3 rounded-2xl border ${colorClasses[color]} shadow-inner`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 ${trendColor}`}>
          {trendIcon}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-900 leading-none">{value}</p>
        <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {description}
        </p>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 rounded-b-3xl overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`h-full ${color === 'indigo' ? 'bg-indigo-500' : color === 'red' ? 'bg-red-500' : color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`}
        />
      </div>
    </motion.div>
  );
};


