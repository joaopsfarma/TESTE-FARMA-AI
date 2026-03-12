import React, { useState, useMemo } from 'react';
import { Upload, Activity, Clock, Users, Package, AlertCircle, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import { motion } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';

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
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;

      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData: ProdutividadeRecord[] = results.data.map((row: any) => ({
            ...row,
            QT_SOLICITADO: parseFloat(row.QT_SOLICITADO?.replace(',', '.') || '0'),
            QT_MOVIMENTACAO: parseFloat(row.QT_MOVIMENTACAO?.replace(',', '.') || '0'),
            DIF_SOL_DIS: parseFloat(row.DIF_SOL_DIS?.replace(',', '.') || '0'),
          }));
          setData(parsedData);
        }
      });
    };
    reader.readAsText(file, 'ISO-8859-1'); // Commonly used for Brazilian CSV exports
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Helper to calculate time difference in minutes
  const getMinutesDifference = (pedidoData: string, pedidoHora: string, atendimentoDataHora: string) => {
    if (!pedidoData || !pedidoHora || !atendimentoDataHora) return null;

    // Parse DTPEDIDO (DD/MM/YYYY) and HRPEDIDO (HH:mm:ss or HH:mm)
    const [day, month, year] = pedidoData.split(' ')[0].split('/');
    if (!day || !month || !year) return null;

    const requestDate = new Date(`${year}-${month}-${day}T${pedidoHora}`);

    // Parse DT_SOLSAI_PRO (DD/MM/YYYY HH:mm:ss)
    const [atDay, atMonth, atYearTime] = atendimentoDataHora.split('/');
    if (!atDay || !atMonth || !atYearTime) return null;
    const [atYear, atTime] = atYearTime.split(' ');
    const attendDate = new Date(`${atYear}-${atMonth}-${atDay}T${atTime || '00:00:00'}`);

    if (isNaN(requestDate.getTime()) || isNaN(attendDate.getTime())) return null;

    const diffMs = attendDate.getTime() - requestDate.getTime();
    return Math.max(0, Math.floor(diffMs / 60000)); // returns in minutes
  };

  // Aggregate Data
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const byUser: Record<string, {
      pedidos: Set<string>;
      itemsMovimentados: number;
      temposAtendimento: number[];
    }> = {};

    const byHour: Record<string, number> = {};

    let totalPedidos = new Set<string>();
    let totalItems = 0;

    data.forEach(row => {
      // Usar NM_USUARIO como o atendente
      const userName = row.NM_USUARIO?.trim() || 'Desconhecido';
      const numPedido = row.NUMPEDIDO;

      if (!byUser[userName]) {
        byUser[userName] = { pedidos: new Set(), itemsMovimentados: 0, temposAtendimento: [] };
      }

      byUser[userName].pedidos.add(numPedido);
      byUser[userName].itemsMovimentados += row.QT_MOVIMENTACAO;

      totalPedidos.add(numPedido);
      totalItems += row.QT_MOVIMENTACAO;

      // Extract hour for peak demand
      if (row.HRPEDIDO) {
        const hr = row.HRPEDIDO.split(':')[0];
        if (hr) {
          byHour[hr] = (byHour[hr] || 0) + 1;
        }
      }

      // Calculate response time
      const timeDiff = getMinutesDifference(row.DTPEDIDO, row.HRPEDIDO, row.DT_SOLSAI_PRO);
      if (timeDiff !== null && timeDiff < 1440) { // filter out absurd outliers (>24h)
        byUser[userName].temposAtendimento.push(timeDiff);
      }
    });

    const userStats = Object.entries(byUser).map(([name, stats]) => {
      const totalTempo = stats.temposAtendimento.reduce((a, b) => a + b, 0);
      const mediaTempo = stats.temposAtendimento.length > 0
        ? Math.round(totalTempo / stats.temposAtendimento.length)
        : 0;

      return {
        name,
        pedidosAtendidos: stats.pedidos.size,
        itemsMovimentados: stats.itemsMovimentados,
        mediaTempoMinutos: mediaTempo
      };
    }).sort((a, b) => b.pedidosAtendidos - a.pedidosAtendidos);

    const hourChartData = Object.entries(byHour)
      .sort(([h1], [h2]) => parseInt(h1) - parseInt(h2))
      .map(([hora, total]) => ({ hora: `\${hora}h`, demand: total }));

    const bestPerformer = userStats[0];

    const allTimes = userStats.reduce((acc, curr) => {
       const userOrig = byUser[curr.name];
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

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-orange-600" />
            Produtividade da Equipe
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Importe o relatório de solicitações para analisar a performance dos colaboradores.
          </p>
        </div>

        {/* Upload Section */}
        <div
          className={`relative overflow-hidden group cursor-pointer border-2 border-dashed rounded-xl p-4 transition-all \${
            isDragging ? 'border-orange-500 bg-orange-50' : 'border-slate-300 hover:border-orange-400 bg-slate-50'
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
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors \${isDragging ? 'bg-orange-100 text-orange-600' : 'bg-white text-slate-400 group-hover:text-orange-500 shadow-sm'}`}>
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">
                {fileName ? fileName : 'Importar CSV de Produtividade'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {fileName ? 'Clique para trocar o arquivo' : 'Arraste ou clique para selecionar'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {data.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
          <FileSpreadsheet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Nenhum dado importado</h3>
          <p className="text-slate-500 mt-2">Faça o upload do arquivo CSV para visualizar os indicadores de produtividade.</p>
        </div>
      )}

      {stats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileSpreadsheet className="w-5 h-5" /></div>
                <p className="text-sm font-semibold text-slate-600">Total Solicitações</p>
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.totalPedidos.toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Package className="w-5 h-5" /></div>
                <p className="text-sm font-semibold text-slate-600">Itens Movimentados</p>
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.totalItems.toLocaleString()}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Clock className="w-5 h-5" /></div>
                <p className="text-sm font-semibold text-slate-600">Tempo Médio (Geral)</p>
              </div>
              <p className="text-3xl font-black text-slate-900">{stats.globalAvgTime} min</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl border border-orange-400 shadow-sm text-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-16 h-16" /></div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <p className="text-sm font-semibold text-orange-100 uppercase tracking-wider">Top Performer</p>
              </div>
              <p className="text-2xl font-black truncate relative z-10">{stats.bestPerformer?.name || '-'}</p>
              <p className="text-sm font-medium text-orange-100 relative z-10 mt-1">{stats.bestPerformer?.pedidosAtendidos} pedidos atendidos</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Atendimentos por Profissional</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.userStats.slice(0, 10)} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      cursor={{fill: '#F1F5F9'}}
                    />
                    <Legend />
                    <Bar dataKey="pedidosAtendidos" name="Solicitações" fill="#f97316" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Demanda por Horário (Picos)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.hourChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="demand" name="Itens/Solicitações" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-800">Resumo por Colaborador</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="p-4">Profissional</th>
                    <th className="p-4 text-center">Ped. Atendidos</th>
                    <th className="p-4 text-center">Itens Mov.</th>
                    <th className="p-4 text-center">Tempo Médio (min)</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-slate-700">
                  {stats.userStats.map((user, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-900">{user.name}</td>
                      <td className="p-4 text-center">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold">
                          {user.pedidosAtendidos}
                        </span>
                      </td>
                      <td className="p-4 text-center">{user.itemsMovimentados}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Clock className={`w-4 h-4 \${user.mediaTempoMinutos > 60 ? 'text-red-500' : 'text-emerald-500'}`} />
                          <span className={user.mediaTempoMinutos > 60 ? 'text-red-600 font-medium' : ''}>
                            {user.mediaTempoMinutos}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
