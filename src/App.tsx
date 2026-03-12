import DashboardProdutividade from "./components/DashboardProdutividade";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { usePersistentState } from './hooks/usePersistentState';
import { MOCK_INVENTORY } from './mockData';
import { processInventory } from './logic';
import { InventoryTable } from './components/InventoryTable';
import { TransferRequest } from './components/TransferRequest';
import { VBACodeDisplay } from './components/VBACodeDisplay';
import { CsvUploader } from './components/CsvUploader';
import { ValidityUploader } from './components/ValidityUploader';
import { LayoutDashboard, FileSpreadsheet, Code, Pill, Database, Filter, AlertCircle, PieChart, Download, ListTodo, Activity, ClipboardList, Menu, X, ChevronRight, Clock, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Dashboard } from './components/Dashboard';
import { FollowUp } from './components/FollowUp';
import { FollowUpUploader } from './components/FollowUpUploader';
import { Product, UnitType, ProductCategory, AlertStatus, FollowUpItem } from './types';
import { MOCK_FOLLOW_UP } from './data/mockFollowUp';
import { DispensaryAnalysis } from './components/DispensaryAnalysis';
import { AnalysePendencies } from './components/AnalysePendencies';
import { DashboardPrevisibilidade } from './components/DashboardPrevisibilidade';
import { DashboardEquivalencia } from './components/DashboardEquivalencia';
import { DispensaryProject } from './components/DispensaryProject';
import Pedido24h from './components/Pedido24h';
import { DailyTracking } from './components/DailyTracking';
import { DashboardRastreio } from './components/DashboardRastreio';
import { MobileHeader } from './components/layout/MobileHeader';
import { Sidebar, NavItem, TabId } from './components/layout/Sidebar';
import { exportInventoryToPDF } from './utils/pdfExport';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [inventoryData, setInventoryData] = usePersistentState<Product[]>('logistica_farma_inventory', MOCK_INVENTORY);
  const [followUpData, setFollowUpData] = usePersistentState<FollowUpItem[]>('logistica_farma_followup', MOCK_FOLLOW_UP);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'Todos'>('Todos');
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus | 'Todos'>('Todos');
  
  const processedData = useMemo(() => processInventory(inventoryData), [inventoryData]);
  
  // Filter out 501 for display, and filter by category and status
  const displayData = useMemo(() => {
    return processedData.filter(p => {
      const isNot501 = p.unit !== '501';
      const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
      const matchesStatus = selectedStatus === 'Todos' || p.status === selectedStatus;
      return isNot501 && matchesCategory && matchesStatus;
    });
  }, [processedData, selectedCategory, selectedStatus]);

  const handleDataLoaded = (newData: Product[]) => {
    // Replace entire inventory with new data (since it contains units)
    setInventoryData(newData);
    // Don't switch tab immediately, let user import validity if they want
  };

  const handleValidityLoaded = (validityMap: Record<string, { date: string, batch: string }>) => {
    setInventoryData(prev => prev.map(item => {
      if (validityMap[item.id]) {
        return { 
          ...item, 
          expiryDate: validityMap[item.id].date,
          batch: validityMap[item.id].batch
        };
      }
      return item;
    }));
  };

  const handleFollowUpLoaded = (data: FollowUpItem[], isMerge: boolean = false) => {
    if (isMerge) {
      setFollowUpData(prev => {
        // Remove duplicates by ID natively
        const newIds = new Set(data.map(item => item.id));
        const filteredPrev = prev.filter(item => !newIds.has(item.id));
        return [...filteredPrev, ...data];
      });
    } else {
      setFollowUpData(data);
    }
  };

  const handleUpdateStock = (id: string, unit: string, newStock: number) => {
    setInventoryData(prev => prev.map(item => {
      if (item.id === id && item.unit === unit) {
        return { ...item, physicalStock: newStock };
      }
      return item;
    }));
  };

  const handleResetData = () => {
    setInventoryData(MOCK_INVENTORY);
  };

  const stats = {
    total: displayData.length,
    critical: displayData.filter(p => p.status === 'URGENTE!').length,
    warning: displayData.filter(p => p.status === 'VERIFICAR INVENTÁRIO').length,
    order: displayData.filter(p => p.status === 'PEDIR AO RECEBIMENTO').length,
    expiry: displayData.filter(p => p.status === 'REMANEJAR (VALIDADE)').length,
  };

  const exportToPDF = () => {
    exportInventoryToPDF(displayData, stats);
  };

  const navItems = [
    { id: 'dispensaryProject', label: 'Projeto Dispensário', icon: <ClipboardList className="w-5 h-5" />, classes: { activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', activeBorder: 'border-emerald-100', iconActive: 'text-emerald-600', badgeBg: 'bg-emerald-200', badgeText: 'text-emerald-800' } },
    { id: 'pedido24h', label: 'Pedido 24h', icon: <Clock className="w-5 h-5" />, classes: { activeBg: 'bg-amber-50', activeText: 'text-amber-700', activeBorder: 'border-amber-100', iconActive: 'text-amber-600', badgeBg: 'bg-amber-200', badgeText: 'text-amber-800' } },
    { id: 'daily_tracking', label: 'Tracking Diário SV', icon: <Activity className="w-5 h-5" />, classes: { activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', activeBorder: 'border-indigo-100', iconActive: 'text-indigo-600', badgeBg: 'bg-indigo-200', badgeText: 'text-indigo-800' } },
    { id: 'dashboard', label: 'Lista Geral', icon: <LayoutDashboard className="w-5 h-5" />, classes: { activeBg: 'bg-emerald-50', activeText: 'text-emerald-700', activeBorder: 'border-emerald-100', iconActive: 'text-emerald-600', badgeBg: 'bg-emerald-200', badgeText: 'text-emerald-800' } },
    { id: 'analytics', label: 'Insights do Farma', icon: <PieChart className="w-5 h-5" />, classes: { activeBg: 'bg-purple-50', activeText: 'text-purple-700', activeBorder: 'border-purple-100', iconActive: 'text-purple-600', badgeBg: 'bg-purple-200', badgeText: 'text-purple-800' } },
    { id: 'dispensary', label: 'Análise Dispensários', icon: <Activity className="w-5 h-5" />, classes: { activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', activeBorder: 'border-indigo-100', iconActive: 'text-indigo-600', badgeBg: 'bg-indigo-200', badgeText: 'text-indigo-800' } },
    { id: 'transfer', label: 'Requisição', icon: <FileSpreadsheet className="w-5 h-5" />, badge: stats.order, classes: { activeBg: 'bg-indigo-50', activeText: 'text-indigo-700', activeBorder: 'border-indigo-100', iconActive: 'text-indigo-600', badgeBg: 'bg-indigo-200', badgeText: 'text-indigo-800' } },
    { id: 'followup', label: 'Follow Up', icon: <ListTodo className="w-5 h-5" />, classes: { activeBg: 'bg-blue-50', activeText: 'text-blue-700', activeBorder: 'border-blue-100', iconActive: 'text-blue-600', badgeBg: 'bg-blue-200', badgeText: 'text-blue-800' } },
    { id: 'genesis', label: 'Projeto Genesis', icon: <FileSpreadsheet className="w-5 h-5" />, classes: { activeBg: 'bg-cyan-50', activeText: 'text-cyan-700', activeBorder: 'border-cyan-100', iconActive: 'text-cyan-600', badgeBg: 'bg-cyan-200', badgeText: 'text-cyan-800' } },
    { id: 'previsibilidade', label: 'Previsibilidade', icon: <AlertCircle className="w-5 h-5" />, classes: { activeBg: 'bg-rose-50', activeText: 'text-rose-700', activeBorder: 'border-rose-100', iconActive: 'text-rose-600', badgeBg: 'bg-rose-200', badgeText: 'text-rose-800' } },
    { id: 'produtividade', label: 'Produtividade', icon: <Activity className="w-5 h-5" />, classes: { activeBg: 'bg-orange-50', activeText: 'text-orange-700', activeBorder: 'border-orange-100', iconActive: 'text-orange-600', badgeBg: 'bg-orange-200', badgeText: 'text-orange-800' } },
    { id: 'equivalencia', label: 'Equivalência', icon: <Database className="w-5 h-5" />, classes: { activeBg: 'bg-teal-50', activeText: 'text-teal-700', activeBorder: 'border-teal-100', iconActive: 'text-teal-600', badgeBg: 'bg-teal-200', badgeText: 'text-teal-800' } },
    { id: 'rastreio', label: 'Rastreio Cancelamento', icon: <Ban className="w-5 h-5" />, classes: { activeBg: 'bg-red-50', activeText: 'text-red-700', activeBorder: 'border-red-100', iconActive: 'text-red-600', badgeBg: 'bg-red-200', badgeText: 'text-red-800' } },
    { id: 'import', label: 'Importar CSV', icon: <Database className="w-5 h-5" />, classes: { activeBg: 'bg-blue-50', activeText: 'text-blue-700', activeBorder: 'border-blue-100', iconActive: 'text-blue-600', badgeBg: 'bg-blue-200', badgeText: 'text-blue-800' } },
    { id: 'vba', label: 'Macro VBA', icon: <Code className="w-5 h-5" />, classes: { activeBg: 'bg-slate-100', activeText: 'text-slate-900', activeBorder: 'border-slate-200', iconActive: 'text-slate-800', badgeBg: 'bg-slate-200', badgeText: 'text-slate-800' } },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row">
      <MobileHeader 
        isSidebarOpen={isSidebarOpen} 
        setIsSidebarOpen={setIsSidebarOpen} 
      />

      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        navItems={navItems}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full"
          >
        {activeTab === 'dispensaryProject' && (
          <div className="max-w-7xl mx-auto">
             <DispensaryProject />
          </div>
        )}

        {activeTab === 'pedido24h' && (
          <div className="max-w-7xl mx-auto">
             <Pedido24h />
          </div>
        )}

        {activeTab === 'daily_tracking' as TabId && (
          <div className="max-w-7xl mx-auto">
             <DailyTracking />
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Header Section com Título e Filtros */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Visão Geral</h2>
                <p className="text-slate-500 text-sm">Acompanhe e gerencie o estoque da farmácia em tempo real.</p>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full xl:w-auto">
                {/* Category Filter */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto hide-scrollbar">
                  <div className="flex items-center justify-center p-2 bg-slate-50 rounded-xl mr-2">
                     <Filter className="w-4 h-4 text-slate-400" />
                  </div>
                  {(['Todos', 'Medicamento', 'Material', 'Portaria 344'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="hidden sm:block w-px h-8 bg-slate-200 mx-2"></div>

                {/* Status Filter */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center justify-center p-2 bg-slate-50 rounded-xl">
                     <AlertCircle className="w-4 h-4 text-slate-400" />
                  </div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as AlertStatus | 'Todos')}
                    className="flex-1 sm:w-48 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-50 text-slate-700 border-none hover:bg-slate-100 focus:ring-2 focus:ring-emerald-500 transition-colors cursor-pointer outline-none"
                  >
                    <option value="Todos">Todos os Status</option>
                    <option value="OK">Estoque Normal (OK)</option>
                    <option value="VERIFICAR INVENTÁRIO">Verificar Inventário</option>
                    <option value="URGENTE!">Ruptura (Urgente!)</option>
                    <option value="REMANEJAR (VALIDADE)">Alerta de Validade</option>
                    <option value="PEDIR AO RECEBIMENTO">Abaixo do Mínimo</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Stats Grid Modernized */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <AlertCircle className="w-16 h-16 text-orange-600" />
                </div>
                <div className="relative z-10">
                  <div className="p-3 bg-orange-50 w-fit rounded-2xl mb-4">
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ruptura Urgente</p>
                  <p className="text-4xl font-black text-slate-900">{stats.critical}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Cobertura ≤ 3 dias e sem estoque</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-500/20">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((stats.critical / stats.total) * 100, 100)}%` }} />
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Activity className="w-16 h-16 text-red-600" />
                </div>
                <div className="relative z-10">
                  <div className="p-3 bg-red-50 w-fit rounded-2xl mb-4">
                    <Activity className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Divergência</p>
                  <p className="text-4xl font-black text-slate-900">{stats.warning}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Físico ≠ Sistema</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500/20">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((stats.warning / stats.total) * 100, 100)}%` }} />
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <FileSpreadsheet className="w-16 h-16 text-blue-600" />
                </div>
                <div className="relative z-10">
                  <div className="p-3 bg-blue-50 w-fit rounded-2xl mb-4">
                    <FileSpreadsheet className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Para Reposição</p>
                  <p className="text-4xl font-black text-slate-900">{stats.order}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Cobertura ≤ 7 dias</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500/20">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((stats.order / stats.total) * 100, 100)}%` }} />
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -4 }} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Clock className="w-16 h-16 text-yellow-600" />
                </div>
                <div className="relative z-10">
                  <div className="p-3 bg-yellow-50 w-fit rounded-2xl mb-4">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Risco Validade</p>
                  <p className="text-4xl font-black text-slate-900">{stats.expiry}</p>
                  <p className="text-xs text-slate-500 mt-2 font-medium">Vence em &lt;90 dias</p>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-yellow-500/20">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.min((stats.expiry / stats.total) * 100, 100)}%` }} />
                </div>
              </motion.div>
            </div>

            {/* Main Table Area */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Lista de Itens
                    {selectedCategory !== 'Todos' && <span className="text-emerald-600 ml-2 text-sm bg-emerald-50 px-2 py-1 rounded-lg">{selectedCategory}</span>}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Exibindo {displayData.length} itens correspondentes aos filtros.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {inventoryData !== MOCK_INVENTORY && (
                    <button 
                      onClick={handleResetData}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-xl"
                    >
                      Restaurar Dados Teste
                    </button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={exportToPDF}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors font-semibold shadow-md text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </motion.button>
                </div>
              </div>
              <InventoryTable products={displayData} onUpdateStock={handleUpdateStock} />
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="max-w-6xl mx-auto">
             <Dashboard data={displayData} />
          </div>
        )}

        {activeTab === 'dispensary' && (
          <div className="max-w-6xl mx-auto">
             <DispensaryAnalysis />
          </div>
        )}

        {activeTab === 'followup' && (
          <div className="max-w-6xl mx-auto">
            <FollowUp data={followUpData} onDataLoaded={handleFollowUpLoaded} />
          </div>
        )}

        {activeTab === 'genesis' && (
          <div className="max-w-6xl mx-auto">
            <AnalysePendencies />
          </div>
        )}

        {activeTab === 'previsibilidade' && (
          <div className="max-w-6xl mx-auto">
            <DashboardPrevisibilidade />
          </div>
        )}

        {activeTab === 'equivalencia' && (
          <div className="max-w-6xl mx-auto">
            <DashboardEquivalencia />
          </div>
        )}

        {activeTab === 'rastreio' && (
          <div className="w-full">
            <DashboardRastreio />
          </div>
        )}

        {activeTab === 'produtividade' && (
          <div className="max-w-6xl mx-auto">
            <DashboardProdutividade />
          </div>
        )}

        {activeTab === 'transfer' && (
          <div className="max-w-full mx-auto">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Requisição Interna de Transferência</h2>
              <p className="text-slate-500 text-sm">
                Geração automática de sugestão de pedido com base na cobertura de estoque e disponibilidade no estoque central (CSV).
                Utiliza a mesma lógica da Macro VBA (padrão 7 dias), com opção de ajuste.
              </p>
            </div>
            <TransferRequest products={displayData} />
          </div>
        )}

        {activeTab === 'import' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6">1. Importação de Consumo e Estoque</h2>
              <CsvUploader onDataLoaded={handleDataLoaded} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6">2. Importação de Validades (Opcional)</h2>
              <ValidityUploader onValidityLoaded={handleValidityLoaded} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6">3. Importação de Follow Up</h2>
              <FollowUpUploader onDataLoaded={handleFollowUpLoaded} />
            </div>
            
            <div className="bg-slate-100 p-6 rounded-xl mt-6">
              <h3 className="font-semibold text-slate-800 mb-2">Instruções</h3>
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-2">
                <li><strong>Passo 1:</strong> Importe o arquivo de Consumo Diário (CSV padrão).</li>
                <li><strong>Passo 2:</strong> Importe o arquivo de Relatório de Validades (CSV complexo).</li>
                <li><strong>Passo 3:</strong> Importe o arquivo de Follow Up para monitorar pedidos.</li>
                <li>O sistema irá cruzar os dados pelo <strong>ID do produto</strong>.</li>
                <li>Será considerada a data de validade <strong>mais próxima</strong> (FEFO).</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'vba' && (
          <div className="max-w-4xl mx-auto">
            <VBACodeDisplay />
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;

