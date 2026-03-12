import React, { useState, useMemo, useRef } from 'react';
import { 
  Upload, FileText, Filter, BellRing, Pill, Box, AlertOctagon, Zap, Ban, 
  BarChart3, Clock, Layers, Info, Activity, Trash2, FileUp, Search, FileDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area
} from 'recharts';

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

export const DispensaryAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filterDispensary, setFilterDispensary] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const timeToMinutes = (timeStr: string) => {
    if (!timeStr || timeStr.trim() === '') return null;
    const parts = timeStr.split(':');
    if (parts.length >= 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    return null;
  };

  const minutesToTime = (mins: number) => {
    if (mins === null || isNaN(mins)) return '-';
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const getTurno = (horaStr: string) => {
    if (!horaStr) return 'Desconhecido';
    const parts = horaStr.split(' ');
    if (parts.length < 2) return 'Desconhecido';
    const h = parseInt(parts[1].split(':')[0]);
    
    if (h >= 6 && h < 13) return 'Manhã (06-13h)';
    if (h >= 13 && h < 19) return 'Tarde (13-19h)';
    if (h >= 19 && h <= 23) return 'Noite (19-24h)';
    return 'Madrugada (00-06h)';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        let dataStarted = false;
        const records: AlertItem[] = [];
        
        let idxDesc = -1, idxTipo = -1, idxDisp = -1, idxTempo = -1, idxOperacao = -1;
        let idxSaldoGaveta = -1, idxSaldoAlerta = -1, idxStatus = -1, idxGaveta = -1, idxData = -1, idxId = -1;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith('ID\tGaveta') || line.includes('Descrição Produto')) {
            const headers = line.split('\t');
            idxId = headers.findIndex(h => h === 'ID');
            idxDesc = headers.findIndex(h => h.includes('Descrição Produto') || h === 'Produto');
            if (headers[3] === 'Descrição Produto') idxDesc = 3; 
            
            idxTipo = headers.findIndex(h => h === 'Tipo');
            idxDisp = headers.findIndex(h => h === 'Dispensário');
            idxTempo = headers.findIndex(h => h === 'Tempo');
            idxOperacao = headers.findIndex(h => h === 'Operação');
            idxSaldoGaveta = headers.findIndex(h => h === 'Saldo Gaveta');
            idxSaldoAlerta = headers.findIndex(h => h === 'Saldo Alerta');
            idxStatus = headers.findIndex(h => h === 'Status');
            idxGaveta = headers.findIndex(h => h === 'Gaveta');
            idxData = headers.findIndex(h => h === 'Data Alerta');
            
            if (idxId === -1) idxId = 0;
            if (idxDesc === -1) idxDesc = 3; 
            if (idxTipo === -1) idxTipo = 4; 
            if (idxSaldoAlerta === -1) idxSaldoAlerta = 5;
            if (idxSaldoGaveta === -1) idxSaldoGaveta = 6;
            if (idxData === -1) idxData = 7;
            if (idxTempo === -1) idxTempo = 8;
            if (idxDisp === -1) idxDisp = 9; 
            if (idxStatus === -1) idxStatus = 10;
            if (idxGaveta === -1) idxGaveta = 1;
            if (idxOperacao === -1) idxOperacao = 13;
            
            dataStarted = true;
            continue;
          }

          if (dataStarted) {
            const cols = line.split('\t');
            if (cols.length > 5) {
              records.push({
                id: cols[idxId] ? cols[idxId].trim() : '',
                gaveta: cols[idxGaveta] ? cols[idxGaveta].trim() : 'N/A',
                produto: cols[2] ? cols[2].trim() : '', // Assuming column 2 is Produto code based on previous context
                descricao: cols[idxDesc] ? cols[idxDesc].replace(/"/g, '').trim() : 'Desconhecido',
                tipo: cols[idxTipo] ? cols[idxTipo].trim() : '-',
                saldoAlerta: cols[idxSaldoAlerta] ? parseFloat(cols[idxSaldoAlerta].replace(',', '.')) || 0 : 0,
                saldoGaveta: cols[idxSaldoGaveta] ? parseFloat(cols[idxSaldoGaveta].replace(',', '.')) || 0 : 0,
                dataAlerta: cols[idxData] ? cols[idxData].trim() : '',
                tempo: cols[idxTempo] ? cols[idxTempo].trim() : '',
                dispensario: cols[idxDisp] ? cols[idxDisp].trim() : 'Desconhecido',
                status: cols[idxStatus] ? cols[idxStatus].trim() : '',
                alerta: '',
                wlid: '',
                operacao: cols[idxOperacao] ? cols[idxOperacao].trim() : '',
                dataHora: '',
                quantidade: 0,
                transferencia: '',
                observacoes: ''
              });
            }
          }
        }
        setAlerts(records);
      };
      reader.readAsText(file, 'ISO-8859-1');
    }
  };

  const handleExportPDF = () => {
    if (!stats) return;
    const doc = new jsPDF();
    doc.text(`Relatório de Alertas - Filtro: ${filterDispensary}`, 14, 15);
    
    const tableColumn = ["Produto", "Tipo", "Qtd. Alertas", "Tempo Médio", "Saldo Alerta", "Saldo Gaveta"];
    const tableRows: any[] = [];

    stats.productStats.forEach(item => {
      const avgTempoValue = item.tempoCount > 0 ? item.tempoSum / item.tempoCount : 0;
      const avgTempoStr = item.tempoCount > 0 ? minutesToTime(avgTempoValue) : '-';
      
      tableRows.push([
        item.name,
        item.tipo === 'MED' ? 'MEDICAMENTO' : item.tipo === 'MAT' ? 'MATERIAL' : item.tipo,
        item.count,
        avgTempoStr,
        (item.saldoAlertaSum / item.count).toFixed(1),
        (item.saldoGavetaSum / item.count).toFixed(1)
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.save(`relatorio_alertas_${filterDispensary}.pdf`);
  };

  const filteredRecords = useMemo(() => {
    if (filterDispensary === 'all') return alerts;
    return alerts.filter(r => r.dispensario === filterDispensary);
  }, [alerts, filterDispensary]);

  const normalizeProductName = (name: string): string => {
    const normalized = name.toUpperCase();
    if (normalized.includes('FLORATIL') || normalized.includes('REPOFLOR') || normalized.includes('SACCHAROMY')) {
      return 'FLORATIL/REPOFLOR 100MG (SACCHAROMYCES)';
    }
    return name;
  };

  const stats = useMemo(() => {
    if (filteredRecords.length === 0) return null;

    const total = filteredRecords.length;
    let medCount = 0, matCount = 0, saldoZeroCount = 0, slaOkCount = 0, totalValidSla = 0, canceladosCount = 0;
    
    const dispFreq: Record<string, number> = {};
    const turnoFreq: Record<string, number> = {
      'Manhã (06-13h)': 0,
      'Tarde (13-19h)': 0,
      'Noite (19-24h)': 0,
      'Madrugada (00-06h)': 0
    };
    const gavetaStats: Record<string, { total: number, items: Record<string, number> }> = {};
    const productStats: Record<string, any> = {};

    filteredRecords.forEach(r => {
      if (r.tipo === 'MED') medCount++;
      else if (r.tipo === 'MAT') matCount++;

      if (r.saldoGaveta === 0) saldoZeroCount++;
      if (r.status === 'Cancelado') canceladosCount++;

      const mins = timeToMinutes(r.tempo);
      if (mins !== null) {
        totalValidSla++;
        if (mins < 60) slaOkCount++;
      }

      const turno = getTurno(r.dataAlerta);
      if (turno !== 'Desconhecido') turnoFreq[turno]++;

      if (r.gaveta && r.gaveta !== 'N/A') {
        if (!gavetaStats[r.gaveta]) gavetaStats[r.gaveta] = { total: 0, items: {} };
        gavetaStats[r.gaveta].total++;
        if (r.descricao) {
          const canonicalName = normalizeProductName(r.descricao);
          gavetaStats[r.gaveta].items[canonicalName] = (gavetaStats[r.gaveta].items[canonicalName] || 0) + 1;
        }
      }

      if (r.descricao) {
        const canonicalName = normalizeProductName(r.descricao);
        if (!productStats[canonicalName]) {
          productStats[canonicalName] = {
            name: canonicalName,
            count: 0, tipo: r.tipo, tempoSum: 0, tempoCount: 0,
            saldoGavetaSum: 0, saldoAlertaSum: 0, operacoes: {}
          };
        }
        const p = productStats[canonicalName];
        p.count++;
        if (mins !== null) { p.tempoSum += mins; p.tempoCount++; }
        p.saldoGavetaSum += r.saldoGaveta;
        p.saldoAlertaSum += r.saldoAlerta;
        if (r.operacao) p.operacoes[r.operacao] = (p.operacoes[r.operacao] || 0) + 1;
      }

      if (r.dispensario) dispFreq[r.dispensario] = (dispFreq[r.dispensario] || 0) + 1;
    });

    const topProducts = Object.values(productStats).sort((a: any, b: any) => b.count - a.count).slice(0, 10);
    const dispensaryData = Object.entries(dispFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name: name.replace('DISPENSARIO ', ''), value }));
    const turnoData = Object.entries(turnoFreq).map(([name, value]) => ({ name, value }));
    const topGavetas = Object.entries(gavetaStats).sort((a, b) => b[1].total - a[1].total).slice(0, 10);

    return {
      total,
      medCount,
      matCount,
      rupturaPercent: ((saldoZeroCount / total) * 100).toFixed(1),
      slaPercent: totalValidSla > 0 ? ((slaOkCount / totalValidSla) * 100).toFixed(1) : '0',
      canceladosPercent: ((canceladosCount / total) * 100).toFixed(1),
      topProducts,
      dispensaryData,
      turnoData,
      topGavetas,
      productStats: Object.values(productStats).sort((a: any, b: any) => b.count - a.count).slice(0, 25)
    };
  }, [filteredRecords]);

  const uniqueDispensaries = useMemo(() => {
    const set = new Set(alerts.map(r => r.dispensario));
    return Array.from(set).filter(d => d && d !== 'Desconhecido').sort();
  }, [alerts]);

  if (alerts.length === 0) {
    return (
      <div className="max-w-3xl mx-auto mt-12 bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-12 text-center transition hover:border-blue-400">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Carregue o ficheiro alertas.txt</h2>
        <p className="text-gray-500 mb-6">Para analisar os principais itens de alerta, carregue o ficheiro extraído do sistema.</p>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-50 text-blue-600 font-medium px-6 py-3 rounded-lg border border-blue-200 hover:bg-blue-100 transition flex items-center gap-2 mx-auto"
        >
          <Upload className="w-4 h-4" />
          Selecionar Ficheiro
        </button>
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".txt,.tsv,.csv" 
          className="hidden" 
          onChange={handleFileSelect} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Filter */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            <label className="font-medium text-gray-700">Filtrar por Dispensário:</label>
          </div>
          <select 
            value={filterDispensary}
            onChange={(e) => setFilterDispensary(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-w-[300px] shadow-sm"
          >
            <option value="all">Todos os Dispensários</option>
            {uniqueDispensaries.map(d => (
              <option key={d} value={d}>{d.replace('DISPENSARIO ', '')}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => setAlerts([])}
          className="text-sm text-rose-600 font-bold hover:underline flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          Limpar Dados
        </button>
        <button 
          onClick={handleExportPDF}
          className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2"
        >
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1 text-blue-600">
              <BellRing className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Total Alertas</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.total.toLocaleString('pt-PT')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1 text-emerald-600">
              <Pill className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Medicamento</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.medCount.toLocaleString('pt-PT')}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-1 text-purple-600">
              <Box className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Materiais</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{stats.matCount.toLocaleString('pt-PT')}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200">
            <div className="flex items-center gap-2 mb-1 text-red-600">
              <AlertOctagon className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Ruptura Crítica</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{stats.rupturaPercent}%</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200">
            <div className="flex items-center gap-2 mb-1 text-emerald-600">
              <Zap className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">SLA &lt; 1 Hora</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{stats.slaPercent}%</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-1 text-gray-500">
              <Ban className="w-4 h-4" /><span className="text-[10px] font-bold uppercase">Cancelados</span>
            </div>
            <p className="text-2xl font-bold text-gray-700">{stats.canceladosPercent}%</p>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Top 10 Produtos (Volume de Alertas)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }}
                    tickFormatter={(val) => val.length > 20 ? val.substring(0, 17) + '...' : val}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Alertas por Dispensário</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.dispensaryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.dispensaryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Charts Row 2 */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Sazonalidade: Alertas por Turno</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.turnoData}>
                  <defs>
                    <linearGradient id="colorTurno" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorTurno)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[485px]">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 shrink-0">Top 10 Gavetas Críticas e Seus Itens</h3>
            <div className="h-48 mb-4 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topGavetas.map(([name, data]) => ({ name, total: data.total }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar text-sm border-t border-gray-100 pt-3 space-y-3 pr-2">
              {stats.topGavetas.map(([gaveta, data]) => (
                <div key={gaveta}>
                  <div className="font-bold text-gray-700 text-[11px] flex justify-between bg-orange-50 border border-orange-100 p-1.5 rounded mb-1">
                    <span>Gaveta {gaveta}</span>
                    <span className="text-orange-600">{data.total} alertas</span>
                  </div>
                  <ul className="pl-2 space-y-0.5">
                    {Object.entries(data.items).sort((a: [string, number], b: [string, number]) => b[1] - a[1]).map(([item, count]) => (
                      <li key={item} className="text-gray-600 text-[10px] flex justify-between items-center gap-2">
                        <span className="truncate" title={item}>• {item}</span> 
                        <span className="text-gray-400 font-mono text-[9px] shrink-0">{count}x</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info Guide */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-xl shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0">
          <Info className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-blue-800 font-bold mb-1 text-sm">Como interpretar o Tempo Médio?</h4>
          <p className="text-xs text-blue-700 mb-2">Representa o tempo que a equipa demora a dar resposta a uma quebra de stock (desde a geração do alerta até à reposição da gaveta).</p>
          <div className="flex flex-wrap gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded"><span className="w-2 h-2 rounded-full bg-red-500"></span> &gt; 2 Horas: Risco Assistencial. Necessário aumentar gaveta.</span>
            <span className="flex items-center gap-1 text-yellow-700 bg-yellow-100 px-2 py-1 rounded"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> 1 a 2 Horas: Atenção.</span>
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-1 rounded"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> &lt; 1 Hora: Reposição rápida / Boa eficiência.</span>
          </div>
        </div>
      </div>

      {/* Table */}
      {stats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h3 className="text-base font-bold text-gray-800">Detalhes Analíticos dos Principais Itens</h3>
            <span className="text-[10px] text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded shadow-sm font-bold uppercase">Média do período</span>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-white text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-200">
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Qtd. Alertas</th>
                  <th className="px-4 py-3 text-right">% Total</th>
                  <th className="px-4 py-3 text-center bg-blue-50/50">Tempo Médio</th>
                  <th className="px-4 py-3 text-center">Operação Principal</th>
                  <th className="px-4 py-3 text-right">Média Saldo Alerta</th>
                  <th className="px-4 py-3 text-right">Média Saldo Gaveta</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-gray-100">
                {stats.productStats.map((item: any) => {
                  const avgTempoValue = item.tempoCount > 0 ? item.tempoSum / item.tempoCount : 0;
                  const avgTempoStr = item.tempoCount > 0 ? minutesToTime(avgTempoValue) : '-';
                  
                  let colorClass = 'text-gray-600';
                  if (item.tempoCount > 0) {
                    if (avgTempoValue >= 120) colorClass = 'text-red-600 font-bold bg-red-50 py-1 px-2 rounded';
                    else if (avgTempoValue < 60) colorClass = 'text-emerald-600 font-bold bg-emerald-50 py-1 px-2 rounded';
                    else colorClass = 'text-yellow-600 font-bold bg-yellow-50 py-1 px-2 rounded';
                  }

                  let mostFreqOp = '-', maxOpCount = 0;
                  for (const op in item.operacoes) {
                    if (item.operacoes[op] > maxOpCount && op !== '') {
                      maxOpCount = item.operacoes[op]; 
                      mostFreqOp = op;
                    }
                  }

                  return (
                    <tr key={item.name} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 font-bold text-gray-800">
                        <div className="truncate max-w-xs" title={item.name}>{item.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          item.tipo === 'MED' ? 'bg-green-100 text-green-700' : 
                          item.tipo === 'MAT' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.tipo === 'MED' ? 'MEDICAMENTO' : item.tipo === 'MAT' ? 'MATERIAL' : item.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-700">{item.count}</td>
                      <td className="px-4 py-3 text-right text-gray-500 font-medium">{((item.count / stats.total) * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`${colorClass} font-mono text-[11px]`}>{avgTempoStr}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 text-[10px] font-bold">
                          {mostFreqOp}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 font-bold">{(item.saldoAlertaSum / item.count).toFixed(1)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-bold">{(item.saldoGavetaSum / item.count).toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend for Stock Columns */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
        <h4 className="text-slate-900 font-bold flex items-center gap-2">
          <Info className="w-5 h-5 text-indigo-600" />
          Entendendo a Margem de Segurança
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed">
          No contexto do seu sistema de dispensários e do ficheiro que carregou, estas colunas ajudam a perceber a <strong>"margem de segurança"</strong> que a equipa tem antes de um produto esgotar totalmente:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          <li><strong>Média Saldo Alerta:</strong> Representa a quantidade média que o sistema informático contabilizava no momento exato em que gerou o pedido de reposição. Basicamente, indica-lhe em que número o alarme virtual costuma disparar.</li>
          <li><strong>Média Saldo Gaveta:</strong> Representa a quantidade média que efetivamente restava fisicamente na gaveta quando o alerta foi gerado.</li>
        </ul>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="text-lg">💡</span> Como interpretar isto na prática?
          </p>
          <p className="text-sm text-slate-600">
            <strong>Se a média for 0 (Zero):</strong> Significa que a farmácia só está a ser avisada para repor quando o item já acabou completamente na gaveta. Isto é um <strong>Risco Assistencial (Rutura)</strong>, pois se um enfermeiro precisar desse item urgente, não o vai encontrar até que a logística chegue.
          </p>
          <p className="text-sm text-slate-600">
            <strong>Se a média for, por exemplo, 3 ou 5:</strong> É um excelente sinal. Significa que o "ponto de encomenda" está bem configurado. O dispensário avisa a farmácia para ir repor, mas ainda deixa uma margem de 3 ou 5 unidades na gaveta para os enfermeiros continuarem a trabalhar em segurança enquanto o abastecimento está a caminho.
          </p>
          <p className="text-sm text-slate-600 font-medium text-rose-700 bg-rose-50 p-2 rounded">
            Se reparar que um medicamento tem muitos alertas e a "Média Saldo Gaveta" é sempre 0, é um forte indicador de que precisa de aumentar o limite máximo e mínimo dessa gaveta no software do dispensário!
          </p>
        </div>
      </div>
    </div>
  );
};
