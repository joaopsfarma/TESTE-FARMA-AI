import React, { useState, useMemo } from 'react';
import { Upload, Activity, Clock, Users, Package, FileSpreadsheet, Search, ArrowUpDown, FileDown, Trophy, TrendingUp } from 'lucide-react';
import Papa from 'papaparse';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';

// --- HTML2PDF IMPORT (Using dynamically loaded script if we don't want to npm install it) ---
// Or simply rely on window.print for clean PDF export if preferred. We'll use window.print with tailored CSS for simplicity and zero-deps,
// but we can also inject html2pdf via a simple useEffect if strictly requested. Let's use standard browser print which is very robust.
// However, the user explicitly asked for "botão exportar pdf e tema claro (modernizado)" based on the previous HTML which used html2pdf.
// To be safe and identical to the previous experience, I'll dynamically load html2pdf.
import { useEffect } from 'react';

interface ProdutividadeRecord {
  DS_ESTOQUE: string;
  NUMPEDIDO: string;
  TP_SOLSAI_PRO: string;
  DT_SOLSAI_PRO: string;
  USU_SOLIC: string;
  USUARIO_SOLICITACAO: string;
  DESCRICAO_TIPO_SOLICITACAO: string;
  DTPEDIDO: string;
  HRPEDIDO: string;
  NUMATENDIMENTO: string;
  NUMPRESC: string;
  CD_PACIENTE: string;
  CD_SETOR: string;
  NM_SETOR: string;
  CD_USUARIO: string;
  NM_USUARIO: string;
  'Cód. Produto': string;
  Produto: string;
  QT_SOLICITADO: number;
  QT_MOVIMENTACAO: number;
  DIF_SOL_DIS: number;
  DS_UNIDADE: string;
}

