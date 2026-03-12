import React, { useState, useMemo } from 'react';
import { FollowUpItem } from '../types';
import { exportToPDF } from '../utils/pdfExport';
import { 
  Search, 
  Filter, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Truck, 
  Calendar, 
  Building2, 
  Package,
  ChevronDown,
  MoreHorizontal,
  FileText,
  AlertTriangle,
  Info,
  Download,
  TrendingDown,
  Upload,
  BarChart3,
  CalendarDays,
  ExternalLink,
  ChevronRight,
  FilterX,
  X,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FollowUpUploader } from './FollowUpUploader';

interface FollowUpProps {
  data: FollowUpItem[];
  onDataLoaded: (data: FollowUpItem[], merge: boolean) => void;
}

export const FollowUp: React.FC<FollowUpProps> = ({ data, onDataLoaded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [supplierFilter, setSupplierFilter] = useState<string>('Todos');
  const [showUploader, setShowUploader] = useState(false);

  // Derivando fornecedores únicos para o filtro
  const suppliers = useMemo(() => {
    const s = new Set(data.map(item => item.supplier));
    return ['Todos', ...Array.from(s).sort()];
  }, [data]);

  // Filtragem de dados com lógica de busca refinada
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        item.itemName.toLowerCase().includes(searchLower) ||
        item.ocNumber.toLowerCase().includes(searchLower) ||
        item.supplier.toLowerCase().includes(searchLower) ||
        item.itemCode.toLowerCase().includes(searchLower);
      
      const matchesStatus = statusFilter === 'Todos' || item.status === statusFilter;
      const matchesSupplier = supplierFilter === 'Todos' || item.supplier === supplierFilter;

      return matchesSearch && matchesStatus && matchesSupplier;
    });
  }, [data, searchTerm, statusFilter, supplierFilter]);

  // Estatísticas avançadas (Excluindo registros de resumo "Múltiplas OCs")
  const stats = useMemo(() => {
    const realData = data.filter(i => i.ocNumber !== 'Múltiplas OCs');
    const total = realData.length;
    const delayed = realData.filter(i => i.status === 'Atrasado').length;
    const pendingQty = realData.reduce((acc, curr) => acc + curr.pendingQty, 0);
    const avgDelay = realData.filter(i => i.delayDays > 0).length > 0
      ? realData.reduce((acc, curr) => acc + curr.delayDays, 0) / realData.filter(i => i.delayDays > 0).length
      : 0;
    
    const maxDelay = realData.reduce((max, item) => Math.max(max, item.delayDays), 0);

    return { total, delayed, pendingQty, avgDelay, maxDelay };
  }, [data]);

  const handleExportPDF = () => {
    const tableData = filteredData.map(item => [
      item.ocNumber,
      item.supplier,
      item.itemName,
      item.deliveryDate,
      item.pendingQty.toString(),
      item.delayDays > 0 ? `${item.delayDays} dias` : item.status
    ]);

    exportToPDF({
      title: 'Relatório Analítico de Follow Up (Gestão de Compras)',
      filename: `FollowUp_${new Date().toISOString().split('T')[0]}.pdf`,
      headers: ['OC', 'Fornecedor', 'Item / Resumo', 'Prev. Entrega', 'Qtd Pendente', 'Atraso'],
      data: tableData,
      kpis: [
        { label: 'Total de Itens', value: filteredData.length.toString() },
        { label: 'Volume Pendente', value: filteredData.reduce((acc, curr) => acc + curr.pendingQty, 0).toLocaleString() },
        { label: 'Itens em Atraso', value: filteredData.filter(i => i.status === 'Atrasado').length.toString() }
      ]
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section com Visual Glassmorphism */}
      <div className="relative group p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 overflow-hidden shadow-2xl shadow-blue-200">
        {/* Animated background elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -ml-20 -mb-20" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <span className="text-white/70 text-xs font-black uppercase tracking-[0.2em]">Management Intelligence</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3"
            >
              Follow Up <span className="text-blue-200">HAC</span>
            </motion.h2>
            <p className="text-blue-100/80 max-w-xl text-lg font-medium leading-relaxed">
              Controle avançado de ordens de compra, previsão de entrega e mitigação de atrasos por fornecedor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowUploader(!showUploader)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all shadow-xl ${
                showUploader 
                  ? 'bg-rose-500 text-white shadow-rose-500/30' 
                  : 'bg-white text-blue-700 shadow-white/10 hover:bg-blue-50'
              }`}
            >
              {showUploader ? <X className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
              {showUploader ? 'FECHAR IMPORTADOR' : 'IMPORTAR DADOS'}
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.05, translateY: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportPDF}
              className="flex items-center gap-3 px-6 py-4 bg-blue-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-500/20 hover:bg-blue-400 border border-blue-400/30"
            >
              <Download className="w-5 h-5" />
              EXPORTAR RELATÓRIO PDF
            </motion.button>
          </div>
        </div>
      </div>

      {/* Uploader Section com Transição Fluida */}
      <AnimatePresence>
        {showUploader && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="p-8 rounded-[2.5rem] bg-white border-2 border-dashed border-blue-200 shadow-xl shadow-blue-100/50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Consolidador de Dados</h3>
                  <p className="text-slate-500 font-medium">Arraste seus arquivos CSV (Acompanhamento HAC ou Fornecedores Mestre) abaixo.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-widest border border-blue-100">
                  <Info className="w-4 h-4" />
                  Processamento Automático
                </div>
              </div>
              <FollowUpUploader onDataLoaded={onDataLoaded} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <PremiumStatCard 
          title="Volume Pendente" 
          value={stats.pendingQty.toLocaleString()} 
          suffix="unidades"
          icon={<Package className="w-6 h-6" />}
          color="blue"
          trend="+5.2%"
        />
        <PremiumStatCard 
          title="Taxa de Atraso" 
          value={stats.total > 0 ? ((stats.delayed / stats.total) * 100).toFixed(1) : "0"} 
          suffix="%"
          icon={<AlertTriangle className="w-6 h-6" />}
          color="rose"
          highlight={stats.delayed > 0}
        />
        <PremiumStatCard 
          title="Atraso Médio" 
          value={stats.avgDelay.toFixed(1)} 
          suffix="dias"
          icon={<Clock className="w-6 h-6" />}
          color="amber"
        />
        <PremiumStatCard 
          title="Máximo Atraso" 
          value={stats.maxDelay} 
          suffix="dias"
          icon={<BarChart3 className="w-6 h-6" />}
          color="indigo"
        />
      </div>

      {/* Advanced BI Widgets Section */}
      {stats.delayed > 0 && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Fornecedores Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Building2 className="w-32 h-32 text-rose-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-rose-50 rounded-xl">
                    <TrendingDown className="w-5 h-5 text-rose-500" />
                  </div>
                  Maiores Ofensores
                </h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Ranking por Fornecedor (Volume)</p>
              </div>
            </div>

            <div className="space-y-6">
              {Array.from(data.filter(i => i.status === 'Atrasado' && i.ocNumber !== 'Múltiplas OCs').reduce((map, item) => {
                map.set(item.supplier, (map.get(item.supplier) || 0) + item.pendingQty);
                return map;
              }, new Map<string, number>()).entries())
              .map(([name, qty]) => ({ name, qty }))
              .sort((a, b) => b.qty - a.qty)
              .slice(0, 5)
              .map((s, idx, arr) => (
                <div key={idx} className="group cursor-default">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors ${
                        idx === 0 ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-400 border-slate-100 group-hover:border-rose-200 group-hover:text-rose-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm font-black text-slate-700 truncate max-w-[200px]">{s.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">{s.qty.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-slate-400 ml-1">UN</span>
                    </div>
                  </div>
                  <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.qty / Math.max(1, arr[0]?.qty || 1)) * 100}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full rounded-full ${idx === 0 ? 'bg-gradient-to-r from-rose-500 to-orange-400' : 'bg-slate-300'}`}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-8 py-4 bg-slate-50 hover:bg-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
              Ver Todos os Fornecedores <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </motion.div>

        {/* OCs Widget */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <FileText className="w-32 h-32 text-amber-600" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  </div>
                  Pedidos Críticos
                </h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Top OCs por Dias de Atraso</p>
              </div>
            </div>

            <div className="space-y-4">
              {data.filter(i => i.status === 'Atrasado' && i.ocNumber !== 'Múltiplas OCs')
              .sort((a, b) => b.delayDays - a.delayDays)
              .slice(0, 5)
              .map((item, idx, arr) => (
                <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-transparent hover:border-amber-200 hover:bg-amber-50/30 transition-all group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black shadow-sm border-2 ${
                    idx === 0 ? 'bg-amber-500 text-white border-amber-400' : 'bg-white text-slate-400 border-white'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-black text-slate-900 truncate">OC #{item.ocNumber}</span>
                      <span className="text-xs font-black text-rose-600">{item.delayDays} DIAS</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{item.supplier}</span>
                      <span className="text-[10px] font-black text-slate-600 italic">#{item.itemCode}</span>
                    </div>
                  </div>
                  <motion.div whileHover={{ scale: 1.1 }} className="p-2 bg-white rounded-lg shadow-sm cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-4 h-4 text-amber-600" />
                  </motion.div>
                </div>
              ))}
              {data.filter(i => i.status === 'Atrasado' && i.ocNumber !== 'Múltiplas OCs').length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center opacity-40">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Tudo regularizado</p>
                </div>
              )}
            </div>
            
            <button className="w-full mt-4 py-4 bg-transparent hover:bg-slate-50 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest transition-colors">
              Explorar Todos os Pedidos
            </button>
          </div>
        </motion.div>
      </div>
      )}

      {/* Modern Tool Bar (Filters & Search) */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text"
            placeholder="Buscar por item, fornecedor, OC..."
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border border-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-200 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-48 group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              className="w-full pl-11 pr-4 py-4 rounded-2xl bg-slate-50 border border-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-200 transition-all text-sm font-black text-slate-600 appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Todos">Status</option>
              <option value="No Prazo">No Prazo</option>
              <option value="Atrasado">Atrasado</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none transition-transform group-focus-within:rotate-180" />
          </div>

          <div className="relative w-full md:w-64 group">
            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select 
              className="w-full pl-11 pr-10 py-4 rounded-2xl bg-slate-50 border border-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-200 transition-all text-sm font-black text-slate-600 appearance-none cursor-pointer truncate"
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            >
              {suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none transition-transform group-focus-within:rotate-180" />
          </div>

          {(searchTerm || statusFilter !== 'Todos' || supplierFilter !== 'Todos') && (
            <motion.button 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('Todos');
                setSupplierFilter('Todos');
              }}
              className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-colors shadow-sm"
              title="Limpar Filtros"
            >
              <FilterX className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Main Data Layer (The Table) */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 relative overflow-hidden min-h-[400px]">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black shadow-sm">
                {filteredData.length}
             </div>
             <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Base de Dados</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Listagem filtrada de ordens de compra</p>
             </div>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visualização Enterprise</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificação / Canal</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Solicitado</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fulfillment</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status & SLA</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas Gerais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
                {filteredData.map((item) => (
                  <motion.tr 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-blue-50/10 transition-colors group cursor-default"
                  >
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">#{item.ocNumber}</span>
                           <div className="w-1 h-1 rounded-full bg-slate-300" />
                           <span className="text-[10px] font-bold text-slate-400">{item.hospital}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider bg-slate-100 w-fit px-2 py-1 rounded-lg">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {item.supplier}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 max-w-md">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-800 line-clamp-2 mb-1 tracking-tight">{item.itemName}</span>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                             ID: {item.itemCode}
                           </span>
                           <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                              <BarChart3 className="w-3 h-3" />
                              Cobertura: {item.coverage}d
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-center gap-2">
                         <div className="flex items-center gap-2 text-[11px] font-black text-slate-900 bg-white shadow-sm border border-slate-100 px-3 py-1.5 rounded-xl w-full justify-center">
                            <span className="text-blue-600">{item.pendingQty}</span>
                            <div className="w-px h-3 bg-slate-200" />
                            <span className="text-slate-400 text-[10px]">TOTAL: {item.totalQty}</span>
                         </div>
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                             <CalendarDays className="w-3 h-3" />
                             Criação: {item.creationDate}
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-center gap-2">
                        <ModernStatusBadge status={item.status} delay={item.delayDays} date={item.deliveryDate} />
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 max-w-[280px] group-hover:bg-white group-hover:shadow-sm transition-all">
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2 italic">
                          {item.observations === '0' || !item.observations ? 'Nenhuma pendência crítica anotada.' : item.observations}
                        </p>
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
          
          {filteredData.length === 0 && (
            <div className="py-24 text-center">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Search className="w-10 h-10 text-slate-300" />
              </motion.div>
              <h4 className="text-lg font-black text-slate-800">Nenhum resultado encontrado</h4>
              <p className="text-slate-400 font-medium mt-1">Tente ajustar seus filtros ou termos de busca.</p>
              <button 
                onClick={() => { setSearchTerm(''); setStatusFilter('Todos'); setSupplierFilter('Todos'); }}
                className="mt-6 text-sm font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-widest"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          )}
        </div>
        
        {/* Table Footer */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
           <div>Sincronizado via {data[0]?.id.startsWith('upload') ? 'CSV Import' : 'Dataset Local'}</div>
           <div>Processamento de SLA em Tempo Real</div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components Premium Memoized ---

const ModernStatusBadge = React.memo<{ status: FollowUpItem['status'], delay: number, date: string }>(({ status, delay, date }) => {
  const configs = {
    'No Prazo': { 
      icon: <Clock className="w-3.5 h-3.5" />, 
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-100/50',
      label: 'SLA OK',
      dateColor: 'text-emerald-600'
    },
    'Atrasado': { 
      icon: <AlertCircle className="w-3.5 h-3.5" />, 
      color: 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-100/50',
      label: `CRÍTICO (${delay}D)`,
      dateColor: 'text-rose-600'
    },
    'Entregue': { 
      icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
      color: 'bg-blue-50 text-blue-700 border-blue-100 shadow-blue-100/50',
      label: 'FINALIZADO',
      dateColor: 'text-blue-600'
    },
  };

  const config = configs[status];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border shadow-sm text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${config.color}`}>
        {config.icon}
        {config.label}
      </div>
      <div className={`flex items-center gap-1.5 text-[10px] font-black ${config.dateColor}`}>
        <Truck className="w-3 h-3" />
        ETA: {date}
      </div>
    </div>
  );
});

const PremiumStatCard = React.memo<{ 
  title: string; 
  value: string | number; 
  suffix?: string;
  icon: React.ReactNode; 
  color: 'blue' | 'rose' | 'amber' | 'indigo'; 
  highlight?: boolean; 
  trend?: string;
}>(({ title, value, suffix, icon, color, highlight, trend }) => {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 border-blue-100 shadow-blue-100/50',
    rose: 'text-rose-600 bg-rose-50 border-rose-100 shadow-rose-100/50',
    amber: 'text-amber-600 bg-amber-50 border-amber-100 shadow-amber-100/50',
    indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-100/50',
  };

  return (
    <motion.div 
      whileHover={{ y: -6, scale: 1.02 }}
      className={`bg-white p-7 rounded-[2.5rem] border transition-all duration-300 group ${
        highlight ? 'border-rose-200 shadow-xl shadow-rose-100/50' : 'border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className={`p-4 rounded-2xl transition-transform duration-500 group-hover:rotate-12 ${colorMap[color]}`}>
          {icon}
        </div>
        {trend && (
           <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
             <ArrowUpRight className="w-3 h-3" /> {trend}
           </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <p className={`text-4xl font-black tracking-tight ${highlight ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
          {suffix && <p className="text-xs font-bold text-slate-400 uppercase">{suffix}</p>}
        </div>
      </div>
    </motion.div>
  );
});
