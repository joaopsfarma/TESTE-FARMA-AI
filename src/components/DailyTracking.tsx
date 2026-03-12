import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { UploadCloud, Search, Activity, Package, TrendingUp, TrendingDown, Minus, Filter, AlertCircle, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DailyItem {
  id: string;
  name: string;
  unit: string;
  history: number[]; // Array with the 5 days of history
  total: number;
  avg: number;
  stock: number;
  projection: number;
}

export const DailyTracking: React.FC = () => {
  const [data, setData] = useState<DailyItem[]>([]);
  const [daysHeader, setDaysHeader] = useState<string[]>(['D1', 'D2', 'D3', 'D4', 'D5']);
  const [fileName, setFileName] = useState('');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all'|'critical'|'warning'|'ok'>('all');
  const [filterTrend, setFilterTrend] = useState<'all'|'up'|'down'|'stable'>('all');

  const parseNumber = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.toString().replace(/"/g, '').replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      
      Papa.parse(text, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          
          let headerIdx = -1;
          for (let i=0; i < Math.min(rows.length, 10); i++) {
            const rowStr = rows[i].join('').toLowerCase();
            if (rowStr.includes('produto') && rowStr.includes('unidade') && rowStr.includes('saldo')) {
              headerIdx = i;
              
              const hRow = rows[i];
              const d1 = hRow[3]?.replace(/"/g, '') || 'D1';
              const d2 = hRow[4]?.replace(/"/g, '') || 'D2';
              const d3 = hRow[5]?.replace(/"/g, '') || 'D3';
              const d4 = hRow[6]?.replace(/"/g, '') || 'D4';
              const d5 = hRow[7]?.replace(/"/g, '') || 'D5';
              setDaysHeader([d1, d2, d3, d4, d5]);
              
              break;
            }
          }

          const startIndex = headerIdx !== -1 ? headerIdx + 1 : 0;
          const parsedData: DailyItem[] = [];

          for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 10) continue;

            const prodCol = row[0] || '';
            const match = prodCol.match(/^"?(\d+)\s*,\s*(.+)("?)$/);
            
            let id = '';
            let name = '';
            
            if (match) {
              id = match[1];
              name = match[2].replace(/"/g, '').trim();
            } else if (!isNaN(Number(row[0]))) {
               id = row[0];
               name = row[1];
            } else {
               continue;
            }

            const unit = row[2] || '';
            const h1 = parseNumber(row[3]);
            const h2 = parseNumber(row[4]);
            const h3 = parseNumber(row[5]);
            const h4 = parseNumber(row[6]);
            const h5 = parseNumber(row[7]);
            
            const total = parseNumber(row[8]);
            const avg = parseNumber(row[9]);
            const stock = parseNumber(row[10]);
            
            // Projeção: if it has enough columns, use it, else calculate it
            const projection = row.length > 12 ? parseNumber(row[12]) : (avg > 0 ? stock / avg : 999);

            if (id && name) {
              parsedData.push({
                id, name, unit,
                history: [h1, h2, h3, h4, h5],
                total, avg, stock, projection
              });
            }
          }

          setData(parsedData);
        }
      });
    };
    reader.readAsText(file, 'ISO-8859-1'); // Handle pt-BR accents if any
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/sample_daily.csv';
    link.setAttribute('download', 'OPI_Diario_Consumo_Modelo.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatus = (proj: number) => {
    if (proj < 3) return 'critical';
    if (proj < 7) return 'warning';
    return 'ok';
  };

  const getTrend = (history: number[]) => {
    const start = history[0] + history[1];
    const end = history[3] + history[4];
    if (end > start * 1.5) return 'up';
    if (end < start * 0.5) return 'down';
    return 'stable';
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const sMatch = item.name.toLowerCase().includes(search.toLowerCase()) || item.id.includes(search);
      const tMatch = filterTrend === 'all' || getTrend(item.history) === filterTrend;
      const fMatch = filterType === 'all' || getStatus(item.projection) === filterType;
      return sMatch && tMatch && fMatch;
    });
  }, [data, search, filterType, filterTrend]);

  const stats = useMemo(() => {
    let crit = 0, warn = 0, up = 0;
    data.forEach(item => {
      if (getStatus(item.projection) === 'critical') crit++;
      else if (getStatus(item.projection) === 'warning') warn++;
      if (getTrend(item.history) === 'up') up++;
    });
    return { crit, warn, up };
  }, [data]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('pt-BR');
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138); // Indigo 900
    doc.text('Tracking Diário de Consumo SV', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${currentDate} | Itens Analisados: ${filteredData.length}`, 14, 30);

    // Table
    const tableData = filteredData.map(item => {
      const status = getStatus(item.projection);
      const statusText = status === 'critical' ? 'CRÍTICO' : status === 'warning' ? 'ATENÇÃO' : 'NORMAL';
      
      const trend = getTrend(item.history);
      const trendText = trend === 'up' ? 'EM ALTA' : trend === 'down' ? 'EM BAIXA' : 'ESTÁVEL';

      return [
        item.id,
        item.name.substring(0, 45), // truncate long names
        item.unit,
        trendText,
        item.avg.toFixed(1).replace('.', ','),
        item.stock.toString(),
        item.projection === 999 ? '∞' : item.projection.toFixed(1).replace('.', ',') + ' d',
        statusText
      ];
    });

    autoTable(doc, {
      startY: 35,
      head: [['Cód', 'Descrição do Item', 'Unid.', 'Tendência', 'Med/Dia', 'Saldo', 'Projeção', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 15, halign: 'right' },
        6: { cellWidth: 15, halign: 'right' },
        7: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 7) {
          if (data.cell.raw === 'CRÍTICO') {
            data.cell.styles.textColor = [225, 29, 72]; // Rose 600
          } else if (data.cell.raw === 'ATENÇÃO') {
            data.cell.styles.textColor = [217, 119, 6]; // Amber 600
          } else {
            data.cell.styles.textColor = [5, 150, 105]; // Emerald 600
          }
        }
      }
    });

    doc.save(`Tracking_SV_Diario_${currentDate.replace(/\//g, '-')}.pdf`);
  };

  const drawSparkline = (hist: number[]) => {
    const max = Math.max(...hist, 1);
    return (
      <div className="flex items-end gap-1">
        {hist.map((val, i) => {
          const h = Math.max(10, (val / max) * 100);
          return (
            <div key={i} className="flex flex-col items-center gap-1 group">
               <div className="relative w-5 bg-slate-100 rounded-t-sm h-8 flex items-end overflow-hidden">
                 <div 
                   style={{ height: `${h}%` }} 
                   className={`w-full rounded-t-sm transition-all ${i === 4 ? 'bg-indigo-500' : 'bg-slate-300 group-hover:bg-indigo-400'}`}
                 />
               </div>
               <span className="text-[9px] font-mono font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
                 {val}
               </span>
               <span className="text-[8px] text-slate-400 mt-0.5" title="Dia de apuração">
                 {daysHeader[i]}
               </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Activity className="w-48 h-48 text-indigo-600" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Painel Gerencial MV
            </span>
            <span className="text-slate-400 text-sm">|</span>
            <span className="text-slate-500 text-sm font-medium">Tracking Diário de Consumo</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Lista Geral & Indicadores</h2>
          <p className="text-slate-500 text-sm mt-1">
            Importe o CSV do sistema para analisar tendências e projetar rupturas automaticamente.
          </p>
        </div>

        <div className="relative z-10 shrink-0 flex flex-col gap-2">
          {data.length === 0 && (
            <button 
              onClick={downloadTemplate}
              className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold transition-all text-sm"
            >
              <FileText className="w-4 h-4" />
              Baixar Exemplo
            </button>
          )}
          <label className="cursor-pointer flex items-center justify-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all hover:scale-105 active:scale-95">
            <UploadCloud className="w-5 h-5" />
            <span>{fileName ? 'Atualizar CSV MV' : 'Importar CSV MV'}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {data.length > 0 && (
        <>
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 text-slate-600 mb-2">
                <Package className="w-5 h-5" /> <h3 className="font-bold">Itens Lidos</h3>
              </div>
              <p className="text-3xl font-black text-slate-800">{data.length}</p>
            </div>
            <div className="bg-rose-50 p-5 rounded-xl border border-rose-100 shadow-sm cursor-pointer hover:bg-rose-100 transition-colors" onClick={()=>setFilterType('critical')}>
              <div className="flex items-center gap-3 text-rose-700 mb-2">
                <AlertCircle className="w-5 h-5" /> <h3 className="font-bold">Projeção Crítica</h3>
              </div>
              <p className="text-3xl font-black text-rose-800">{stats.crit}</p>
              <p className="text-xs text-rose-600/80 font-medium mt-1">&lt; 3 dias de cobertura</p>
            </div>
            <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 shadow-sm cursor-pointer hover:bg-amber-100 transition-colors" onClick={()=>setFilterType('warning')}>
              <div className="flex items-center gap-3 text-amber-700 mb-2">
                <AlertCircle className="w-5 h-5" /> <h3 className="font-bold">Atenção</h3>
              </div>
              <p className="text-3xl font-black text-amber-800">{stats.warn}</p>
              <p className="text-xs text-amber-600/80 font-medium mt-1">3 a 7 dias de cobertura</p>
            </div>
            <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm cursor-pointer hover:bg-indigo-100 transition-colors" onClick={()=>setFilterTrend('up')}>
               <div className="flex items-center gap-3 text-indigo-700 mb-2">
                <TrendingUp className="w-5 h-5" /> <h3 className="font-bold">Tendência Alta</h3>
              </div>
              <p className="text-3xl font-black text-indigo-800">{stats.up}</p>
              <p className="text-xs text-indigo-600/80 font-medium mt-1">Consumo subindo</p>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
               <div className="relative flex-1 min-w-[250px] max-w-md">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Buscar por código ou nome..."
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
               </div>
               
               <div className="flex gap-2">
                 <div className="relative">
                   <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <select 
                     value={filterType} 
                     onChange={e => setFilterType(e.target.value as any)}
                     className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                   >
                     <option value="all">Todas Projeções</option>
                     <option value="critical">🔴 Crítico</option>
                     <option value="warning">🟡 Atenção</option>
                     <option value="ok">🟢 Normal</option>
                   </select>
                 </div>
                 
                 <div className="relative">
                   <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                   <select 
                     value={filterTrend} 
                     onChange={e => setFilterTrend(e.target.value as any)}
                     className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                   >
                     <option value="all">Todas Tendências</option>
                     <option value="up">📈 Em Alta</option>
                     <option value="down">📉 Em Baixa</option>
                     <option value="stable">➖ Estável</option>
                   </select>
                 </div>
               </div>
               
               <div className="hidden sm:block w-px h-8 bg-slate-200 shrink-0"></div>

               <button
                 onClick={exportToPDF}
                 className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all text-sm shrink-0"
               >
                 <Download className="w-4 h-4" />
                 PDF
               </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold text-slate-600 w-24">Cód</th>
                    <th className="px-4 py-3 font-semibold text-slate-600">Descrição</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-center w-20">Unid</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-center w-40">Histórico de Consumo (5d)</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right w-24">Avg/Dia</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right w-24">Saldo</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 text-right w-32">Projeção</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence>
                    {filteredData.map(item => {
                      const trend = getTrend(item.history);
                      const status = getStatus(item.projection);
                      
                      return (
                        <motion.tr 
                          key={item.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="px-4 py-3 font-mono text-slate-500">{item.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="px-4 py-3 text-center text-slate-500 text-xs font-mono bg-slate-50 min-w-16">{item.unit}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {drawSparkline(item.history)}
                              {trend === 'up' ? <TrendingUp className="w-4 h-4 text-rose-500" /> : 
                               trend === 'down' ? <TrendingDown className="w-4 h-4 text-emerald-500" /> : 
                               <Minus className="w-4 h-4 text-slate-300" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-slate-700">{item.avg.toFixed(1).replace('.', ',')}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded">{item.stock}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end">
                              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-xs ${
                                status === 'critical' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                status === 'warning' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}>
                                {item.projection === 999 ? '∞' : item.projection.toFixed(1).replace('.', ',')} d
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                  
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        Nenhum item encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
