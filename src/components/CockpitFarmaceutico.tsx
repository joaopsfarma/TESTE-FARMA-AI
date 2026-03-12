import React, { useState, useRef, useMemo } from 'react';
import { AlertTriangle, Info, CheckCircle, Package, Activity, Sparkles, AlertCircle, ArrowRightLeft, UploadCloud, FileText, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export const CockpitFarmaceutico: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse do TXT
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      let headerIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Gaveta') && lines[i].includes('Consumo')) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        alert('Formato de arquivo inválido. Colunas "Gaveta" e "Consumo" não encontradas.');
        event.target.value = '';
        return;
      }

      const parsedData = [];
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length >= 7) {
          const id = cols[1]?.trim();
          const desc = cols[2]?.trim();
          if (!id || !desc) continue;

          const gaveta = cols[4]?.trim();
          const min = parseInt(cols[5], 10) || 0;
          const max = parseInt(cols[6], 10) || 0;
          const consumoStr = cols[7] ? String(cols[7]).replace(',', '.') : '0';
          const consumo = parseFloat(consumoStr) || 0;
          const autonomia = consumo === 0 ? Infinity : max / consumo;

          let rec = 'Stock adequado.';
          if (consumo === 0) rec = 'Sem consumo no período. Ocupação ineficiente.';
          else if (autonomia < 1) rec = `Crítico: Máximo físico (${max}) não suporta 24h.`;
          else if (autonomia < 1.5) rec = `Atenção: Autonomia de apenas ${autonomia.toFixed(1)} dias.`;
          
          parsedData.push({ id, desc, gaveta, min, max, consumo, autonomia, rec });
        }
      }
      
      parsedData.sort((a, b) => {
        if (a.consumo === 0 && b.consumo !== 0) return 1;
        if (b.consumo === 0 && a.consumo !== 0) return -1;
        return a.autonomia - b.autonomia;
      });

      setData(parsedData);
      setFilter('all');
      event.target.value = '';
    };
    reader.readAsText(file);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // Função utilitária de Status
  const getStatusInfo = (autonomia: number, consumo: number) => {
    if (consumo === 0) return { label: 'Sem Consumo', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: <Package className="w-4 h-4 mr-1" />, type: 'zero', hex: '#94a3b8' };
    if (autonomia < 1) return { label: 'Crítico', color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-4 h-4 mr-1" />, type: 'critical', hex: '#ef4444' };
    if (autonomia < 1.5) return { label: 'Alerta', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: <AlertTriangle className="w-4 h-4 mr-1" />, type: 'warning', hex: '#f97316' };
    if (autonomia < 3) return { label: 'Estável', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <Info className="w-4 h-4 mr-1" />, type: 'stable', hex: '#eab308' };
    return { label: 'Saudável', color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle className="w-4 h-4 mr-1" />, type: 'healthy', hex: '#22c55e' };
  };

  // Cálculos avançados via useMemo (performance)
  const stats = useMemo(() => {
    let countCritical = 0, countWarning = 0, countStable = 0, countZero = 0;
    let totalMaxSpace = 0;
    let wastedSpace = 0;
    const zeroItems: any[] = [];
    const criticalItemsForChart: any[] = [];

    data.forEach(item => {
      const type = getStatusInfo(item.autonomia, item.consumo).type;
      totalMaxSpace += item.max;

      if (type === 'critical') {
        countCritical++;
        if (criticalItemsForChart.length < 5) {
          criticalItemsForChart.push({
            name: item.desc.substring(0, 15) + '...',
            Máximo: item.max,
            ConsumoDia: parseFloat(item.consumo.toFixed(1))
          });
        }
      } else if (type === 'warning') countWarning++;
      else if (type === 'zero') {
        countZero++;
        wastedSpace += item.max; // Soma o espaço físico roubado por itens sem uso
        zeroItems.push(item);
      }
      else countStable++;
    });

    // Top itens que mais gastam espaço atoa
    const topWastedItems = zeroItems.sort((a, b) => b.max - a.max).slice(0, 3);
    const wastedPercentage = totalMaxSpace > 0 ? ((wastedSpace / totalMaxSpace) * 100).toFixed(1) : 0;

    const pieData = [
      { name: 'Crítico (< 1 dia)', value: countCritical, color: '#ef4444' },
      { name: 'Alerta (< 1.5 dias)', value: countWarning, color: '#f97316' },
      { name: 'Saudável/Estável', value: countStable, color: '#22c55e' },
      { name: 'Ocupação Ineficiente', value: countZero, color: '#94a3b8' }
    ];

    return { 
      countCritical, countWarning, countZero, 
      totalMaxSpace, wastedSpace, wastedPercentage, 
      pieData, criticalItemsForChart, topWastedItems 
    };
  }, [data]);

  const filteredData = data.filter(item => {
    if (filter === 'all') return true;
    return getStatusInfo(item.autonomia, item.consumo).type === filter;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center tracking-tight">
            <Activity className="w-8 h-8 mr-3 text-blue-600" />
            Cockpit Logístico UTI
          </h1>
          <p className="text-slate-500 mt-1 flex items-center">
            Análise Avançada de Autonomia e Ocupação 
            {fileName && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold flex items-center border border-blue-200"><FileText className="w-3 h-3 mr-1" /> {fileName}</span>}
          </p>
        </div>
        
        <input type="file" accept=".txt,.csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
        <button onClick={triggerFileInput} className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm font-medium transition-colors">
          <UploadCloud className="w-5 h-5 mr-2" />
          Importar Ficheiro TXT
        </button>
      </div>

      {data.length === 0 ? (
        <div className="max-w-7xl mx-auto bg-white border-2 border-dashed border-slate-300 rounded-xl p-16 text-center shadow-sm">
          <UploadCloud className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Nenhum dado processado</h2>
          <p className="text-slate-500 mb-6">Importe o ficheiro "RankingRetiradas.txt" para libertar o poder analítico deste dashboard.</p>
          <button onClick={triggerFileInput} className="inline-flex items-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-2 rounded-lg transition-colors">
            Navegar ficheiros <ArrowRightLeft className="w-4 h-4 ml-2" />
          </button>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Itens Monitorizados</p>
                <Package className="w-5 h-5 text-blue-500" />
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-slate-800">{data.length}</h3>
                <p className="text-xs text-slate-400 mt-1">Total de referências na gaveta</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl shadow-sm border border-red-100 flex flex-col justify-between cursor-pointer hover:bg-red-50/50 transition-colors" onClick={() => setFilter('critical')}>
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Autonomia Crítica</p>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-red-700">{stats.countCritical}</h3>
                <p className="text-xs text-red-400 mt-1">Itens com &lt; 1 dia de cobertura</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Espaço Desperdiçado</p>
                <PieChartIcon className="w-5 h-5 text-slate-500" />
              </div>
              <div className="mt-4 flex items-baseline space-x-2">
                <h3 className="text-3xl font-bold text-slate-800">{stats.wastedPercentage}%</h3>
                <span className="text-sm text-slate-500 font-medium">({stats.wastedSpace} posições)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Capacidade física ocupada por itens sem uso</p>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setFilter('zero')}>
              <div className="flex justify-between items-start">
                <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Ocupação Ineficiente</p>
                <ArrowRightLeft className="w-5 h-5 text-slate-500" />
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-bold text-slate-700">{stats.countZero}</h3>
                <p className="text-xs text-slate-400 mt-1">Itens c/ 0 retiradas (últimos 7 dias)</p>
              </div>
            </div>
          </div>

          {/* Gráficos Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-slate-500" /> Distribuição de Saúde Logística
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.pieData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                      {stats.pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-slate-500" /> Top 5 Itens Críticos: Capacidade vs Consumo
              </h2>
              <div className="h-64">
                {stats.criticalItemsForChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.criticalItemsForChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="Máximo" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Capacidade Física (Máx)" />
                      <Bar dataKey="ConsumoDia" fill="#ef4444" radius={[4, 4, 0, 0]} name="Consumo Diário (Média)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">Sem itens críticos a exibir.</div>
                )}
              </div>
            </div>
          </div>

          {/* AI Actionable Insights - Deep Dive na Ocupação Ineficiente */}
          <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-xl p-1 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
              <Sparkles className="w-32 h-32 text-indigo-300" />
            </div>
            <div className="bg-white/95 rounded-lg p-6 relative z-10 backdrop-blur-sm h-full">
              <h2 className="text-xl font-bold text-indigo-900 flex items-center mb-4">
                <Sparkles className="w-6 h-6 mr-2 text-indigo-600" />
                Inteligência Logística: Detalhamento da Ocupação Ineficiente
              </h2>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-4">
                  <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                    Atualmente, <b>{stats.wastedPercentage}% da capacidade física</b> do seu dispensário está alocada para itens que não tiveram <b>nenhuma retirada</b> na última semana. Isto representa <b>{stats.wastedSpace} posições físicas</b> ocupadas indevidamente.
                  </p>
                  
                  <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100">
                    <h3 className="font-semibold text-indigo-800 text-sm mb-3">🎯 Top 3 Ofensores de Espaço (Alvos de Remoção):</h3>
                    <ul className="space-y-2">
                      {stats.topWastedItems.map((item, i) => (
                        <li key={i} className="flex justify-between items-center bg-white px-3 py-2 rounded shadow-sm text-sm border border-slate-100">
                          <span className="font-medium text-slate-700 truncate mr-2" title={item.desc}>{item.id} - {item.desc.split('-')[0]}</span>
                          <span className="flex-shrink-0 bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono text-xs border border-slate-200">
                            {item.max} espaços roubados
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="bg-indigo-600 rounded-lg p-5 text-white flex flex-col justify-center shadow-inner">
                  <h3 className="font-bold mb-2 flex items-center"><ArrowRightLeft className="w-5 h-5 mr-2" /> Ação Imediata (Swap)</h3>
                  <p className="text-indigo-100 text-sm leading-relaxed mb-4">
                    Remova os top ofensores e utilize as suas gavetas (ex: Gavetas {stats.topWastedItems.map(i => i.gaveta).join(', ')}) para <b>duplicar o Limite Máximo</b> das seringas e eletrodos (que estão em Autonomia Crítica).
                  </p>
                  <button onClick={() => setFilter('zero')} className="mt-auto bg-white text-indigo-700 font-semibold py-2 rounded hover:bg-indigo-50 transition-colors w-full text-sm shadow-sm">
                    Ver todos os {stats.countZero} itens
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center bg-slate-50/80 gap-3">
              <h2 className="text-lg font-bold text-slate-800">Matriz de Decisão Logística</h2>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${filter === 'all' ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Todos</button>
                <button onClick={() => setFilter('critical')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${filter === 'critical' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}>Críticos ({stats.countCritical})</button>
                <button onClick={() => setFilter('warning')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${filter === 'warning' ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}>Alerta ({stats.countWarning})</button>
                <button onClick={() => setFilter('zero')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors border ${filter === 'zero' ? 'bg-slate-500 text-white border-slate-500 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Ocup. Ineficiente ({stats.countZero})</button>
              </div>
            </div>
            
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
                  <tr className="text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-semibold">Cód</th>
                    <th className="p-4 font-semibold">Descrição do Item</th>
                    <th className="p-4 font-semibold">Gaveta</th>
                    <th className="p-4 font-semibold text-center">Mín / Máx</th>
                    <th className="p-4 font-semibold text-center" title="Média de retiradas por dia">Consumo/Dia</th>
                    <th className="p-4 font-semibold text-center" title="Dias que o stock máximo aguenta">Autonomia</th>
                    <th className="p-4 font-semibold">Status e Insight ✨</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item, idx) => {
                    const status = getStatusInfo(item.autonomia, item.consumo);
                    return (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="p-4 text-sm font-medium text-slate-500">{item.id}</td>
                        <td className="p-4 text-sm text-slate-800 font-medium max-w-[250px] truncate" title={item.desc}>
                          {item.desc}
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                          <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200 font-mono text-xs">{item.gaveta}</span>
                        </td>
                        <td className="p-4 text-sm text-center">
                          <span className="text-slate-400">{item.min}</span>
                          <span className="mx-1 text-slate-300">/</span>
                          <span className="font-semibold text-slate-700">{item.max}</span>
                        </td>
                        <td className="p-4 text-sm text-center text-slate-600">
                          {item.consumo === 0 ? <span className="text-slate-300">-</span> : item.consumo.toFixed(1)}
                        </td>
                        <td className="p-4 text-sm text-center">
                          {item.consumo === 0 ? (
                            <span className="text-slate-300 font-bold" title="Sem consumo (Infinito)">∞</span>
                          ) : (
                            <span className={`font-bold px-2 py-1 rounded text-xs ${item.autonomia < 1 ? 'bg-red-100 text-red-700' : item.autonomia < 1.5 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>
                              {item.autonomia.toFixed(2)} d
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col space-y-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${status.color} w-max`}>
                              {status.icon}
                              {status.label}
                            </span>
                            <span className="text-xs text-slate-500 leading-tight group-hover:text-slate-700 transition-colors">
                              {item.rec}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-500">
                        Nenhum item encontrado com o filtro selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
