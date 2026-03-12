import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileSpreadsheet, List, Ban, User, CheckSquare, Search, 
  MapPin, Clock, X, Settings, Download, TrendingUp, 
  CheckCircle2, XCircle, FileText, PieChart, AlertTriangle, Activity
} from 'lucide-react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import clsx from 'clsx';

interface MedicamentoCancelado {
  nome: string;
  qSol: number;
}

interface ProcessedRow {
  solicitacao: string;
  horario: string;
  setor: string;
  usuarioPedido: string;
  recebidaEnfermagem: string;
  usuarioRececao: string;
  cancelada: string;
  statusAtendimento: string;
  statusGeral: string;
  detalhes: string;
  listaProdutos: MedicamentoCancelado[];
}

export function DashboardRastreio() {
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [rawCanc, setRawCanc] = useState<any[]>([]);
  const [rawStatus, setRawStatus] = useState<any[]>([]);
  const [rawRecebimento, setRawRecebimento] = useState<any[]>([]);

  const [statusItems, setStatusItems] = useState('Aguardando arquivo...');
  const [statusCanc, setStatusCanc] = useState('Aguardando arquivo...');
  const [statusStatus, setStatusStatus] = useState('Aguardando arquivo...');
  const [statusRecebimento, setStatusRecebimento] = useState('Aguardando arquivo...');

  const [isProcessing, setIsProcessing] = useState(false);
  const [finalData, setFinalData] = useState<ProcessedRow[]>([]);

  // Filtros
  const [hideCompleted, setHideCompleted] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('');

  const parseFile = (
    file: File | undefined, 
    setData: React.Dispatch<React.SetStateAction<any[]>>, 
    setStatus: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!file) {
      setData([]);
      setStatus('Aguardando arquivo...');
      return;
    }

    setStatus('Lendo arquivo...');
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        setData(results.data);
        setStatus(`✓ Carregado (${results.data.length} linhas)`);
      },
      error: () => {
        setStatus('Erro ao ler arquivo.');
        setData([]);
      }
    });
  };

  const getLocName = (unid: string, setor: string) => {
    const u = String(unid || '').trim();
    const s = String(setor || '').trim();
    if (u && u !== '-') return u;
    if (s && s !== '-') return s;
    return '';
  };

  const processData = () => {
    if (rawItems.length === 0 && rawCanc.length === 0) {
      alert("Por favor, carregue pelo menos o arquivo de Itens (TESTE222) ou o de Cancelados.");
      return;
    }

    setIsProcessing(true);

    setTimeout(() => {
      const sectorMap: Record<string, string> = {};
      const timeMap: Record<string, string> = {};

      const extractTime = (sol: string, rowArray: any[]) => {
        if (!timeMap[sol]) {
          const rowStr = rowArray.join(' ');
          const match = rowStr.match(/\b([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/);
          if (match) {
            timeMap[sol] = `${match[1]}:${match[2]}`;
          }
        }
      };

      const canceledSet = new Set<string>();
      rawCanc.forEach((row, index) => {
        const sol = String(row[6] || '').trim();
        if (sol.match(/^\d{5,10}$/)) {
          canceledSet.add(sol);
          const u = String(row[1] || '').trim();
          const s = String(row[5] || '').trim();
          const loc = getLocName(u, s);
          if (loc) sectorMap[sol] = loc;

          extractTime(sol, row);
          if (!timeMap[sol] && rawCanc[index + 1]) extractTime(sol, rawCanc[index + 1]);
        }
      });

      const itemsMap: Record<string, any> = {};
      rawItems.forEach(row => {
        let sol = String(row[2] || row[3] || '').trim();
        if (!sol.match(/^\d{5,10}$/)) {
          const found = row.find((c: any) => String(c).trim().match(/^\d{5,10}$/));
          if (found) sol = String(found).trim();
        }

        if (sol.match(/^\d{5,10}$/)) {
          extractTime(sol, row);

          let prod = String(row[5] || row[6] || '').trim();
          let qSolStr = String(row[8] || row[9] || '0');
          let qAtendStr = String(row[10] || row[11] || '0');

          if (prod.length < 5 || !isNaN(Number(prod))) {
            for (let i = 0; i < row.length; i++) {
              const val = String(row[i] || '').trim();
              if (val.includes(' - ') && isNaN(Number(val)) && val.length > 10) {
                prod = val;
                qSolStr = String(row[i + 2] || row[i + 3] || '0');
                qAtendStr = String(row[i + 4] || row[i + 5] || '0');
                break;
              }
            }
          }

          qSolStr = qSolStr.replace(/\./g, '').replace(',', '.').replace(/"/g, '');
          qAtendStr = qAtendStr.replace(/\./g, '').replace(',', '.').replace(/"/g, '');

          const qSol = parseFloat(qSolStr) || 0;
          const qAtend = parseFloat(qAtendStr) || 0;

          if (!itemsMap[sol]) {
            itemsMap[sol] = { totalItems: 0, missingItems: 0, details: [], allProducts: [], produtosDetalhes: [] };
          }

          if (prod && prod.length > 2 && isNaN(Number(prod))) {
            itemsMap[sol].totalItems++;
            itemsMap[sol].allProducts.push(prod);
            itemsMap[sol].produtosDetalhes.push({ nome: prod, qSol: qSol });

            if (qSol > qAtend) {
              itemsMap[sol].missingItems++;
              const diff = qSol - qAtend;
              itemsMap[sol].details.push(`${prod} (Faltou: ${diff})`);
            }
          }
        }
      });

      const statusMap: Record<string, any> = {};
      rawStatus.forEach(row => {
        const sol = String(row[0] || '').trim();
        if (sol.match(/^\d{5,10}$/)) {
          extractTime(sol, row);
          statusMap[sol] = {
            status: String(row[2] || '').trim(),
            usuario: String(row[11] || row[10] || '').trim()
          };
        }
      });

      const recebimentoMap: Record<string, any> = {};
      rawRecebimento.forEach(row => {
        let sol = String(row[6] || '').trim();
        let recebida = String(row[1] || '').trim();
        let usrRecebeu = String(row[8] || '').trim();
        let setor = String(row[3] || '').trim();
        let unidInt = String(row[4] || '').trim();

        if (!sol.match(/^\d{5,10}$/)) {
          const idx = row.findIndex((c: any) => String(c).trim().match(/^\d{5,10}$/));
          if (idx !== -1) {
            sol = String(row[idx]).trim();
            recebida = String(row[idx - 5] || row[1] || '').trim();
            setor = String(row[idx - 3] || row[3] || '').trim();
            unidInt = String(row[idx - 2] || row[4] || '').trim();
            usrRecebeu = String(row[idx + 2] || row[8] || '').trim();
          }
        }

        if (sol.match(/^\d{5,10}$/)) {
          extractTime(sol, row);
          recebimentoMap[sol] = {
            recebida: recebida || "-",
            usuario: usrRecebeu || "-"
          };
          const loc = getLocName(unidInt, setor);
          if (loc) sectorMap[sol] = loc;
        }
      });

      const allSols = new Set([
        ...Array.from(canceledSet),
        ...Object.keys(itemsMap),
        ...Object.keys(statusMap),
        ...Object.keys(recebimentoMap)
      ]);

      const newFinalData: ProcessedRow[] = Array.from(allSols).map(sol => {
        const isCanceled = canceledSet.has(sol);
        const itemData = itemsMap[sol] || { totalItems: 0, missingItems: 0, details: [], allProducts: [], produtosDetalhes: [] };
        const statusInfo = statusMap[sol] || { status: "-", usuario: "-" };
        const recebimentoInfo = recebimentoMap[sol] || { recebida: "-", usuario: "-" };

        let atendimentoStatus = "Sem itens listados";
        if (itemData.totalItems > 0) {
          if (itemData.missingItems === 0) atendimentoStatus = "Totalmente Atendida";
          else if (itemData.missingItems === itemData.totalItems) atendimentoStatus = "Não Atendida";
          else atendimentoStatus = "Parcialmente Atendida";
        }

        let detalhesStr = itemData.details.join(" | ");
        if (isCanceled && itemData.allProducts.length > 0) {
          detalhesStr = "PRODUTOS CANCELADOS: " + itemData.allProducts.join(" | ");
        }

        return {
          solicitacao: sol,
          horario: timeMap[sol] || "-",
          setor: sectorMap[sol] || "Não Identificado",
          usuarioPedido: statusInfo.usuario,
          recebidaEnfermagem: recebimentoInfo.recebida,
          usuarioRececao: recebimentoInfo.usuario,
          cancelada: isCanceled ? "SIM" : "NÃO",
          statusAtendimento: atendimentoStatus,
          statusGeral: statusInfo.status,
          detalhes: detalhesStr,
          listaProdutos: itemData.produtosDetalhes
        };
      });

      setFinalData(newFinalData);
      setSectorFilter('');
      setIsProcessing(false);
    }, 500);
  };

  const filteredData = useMemo(() => {
    let data = finalData;

    if (hideCompleted) {
      data = data.filter(d =>
        d.cancelada === "SIM" ||
        d.statusAtendimento === "Não Atendida" ||
        d.statusAtendimento === "Parcialmente Atendida"
      );
    }

    if (sectorFilter) {
      data = data.filter(d => d.setor === sectorFilter);
    }

    if (timeFilter) {
      data = data.filter(d => d.horario === timeFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toUpperCase();
      data = data.filter(d =>
        (d.usuarioPedido && d.usuarioPedido.toUpperCase().includes(term)) ||
        (d.usuarioRececao && d.usuarioRececao.toUpperCase().includes(term)) ||
        (d.solicitacao && d.solicitacao.toUpperCase().includes(term))
      );
    }

    // Ordenação
    return [...data].sort((a, b) => {
      if (a.cancelada === "SIM" && b.cancelada !== "SIM") return -1;
      if (a.cancelada !== "SIM" && b.cancelada === "SIM") return 1;
      if (a.horario !== "-" && b.horario !== "-") {
        return a.horario.localeCompare(b.horario);
      }
      return 0;
    });
  }, [finalData, hideCompleted, sectorFilter, timeFilter, searchTerm]);

  const uniqueSectors = useMemo(() => {
    return Array.from(new Set(finalData.map(d => d.setor)))
      .filter(s => s !== "Não Identificado")
      .sort();
  }, [finalData]);

  const topProducts = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(row => {
      if (row.cancelada === "SIM" && row.listaProdutos) {
        row.listaProdutos.forEach(p => {
          map[p.nome] = (map[p.nome] || 0) + p.qSol;
        });
      }
    });

    return Object.keys(map)
      .map(nome => ({ nome, qt: map[nome] }))
      .sort((a, b) => b.qt - a.qt)
      .slice(0, 5);
  }, [filteredData]);

  const topSectors = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(row => {
      if (row.cancelada === "SIM" && row.setor !== "Não Identificado") {
        map[row.setor] = (map[row.setor] || 0) + 1;
      }
    });

    return Object.keys(map)
      .map(setor => ({ setor, qt: map[setor] }))
      .sort((a, b) => b.qt - a.qt)
      .slice(0, 5);
  }, [filteredData]);

  const kpis = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const total = filteredData.length;
    const canceled = filteredData.filter(d => d.cancelada === "SIM").length;
    const cancelRate = total > 0 ? ((canceled / total) * 100).toFixed(1) : "0.0";
    
    const notReceived = filteredData.filter(d => d.recebidaEnfermagem === "Não" || d.recebidaEnfermagem === "-").length;
    
    const missingItems = filteredData.filter(d => 
      d.statusAtendimento === "Não Atendida" || d.statusAtendimento === "Parcialmente Atendida"
    ).length;

    return { total, canceled, cancelRate, notReceived, missingItems };
  }, [filteredData]);

  const exportToCSV = () => {
    if (filteredData.length === 0) return;

    const exportCsvData = filteredData.map(d => ({
      "Solicitação": d.solicitacao,
      "Horário": d.horario,
      "Setor / Unidade": d.setor,
      "Utilizador Pedido": d.usuarioPedido,
      "Recebida Enfermagem?": d.recebidaEnfermagem,
      "Utilizador Receção": d.usuarioRececao,
      "Cancelada?": d.cancelada,
      "Situação Atendimento": d.statusAtendimento,
      "Detalhes / Produtos": d.detalhes
    }));

    const csv = Papa.unparse(exportCsvData, { quotes: true, delimiter: ";" });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = sectorFilter ? `Relatorio_${sectorFilter.replace(/[^a-zA-Z0-9]/g, '_')}.csv` : `Relatorio_Cruzamento.csv`;
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (filteredData.length === 0) return;

    const doc = new jsPDF('l', 'pt', 'a4');
    const tableColumn = ["Solicitação", "Hora", "Setor", "Utiliz. (Pediu)", "Receção Enferm.", "Canc.?", "Situação", "Produtos / Detalhes"];
    const tableRows = filteredData.map(row => [
      row.solicitacao,
      row.horario,
      row.setor,
      row.usuarioPedido || '-',
      row.recebidaEnfermagem === "-" ? "-" : `${row.recebidaEnfermagem} (${row.usuarioRececao})`,
      row.cancelada,
      row.statusAtendimento,
      row.detalhes || '-'
    ]);

    const title = sectorFilter ? `Cruzamento - Setor: ${sectorFilter}` : "Relatório de Cruzamento Completo";
    doc.setFontSize(14);
    doc.text(title, 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total de registros filtrados: ${filteredData.length}`, 40, 55);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 64, 175] },
      columnStyles: {
        1: { cellWidth: 40 },
        2: { cellWidth: 90 },
        7: { cellWidth: 230 }
      }
    });

    const fileName = sectorFilter ? `Relatorio_${sectorFilter.replace(/[^a-zA-Z0-9]/g, '_')}.pdf` : `Relatorio_Cruzamento_Completo.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500">
      
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-900 to-indigo-800 p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold flex items-center gap-3 tracking-tight">
            <FileSpreadsheet className="w-8 h-8 text-blue-200" />
            Cruzamento de Solicitações (Farmácia/Stock)
          </h1>
          <p className="text-blue-200 mt-2 max-w-2xl text-sm leading-relaxed">
            Faça o upload dos arquivos extraídos do sistema para cruzar os dados de solicitações, horários, setores, recebimentos e itens em falta.
          </p>
        </div>
      </header>

      {/* Upload Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'TESTE222.csv', icon: List, color: 'text-indigo-500', bg: 'bg-indigo-50', badge: 'text-indigo-700', desc: 'Itens solicitados vs. atendidos (Faltas)', id: 'fileItems', stateSetter: setRawItems, status: statusItems, statusSetter: setStatusItems },
          { label: 'R_ESTAT_CANC...', icon: Ban, color: 'text-red-500', bg: 'bg-red-50', badge: 'text-red-700', desc: 'Relatório de pedidos cancelados', id: 'fileCanc', stateSetter: setRawCanc, status: statusCanc, statusSetter: setStatusCanc },
          { label: 'TESTE.csv', icon: User, color: 'text-emerald-500', bg: 'bg-emerald-50', badge: 'text-emerald-700', desc: 'Status e quem solicitou', id: 'fileStatus', stateSetter: setRawStatus, status: statusStatus, statusSetter: setStatusStatus },
          { label: '6221_Solic_Receb...', icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50', badge: 'text-blue-700', desc: 'Recebimento pela Enfermagem', id: 'fileRecebido', stateSetter: setRawRecebimento, status: statusRecebimento, statusSetter: setStatusRecebimento },
        ].map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-5 rounded-xl shadow-sm border border-slate-200 bg-white hover:shadow-md transition-shadow relative overflow-hidden group`}
          >
            <div className={`absolute top-0 left-0 w-1 h-full ${item.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
            <h3 className="font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <item.icon className={`w-4 h-4 ${item.color}`} />
              {idx + 1}. {item.label}
            </h3>
            <p className="text-xs text-slate-500 mb-4 h-6">{item.desc}</p>
            <label className="block w-full cursor-pointer">
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={(e) => parseFile(e.target.files?.[0], item.stateSetter, item.statusSetter)}
              />
              <div className={clsx(
                "w-full text-center text-xs font-semibold py-2 px-3 rounded-lg border border-dashed transition-all",
                item.status.includes('Carregado') ? `bg-emerald-50 border-emerald-200 text-emerald-700` : `${item.bg} border-${item.color.split('-')[1]}-200 ${item.badge} hover:opacity-80`
              )}>
                {item.status.includes('Carregado') ? item.status : 'Escolher Arquivo CSV'}
              </div>
            </label>
          </motion.div>
        ))}
      </div>

      {/* Controles & Filtros */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={processData}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              {isProcessing ? <Settings className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
              {isProcessing ? 'Processando...' : 'Processar Dados'}
            </button>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer font-medium bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
              <input 
                type="checkbox" 
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" 
              />
              Ocultar Totalmente Atendidas
            </label>
          </div>
          
          <AnimatePresence>
            {finalData.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2"
              >
                <button 
                  onClick={exportToCSV}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2 text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Exportar CSV
                </button>
                <button 
                  onClick={exportToPDF}
                  className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold py-2 px-4 rounded-xl transition-colors flex items-center gap-2 text-sm"
                >
                  <FileText className="w-4 h-4" /> Exportar PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all flex-grow max-w-[200px]">
            <Clock className="w-4 h-4 text-slate-400" />
            <input 
              type="time" 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="text-sm bg-transparent border-none outline-none cursor-pointer text-slate-700 w-full" 
              title="Horário Exato"
            />
            {timeFilter && (
              <button onClick={() => setTimeFilter('')} className="text-slate-400 hover:text-red-500">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative flex-grow max-w-[280px]">
            <MapPin className="w-4 h-4 absolute left-4 top-3 text-slate-400" />
            <select 
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none cursor-pointer transition-all"
            >
              <option value="">Todos os Setores</option>
              {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="relative flex-grow max-w-[320px]">
            <Search className="w-4 h-4 absolute left-4 top-3 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar Usuário ou Solicitação..." 
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 bg-slate-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      </motion.div>

      {/* KPIs Dinâmicos */}
      <AnimatePresence>
        {kpis && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <FileSpreadsheet className="w-16 h-16 text-blue-600" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
              </div>
              <p className="text-3xl font-black text-slate-800">{kpis.total}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Registos Listados</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <Ban className="w-16 h-16 text-red-600" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                  <Ban className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cancelados</span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-slate-800">{kpis.canceled}</p>
                <p className="text-sm font-bold text-red-500 mb-1">({kpis.cancelRate}%)</p>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">Taxa de Cancelamento</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <AlertTriangle className="w-16 h-16 text-orange-600" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Faltas</span>
              </div>
              <p className="text-3xl font-black text-slate-800">{kpis.missingItems}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Atendimento Parcial / Zero</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <XCircle className="w-16 h-16 text-amber-600" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <XCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Não Recebidos</span>
              </div>
              <p className="text-3xl font-black text-slate-800">{kpis.notReceived}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">S/ Registo na Enfermagem</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights Section */}
      <AnimatePresence>
        {(topProducts.length > 0 || topSectors.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Top Produtos */}
            {topProducts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
                <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  Top 5 Produtos Mais Cancelados
                </h2>
                <div className="space-y-3 flex-1">
                  {topProducts.map((p, index) => {
                    const maxQt = topProducts[0].qt;
                    const pct = Math.max(5, (p.qt / maxQt) * 100);
                    return (
                      <div key={p.nome} className="flex flex-col gap-1">
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-semibold text-slate-700 truncate pr-2" title={p.nome}>
                            {index + 1}. {p.nome}
                          </span>
                          <span className="font-black text-slate-900">{p.qt.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-medium">UN</span></span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.1 * index }}
                            className={clsx(
                              "h-full rounded-full",
                              index === 0 ? "bg-red-500" : index === 1 ? "bg-orange-400" : index === 2 ? "bg-amber-400" : "bg-slate-300"
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Setores */}
            {topSectors.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
                <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-500" />
                  Top 5 Setores c/ Mais Cancelamentos
                </h2>
                <div className="space-y-3 flex-1">
                  {topSectors.map((s, index) => {
                    const maxQt = topSectors[0].qt;
                    const pct = Math.max(5, (s.qt / maxQt) * 100);
                    return (
                      <div key={s.setor} className="flex flex-col gap-1">
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-semibold text-slate-700 truncate pr-2" title={s.setor}>
                            {index + 1}. {s.setor}
                          </span>
                          <span className="font-black text-slate-900">{s.qt.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-medium">PEDIDOS</span></span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.1 * index }}
                            className={clsx(
                              "h-full rounded-full",
                              index === 0 ? "bg-indigo-500" : index === 1 ? "bg-blue-400" : index === 2 ? "bg-sky-400" : "bg-slate-300"
                            )}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex justify-between items-center backdrop-blur-sm">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            Resultados do Cruzamento
            {finalData.length > 0 && (
              <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs font-bold">
                {filteredData.length} registros
              </span>
            )}
          </h2>
        </div>
        
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead className="bg-slate-50/90 sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <tr>
                <th className="p-4 font-semibold text-slate-600">ID Solicit.</th>
                <th className="p-4 font-semibold text-slate-600">Horário</th>
                <th className="p-4 font-semibold text-slate-600">Setor / Unidade</th>
                <th className="p-4 font-semibold text-slate-600">Usuário Solic.</th>
                <th className="p-4 font-semibold text-slate-600">Recebido Enf.</th>
                <th className="p-4 font-semibold text-slate-600">Cancelada?</th>
                <th className="p-4 font-semibold text-slate-600">Situação</th>
                <th className="p-4 font-semibold text-slate-600 w-full">Detalhes (Faltas/Cancelamentos)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {finalData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400 bg-slate-50/30">
                    <div className="flex flex-col items-center gap-3">
                      <FileSpreadsheet className="w-10 h-10 text-slate-300" />
                      <p>Carregue os arquivos e clique em "Processar" para ver os resultados.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">Nenhum registro encontrado com os filtros atuais.</td>
                </tr>
              ) : (
                filteredData.map(row => (
                  <tr key={row.solicitacao} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-4 font-medium text-slate-900">{row.solicitacao}</td>
                    <td className="p-4 text-slate-600">
                      {row.horario !== '-' ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded text-xs font-medium w-fit border border-slate-200">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {row.horario}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-700 max-w-[200px] truncate" title={row.setor}>{row.setor}</td>
                    <td className="p-4 font-bold text-blue-700">{row.usuarioPedido || '-'}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        {row.recebidaEnfermagem === 'Sim' ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1.5 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full w-fit border border-emerald-100">
                            <CheckCircle2 className="w-3.5 h-3.5" /> SIM
                          </span>
                        ) : row.recebidaEnfermagem === 'Não' ? (
                          <span className="text-red-500 font-bold flex items-center gap-1.5 text-[11px] bg-red-50 px-2 py-0.5 rounded-full w-fit border border-red-100">
                            <XCircle className="w-3.5 h-3.5" /> NÃO
                          </span>
                        ) : <span className="text-slate-400 font-medium">-</span>}
                        {row.usuarioRececao !== '-' && (
                          <span className="text-[10px] text-slate-500 tracking-tight pl-1 truncate max-w-[120px]" title={row.usuarioRececao}>
                            {row.usuarioRececao}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {row.cancelada === "SIM" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          CANC.
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          ATIVA
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold border",
                        row.statusAtendimento === 'Totalmente Atendida' && "bg-emerald-100 text-emerald-800 border-emerald-200",
                        row.statusAtendimento === 'Não Atendida' && "bg-orange-100 text-orange-800 border-orange-200",
                        row.statusAtendimento === 'Parcialmente Atendida' && "bg-yellow-100 text-yellow-800 border-yellow-200",
                        row.statusAtendimento === 'Sem itens listados' && "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {row.statusAtendimento.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-600 font-medium max-w-[300px] truncate" title={row.detalhes}>
                      {row.detalhes === '-' || !row.detalhes ? (
                        <span className="text-slate-400 italic">Nenhuma observação</span>
                      ) : (
                        <span className={clsx(row.cancelada === "SIM" && "text-red-600")}>{row.detalhes}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