export default function DashboardProdutividade() {
  const [data, setData] = useState<ProdutividadeRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'pedidosAtendidos', direction: 'desc' });

  useEffect(() => {
    // Inject html2pdf
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | null = null;
    if ('dataTransfer' in event) {
      event.preventDefault();
      setIsDragging(false);
      file = event.dataTransfer.files[0];
    } else {
      file = event.target.files?.[0] || null;
    }

    if (!file) return;

    setFileName(file.name);

    Papa.parse<ProdutividadeRecord>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      dynamicTyping: true,
      complete: (results) => {
        setData(results.data);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const userMap = new Map<string, { pedidos: Set<string>, items: number, timestamps: number[] }>();
    const totalPedidos = new Set<string>();
    let totalItems = 0;

    data.forEach(row => {
      const user = row.NM_USUARIO?.trim();
      const pedido = row.NUMPEDIDO?.toString();
      const itemsStr = row.QT_MOVIMENTACAO?.toString() || "0";
      const items = parseFloat(itemsStr.replace(',', '.')) || 0;

      const dataStr = row.DTPEDIDO; // DD/MM/YYYY
      const horaStr = row.HRPEDIDO; // HH:MM:SS

      if (!user || !pedido) return;

      if (!userMap.has(user)) {
        userMap.set(user, { pedidos: new Set(), items: 0, timestamps: [] });
      }

      const userStats = userMap.get(user)!;
      userStats.pedidos.add(pedido);
      userStats.items += items;

      totalPedidos.add(pedido);
      totalItems += items;

      if (dataStr && horaStr) {
        const [day, month, year] = dataStr.split('/');
        const [hour, minute, second] = horaStr.split(':');
        if (day && month && year && hour && minute && second) {
          const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
          if (!isNaN(date.getTime())) {
            userStats.timestamps.push(date.getTime());
          }
        }
      }
    });

    const userStats = Array.from(userMap.entries()).map(([name, data]) => {
      const sortedTimes = data.timestamps.sort((a, b) => a - b);
      const diffs: number[] = [];

      for (let i = 1; i < sortedTimes.length; i++) {
        const diffMin = (sortedTimes[i] - sortedTimes[i-1]) / (1000 * 60);
        if (diffMin > 0 && diffMin <= 120) {
          diffs.push(diffMin);
        }
      }

      const avgTime = diffs.length > 0
        ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
        : 0;

      return {
        name,
        pedidosAtendidos: data.pedidos.size,
        itemsMovimentados: data.items,
        mediaTempoMinutos: avgTime,
        temposAtendimento: diffs,
        mediaItensPedido: data.pedidos.size > 0 ? Number((data.items / data.pedidos.size).toFixed(1)) : 0
      };
    });

    // Picos de Horário
    const hourCounts = new Array(24).fill(0);
    const pedidoContabilizado = new Set<string>();

    data.forEach(row => {
      const pedido = row.NUMPEDIDO?.toString();
      const horaStr = row.HRPEDIDO;
      if (pedido && horaStr && !pedidoContabilizado.has(pedido)) {
         pedidoContabilizado.add(pedido);
         const [hour] = horaStr.split(':');
         if (hour) {
            hourCounts[parseInt(hour, 10)]++;
         }
      }
    });

    const hourChartData = hourCounts.map((count, i) => ({
      hora: `${i.toString().padStart(2, '0')}:00`,
      demand: count
    }));

    userStats.sort((a, b) => b.pedidosAtendidos - a.pedidosAtendidos);
    const bestPerformer = userStats.length > 0 ? userStats[0] : null;

    const allTimes = userStats.reduce((acc, userOrig) => {
       if(userOrig.name === bestPerformer?.name) return acc;
       return acc.concat(userOrig.temposAtendimento);
    }, [] as number[]);
    const globalAvgTime = allTimes.length > 0
        ? Math.round(allTimes.reduce((a, b) => a + b, 0) / allTimes.length)
        : 0;

    return {
      totalPedidos: totalPedidos.size,
      totalItems,
      bestPerformer,
      userStats,
      hourChartData,
      globalAvgTime
    };

  }, [data]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedUsers = useMemo(() => {
    if (!stats) return [];

    let result = [...stats.userStats];

    // Search filter
    if (searchTerm) {
      result = result.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    // Sorting
    result.sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [stats, searchTerm, sortConfig]);

  const top3 = stats?.userStats.slice(0, 3) || [];

  const exportPDF = () => {
    // Hide UI elements we don't want in PDF
    const uploadDiv = document.getElementById('upload-section');
    const exportBtn = document.getElementById('export-btn');
    const searchDiv = document.getElementById('search-section');

    if(uploadDiv) uploadDiv.style.display = 'none';
    if(exportBtn) exportBtn.style.display = 'none';
    if(searchDiv) searchDiv.style.display = 'none';

    const element = document.getElementById('dashboard-content');

    // @ts-ignore
    if (window.html2pdf && element) {
      const opt = {
        margin: 10,
        filename: `produtividade_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // @ts-ignore
      window.html2pdf().set(opt).from(element).save().then(() => {
        // Restore UI
        if(uploadDiv) uploadDiv.style.display = '';
        if(exportBtn) exportBtn.style.display = '';
        if(searchDiv) searchDiv.style.display = '';
      });
    } else {
      // Fallback to print
      window.print();
      if(uploadDiv) uploadDiv.style.display = '';
      if(exportBtn) exportBtn.style.display = '';
      if(searchDiv) searchDiv.style.display = '';
    }
  };

  return (
    <div className="space-y-6" id="dashboard-content">
      <div className="bg-gradient-to-r from-indigo-800 to-blue-700 p-6 rounded-3xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-white">
        <div>
          <h2 className="text-2xl font-extrabold flex items-center gap-3 tracking-tight">
            <div className="bg-white/20 p-2 rounded-xl">
              <Activity className="w-6 h-6 text-white" />
            </div>
            Produtividade da Equipe
          </h2>
          <p className="text-indigo-100 mt-2 font-medium">
            Análise de Desempenho e Horários • Farmácia e Estoque
          </p>
        </div>

        {/* Upload & Export Section */}
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
            {stats && (
                <button
                  id="export-btn"
                  onClick={exportPDF}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 font-semibold backdrop-blur-sm"
                >
                  <FileDown className="w-5 h-5 text-red-300" />
                  Exportar PDF
                </button>
            )}

            <div
            id="upload-section"
            className={`relative overflow-hidden group cursor-pointer border-2 border-dashed rounded-xl p-3 transition-all w-full sm:w-auto \${
                isDragging ? 'border-white bg-white/20' : 'border-white/30 hover:border-white bg-white/10'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileUpload}
            >
            <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="flex items-center gap-3 px-2">
                <Upload className="w-5 h-5 text-indigo-200" />
                <div>
                <p className="text-sm font-semibold text-white">
                    {fileName ? fileName : 'Carregar CSV'}
                </p>
                </div>
            </div>
            </div>
        </div>
      </div>

      {data.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-24 h-24 mb-6 rounded-full bg-indigo-50 flex items-center justify-center mx-auto">
             <FileSpreadsheet className="w-10 h-10 text-indigo-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700">Aguardando dados...</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto">Faça o upload do arquivo CSV do sistema para visualizar instantaneamente os indicadores de produtividade da sua equipe.</p>
        </div>
      )}

      {stats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 rounded-xl shadow-inner"><Users className="w-6 h-6" /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Colaboradores</p>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.userStats.length}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 rounded-xl shadow-inner"><Package className="w-6 h-6" /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Pedidos</p>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.totalPedidos.toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform"></div>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-200 text-emerald-700 rounded-xl shadow-inner"><Clock className="w-6 h-6" /></div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tempo Médio Global</p>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 mt-2">{stats.globalAvgTime} <span className="text-lg text-slate-500 font-medium">min</span></p>
            </div>
          </div>

          {/* Top 3 Pódio */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-xl font-bold mb-8 text-slate-800 flex items-center justify-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" /> Top 3 Produtividade (Volume)
            </h3>

            <div className="flex justify-center items-end gap-4 md:gap-8 h-48 mt-4">
                {/* 2nd Place */}
                {top3[1] && (
                    <div className="flex flex-col items-center justify-end w-28 group">
                        <div className="mb-2 text-center">
                            <div className="font-bold text-slate-700 text-sm truncate w-24" title={top3[1].name}>{top3[1].name.split(' ')[0]}</div>
                            <div className="text-xs font-bold text-slate-500">{top3[1].pedidosAtendidos} ped.</div>
                        </div>
                        <div className="w-full h-32 bg-gradient-to-t from-slate-200 to-slate-300 rounded-t-lg shadow-md relative flex justify-center items-start pt-3 border-b-4 border-slate-400 group-hover:-translate-y-1 transition-transform">
                            <span className="text-slate-600 font-black text-2xl drop-shadow-sm">2</span>
                        </div>
                    </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                    <div className="flex flex-col items-center justify-end w-32 group">
                        <div className="mb-2 text-center">
                            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                            <div className="font-bold text-amber-600 text-base truncate w-28" title={top3[0].name}>{top3[0].name.split(' ')[0]}</div>
                            <div className="text-sm font-bold text-amber-500">{top3[0].pedidosAtendidos} ped.</div>
                        </div>
                        <div className="w-full h-40 bg-gradient-to-t from-amber-300 to-amber-400 rounded-t-lg shadow-lg relative flex justify-center items-start pt-3 border-b-4 border-amber-600 group-hover:-translate-y-2 transition-transform">
                            <span className="text-amber-700 font-black text-3xl drop-shadow-sm">1</span>
                        </div>
                    </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                    <div className="flex flex-col items-center justify-end w-28 group">
                        <div className="mb-2 text-center">
                            <div className="font-bold text-orange-700 text-sm truncate w-24" title={top3[2].name}>{top3[2].name.split(' ')[0]}</div>
                            <div className="text-xs font-bold text-orange-600">{top3[2].pedidosAtendidos} ped.</div>
                        </div>
                        <div className="w-full h-24 bg-gradient-to-t from-orange-200 to-orange-300 rounded-t-lg shadow-md relative flex justify-center items-start pt-3 border-b-4 border-orange-500 group-hover:-translate-y-1 transition-transform">
                            <span className="text-orange-800 font-black text-2xl drop-shadow-sm">3</span>
                        </div>
                    </div>
                )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Volume por Colaborador</h3>
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Activity className="w-4 h-4" /></div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.userStats.slice(0, 10)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickFormatter={(v) => v.split(' ')[0]} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="pedidosAtendidos" name="Pedidos Atendidos" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-slate-800">Picos de Trabalho</h3>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
              </div>
              <p className="text-xs text-slate-500 mb-6 font-medium">Distribuição de pedidos por hora do dia.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.hourChartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="hora" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="demand" name="Volume" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-slate-800">Relatório Detalhado</h3>
              </div>

              {/* Search Bar */}
              <div id="search-section" className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Procurar colaborador..."
                  className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">Profissional <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('pedidosAtendidos')}>
                        <div className="flex items-center justify-center gap-1">Ped. Atendidos <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('itemsMovimentados')}>
                        <div className="flex items-center justify-center gap-1">Itens Mov. <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-4 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('mediaItensPedido')}>
                        <div className="flex items-center justify-center gap-1">Média Itens/Ped <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="p-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('mediaTempoMinutos')}>
                        <div className="flex items-center justify-end gap-1">Tempo Médio <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700 divide-y divide-slate-50">
                  {filteredAndSortedUsers.map((user, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="p-4 font-medium text-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold shadow-sm ring-2 ring-white">
                                {user.name.substring(0,2).toUpperCase()}
                            </div>
                            {user.name}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-semibold text-slate-700">{user.pedidosAtendidos.toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-center text-slate-600">{user.itemsMovimentados.toLocaleString()}</td>
                      <td className="p-4 text-center text-slate-600">{user.mediaItensPedido}</td>
                      <td className="p-4 text-right">
                        {user.mediaTempoMinutos > 0 ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold \${
                                user.mediaTempoMinutos < 10 ? 'bg-emerald-100 text-emerald-700' :
                                user.mediaTempoMinutos > 30 ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                            }`}>
                                <Clock className="w-3 h-3" />
                                {user.mediaTempoMinutos} min
                            </span>
                        ) : (
                            <span className="text-slate-400 text-xs italic">S/ Dados</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAndSortedUsers.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                      Nenhum colaborador encontrado.
                  </div>
              )}
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-100 text-xs text-slate-500 text-right">
                Mostrando {filteredAndSortedUsers.length} colaboradores
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
