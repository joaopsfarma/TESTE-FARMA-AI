import React, { useState, useMemo } from 'react';
import { ProcessedProduct } from '../types';
import { TransferCsvUploader } from './TransferCsvUploader';
import { MovementCsvUploader, MovementData } from './MovementCsvUploader';
import { Download, Settings, RefreshCw, ArrowRightLeft, Package, Calendar, AlertTriangle, Activity, TrendingUp, ShoppingCart, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import clsx from 'clsx';

interface TransferRequestProps {
  products: ProcessedProduct[];
}

interface BatchInfo {
  batch: string;
  validity: string;
  qty: number;
  originalQty?: number;
}

interface SuggestionItem {
  id: string;
  name: string;
  localStock: number;
  averageConsumption: number;
  coverageDays: number;
  suggestedQty: number;
  centralStock: number;
  status: 'critical' | 'warning' | 'ok';
  productStatus: string;
  allocatedBatches: BatchInfo[];
}

export const TransferRequest: React.FC<TransferRequestProps> = ({ products }) => {
  // Central Stock (Source) - Map<ID, Array<{batch, validity, qty}>>
  const [centralStock, setCentralStock] = useState<Map<string, BatchInfo[]> | null>(null);
  
  // Destination Stock (Target) - Map<ID, Array<{batch, validity, qty}>>
  const [destinationStock, setDestinationStock] = useState<Map<string, BatchInfo[]> | null>(null);
  
  // Movement Data (Consumption and Current Stock)
  const [movementData, setMovementData] = useState<Map<string, MovementData> | null>(null);
  const [movementDays, setMovementDays] = useState<number>(30); // Default period for movement data
  
  const [daysToCover, setDaysToCover] = useState<number>(7); // Default to 7 days

  const suggestions = useMemo(() => {
    if (!centralStock) return [];

    const items: SuggestionItem[] = [];

    products.forEach(item => {
      // Determine Local Stock (Destination) and Average Consumption
      let currentLocalStock = item.physicalStock;
      let avgConsumption = item.dailyConsumption;
      
      // If Movement Data is loaded, it overrides both stock and consumption
      if (movementData && movementData.has(item.id)) {
        const mov = movementData.get(item.id)!;
        currentLocalStock = mov.currentStock;
        avgConsumption = mov.consumption / movementDays;
      } else {
        // Fallback to Destination CSV for stock if loaded
        if (destinationStock && destinationStock.size > 0) {
          const destBatches = destinationStock.get(item.id);
          if (destBatches) {
            currentLocalStock = destBatches.reduce((acc, b) => acc + b.qty, 0);
          } else {
            // If item exists in inventory but not in destination CSV, assume 0 stock
            currentLocalStock = 0;
          }
        }
      }
      
      // Calculate coverage
      const coverageDays = avgConsumption > 0 ? currentLocalStock / avgConsumption : 999;

      // Logic: Suggest if coverage < Target
      if (coverageDays <= daysToCover) {
        // Cálculo da Necessidade igual à Macro VBA: (Consumo * Dias * 1.20) - Estoque Atual
        // O fator 1.20 adiciona uma margem de segurança de 20%
        const targetStock = avgConsumption * daysToCover * 1.2;
        let neededQty = Math.ceil(targetStock - currentLocalStock);
        neededQty = Math.max(0, neededQty);
        
        if (neededQty > 0) {
          // Check Central Stock (Source)
          const sourceBatches = centralStock.get(item.id);
          
          if (sourceBatches && sourceBatches.length > 0) {
             // Calculate total available in central
             const totalCentral = sourceBatches.reduce((acc, b) => acc + b.qty, 0);
             
             // Allocate from batches (FEFO - First Expired First Out)
             // Sort batches by validity (ascending)
             const sortedBatches = [...sourceBatches].sort((a, b) => {
               const dateA = a.validity.split('/').reverse().join('-');
               const dateB = b.validity.split('/').reverse().join('-');
               return new Date(dateA).getTime() - new Date(dateB).getTime();
             });
             
             let remainingNeed = neededQty;
             const allocated: BatchInfo[] = [];
             
             for (const batch of sortedBatches) {
               if (remainingNeed <= 0) break;
               if (batch.qty <= 0) continue;
               
               const take = Math.min(remainingNeed, batch.qty);
               allocated.push({
                 batch: batch.batch,
                 validity: batch.validity,
                 qty: take,
                 originalQty: batch.qty
               });
               remainingNeed -= take;
             }
             
             const totalAllocated = allocated.reduce((acc, b) => acc + b.qty, 0);

             if (totalAllocated > 0) {
                items.push({
                  id: item.id,
                  name: item.name,
                  localStock: currentLocalStock,
                  averageConsumption: avgConsumption,
                  coverageDays: coverageDays,
                  suggestedQty: totalAllocated,
                  centralStock: totalCentral,
                  status: coverageDays <= (daysToCover / 2) ? 'critical' : 'warning',
                  productStatus: item.status,
                  allocatedBatches: allocated
                });
             }
          }
        }
      }
    });

    return items.sort((a, b) => a.coverageDays - b.coverageDays);
  }, [products, centralStock, destinationStock, daysToCover]);

  const kpis = useMemo(() => {
    if (suggestions.length === 0) return null;
    
    const uniqueProducts = suggestions.length;
    const totalUnits = suggestions.reduce((acc, curr) => acc + curr.suggestedQty, 0);
    const criticalItems = suggestions.filter(s => s.status === 'critical').length;
    const lowStockOriginCount = suggestions.filter(s => 
      s.allocatedBatches.some(b => b.originalQty !== undefined && b.originalQty < 100)
    ).length;

    return { uniqueProducts, totalUnits, criticalItems, lowStockOriginCount };
  }, [suggestions]);

  const topVolumes = useMemo(() => {
    if (suggestions.length === 0) return [];
    return [...suggestions].sort((a, b) => b.suggestedQty - a.suggestedQty).slice(0, 5);
  }, [suggestions]);

  const topCriticals = useMemo(() => {
    if (suggestions.length === 0) return [];
    return [...suggestions].sort((a, b) => a.coverageDays - b.coverageDays).slice(0, 5);
  }, [suggestions]);

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    // Colors
    const colors = {
      primary: [79, 70, 229] as [number, number, number], // Indigo 600
      slate800: [30, 41, 59] as [number, number, number],
      slate500: [100, 116, 139] as [number, number, number],
      lightGray: [248, 250, 252] as [number, number, number],
      border: [226, 232, 240] as [number, number, number],
      amber: [245, 158, 11] as [number, number, number],
      red: [220, 38, 38] as [number, number, number],
    };

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(colors.slate800[0], colors.slate800[1], colors.slate800[2]);
    doc.text('Requisição de Transferência', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.slate500[0], colors.slate500[1], colors.slate500[2]);
    
    const dateStr = new Date().toLocaleDateString('pt-BR', { 
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    // A4 Landscape width is 297mm. 297 - 14 (margin) = 283
    doc.text(dateStr, 283, 15, { align: 'right' });
    doc.text(`Meta: ${daysToCover} dias de cobertura`, 283, 20, { align: 'right' });

    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.5);
    doc.line(14, 25, 283, 25);

    // Data Preparation
    const tableBody = suggestions.flatMap(item => 
      item.allocatedBatches.map((batch, index) => ({
        id: item.id,
        name: item.name,
        alert: item.productStatus,
        localStock: item.localStock.toLocaleString('pt-BR'),
        avgConsumption: item.averageConsumption.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        coverage: `${item.coverageDays.toFixed(1)} dias`,
        batch: batch.batch,
        validity: batch.validity,
        qty: batch.qty.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
        totalQty: item.suggestedQty.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
        // Hidden data for styling and rowSpan
        rawQty: batch.qty,
        originalQty: batch.originalQty,
        isLowStock: batch.originalQty !== undefined && batch.originalQty < 100,
        isFirst: index === 0,
        batchCount: item.allocatedBatches.length
      }))
    );

    // Table
    autoTable(doc, {
      startY: 35,
      body: tableBody,
      columns: [
        { header: 'ID', dataKey: 'id' },
        { header: 'PRODUTO', dataKey: 'name' },
        { header: 'ALERTA', dataKey: 'alert' },
        { header: 'EST. DESTINO', dataKey: 'localStock' },
        { header: 'CDM', dataKey: 'avgConsumption' },
        { header: 'COBERTURA', dataKey: 'coverage' },
        { header: 'LOTE', dataKey: 'batch' },
        { header: 'VALIDADE', dataKey: 'validity' },
        { header: 'QTD. LOTE', dataKey: 'qty' },
        { header: 'TOTAL', dataKey: 'totalQty' },
      ],
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9, 
        cellPadding: 3,
        textColor: colors.slate800,
        lineColor: colors.border,
        lineWidth: { bottom: 0.1 },
        valign: 'middle'
      },
      headStyles: {
        fillColor: colors.lightGray,
        textColor: colors.slate500,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
        lineWidth: { bottom: 0.5 },
      },
      columnStyles: {
        id: { cellWidth: 20 },
        name: { cellWidth: 'auto' },
        alert: { cellWidth: 30, textColor: colors.red, fontSize: 8 },
        localStock: { cellWidth: 20, halign: 'right' },
        avgConsumption: { cellWidth: 20, halign: 'right' },
        coverage: { cellWidth: 20, halign: 'center' },
        batch: { cellWidth: 25, halign: 'right' },
        validity: { cellWidth: 25, halign: 'right' },
        qty: { cellWidth: 20, halign: 'right' },
        totalQty: { cellWidth: 20, halign: 'right', fontStyle: 'bold', textColor: colors.primary }
      },
      didParseCell: (data) => {
        const row = data.row.raw as any;
        
        // Handle RowSpan for grouped columns
        if (['id', 'name', 'alert', 'localStock', 'avgConsumption', 'coverage', 'totalQty'].includes(data.column.dataKey as string)) {
          if (row.isFirst) {
            data.cell.rowSpan = row.batchCount;
          } else {
            // Hide cell content for subsequent rows
            data.cell.styles.fontSize = 0;
            data.cell.text = [];
          }
        }

        // Style specific cells
        if (data.section === 'body') {
          if (data.column.dataKey === 'qty' && row.isLowStock) {
             data.cell.styles.textColor = colors.amber;
          }
        }
      }
    });

    // Footer & Page Numbers
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(colors.slate500[0], colors.slate500[1], colors.slate500[2]);
        doc.text(`Página ${i} de ${pageCount}`, 283, 200, { align: 'right' });
    }
    
    // Legend for Low Stock
    const hasLowStock = tableBody.some(r => r.isLowStock);
    if (hasLowStock) {
        const finalY = (doc as any).lastAutoTable.finalY;
        if (finalY) {
            if (finalY > 190) {
              doc.addPage();
              doc.text('* Quantidade em laranja indica estoque baixo na origem (< 100 un)', 14, 20);
            } else {
              doc.setTextColor(colors.amber[0], colors.amber[1], colors.amber[2]);
              doc.text('* Quantidade em laranja indica estoque baixo na origem (< 100 un)', 14, finalY + 10);
            }
        }
    }

    doc.save(`sugestao-transferencia-${daysToCover}dias.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
           <ArrowRightLeft className="w-32 h-32 text-indigo-600" />
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              Requisição
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-2 max-w-2xl">
              Gere sugestões de pedido com base no consumo local e disponibilidade. <br />
              <span className="text-indigo-600 font-bold">Lógica Macro VBA ativada:</span> Adiciona 20% de margem à necessidade.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
          <TransferCsvUploader 
            title="1. Estoque Solicitado (Origem)"
            onStockLoaded={setCentralStock} 
          />
          <TransferCsvUploader 
            title="2. Estoque Farmácia (Destino)"
            onStockLoaded={setDestinationStock} 
          />
          <MovementCsvUploader 
            title="3. Movimentações (Opcional)"
            onDataLoaded={setMovementData}
          />
        </div>

        <div className="flex flex-wrap gap-6 items-center justify-between bg-slate-50 p-6 rounded-2xl border border-slate-200 relative z-10">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meta de Cobertura</label>
              <select 
                value={daysToCover}
                onChange={(e) => setDaysToCover(Number(e.target.value))}
                className="text-sm font-bold bg-white text-slate-800 border border-slate-300 rounded-xl px-4 py-2 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-shadow outline-none"
              >
                <option value={7}>7 Dias</option>
                <option value={15}>15 Dias</option>
                <option value={30}>30 Dias</option>
                <option value={45}>45 Dias</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Período de Consumo</label>
              <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-200 transition-shadow">
                <input 
                  type="number"
                  min="1"
                  value={movementDays}
                  onChange={(e) => setMovementDays(Number(e.target.value) || 30)}
                  className="w-12 text-sm font-bold text-slate-800 outline-none text-center bg-transparent"
                />
                <span className="text-sm font-medium text-slate-500">dias</span>
              </div>
            </div>
            
            <div className="hidden lg:flex flex-col gap-1 pl-6 border-l border-slate-200">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status das Fontes</span>
              <div className="flex gap-2 mt-1">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${centralStock && centralStock.size > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                  Origem
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${destinationStock && destinationStock.size > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                  Destino
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${movementData && movementData.size > 0 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}>
                  Consumo
                </span>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportToPDF}
            disabled={suggestions.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md font-bold disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
          >
            <Download className="w-4 h-4" />
            Exportar Sugestão (PDF)
          </motion.button>
        </div>
      </div>

      {/* FAQs Dinâmicos de Requisição */}
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
                <Package className="w-16 h-16 text-indigo-600" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Itens Únicos</span>
              </div>
              <p className="text-3xl font-black text-slate-800">{kpis.uniqueProducts}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Tipos de Produtos</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <ShoppingCart className="w-16 h-16 text-emerald-600" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volume Total</span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-black text-slate-800">{kpis.totalUnits.toLocaleString('pt-BR')}</p>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">Unidades Solicitadas</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <AlertCircle className="w-16 h-16 text-red-600" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Urgentes</span>
              </div>
              <p className="text-3xl font-black text-slate-800">{kpis.criticalItems}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Cobertura &le; {Math.floor(daysToCover/2)} dias</p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                <AlertTriangle className="w-16 h-16 text-amber-600" />
              </div>
              <div className="relative z-10 flex items-center justify-between mb-2">
                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Origem Baixa</span>
              </div>
              <p className="text-3xl font-black text-slate-800">{kpis.lowStockOriginCount}</p>
              <p className="text-xs font-semibold text-slate-500 mt-1">Produtos &lt; 100 un. na Central</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insights Section */}
      <AnimatePresence>
        {(topVolumes.length > 0 || topCriticals.length > 0) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Top Volumes */}
            {topVolumes.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
                <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                  Top 5 Maiores Volumes Solicitados
                </h2>
                <div className="space-y-3 flex-1">
                  {topVolumes.map((p, index) => {
                    const maxQt = topVolumes[0].suggestedQty;
                    const pct = Math.max(5, (p.suggestedQty / maxQt) * 100);
                    return (
                      <div key={p.id} className="flex flex-col gap-1">
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-semibold text-slate-700 truncate pr-2" title={p.name}>
                            {index + 1}. {p.name}
                          </span>
                          <span className="font-black text-slate-900">{p.suggestedQty.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-medium">UN</span></span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.1 * index }}
                            className="h-full rounded-full bg-emerald-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Críticos */}
            {topCriticals.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 overflow-hidden flex flex-col">
                <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Top 5 Mais Críticos (Menor Cobertura)
                </h2>
                <div className="space-y-3 flex-1">
                  {topCriticals.map((s, index) => {
                    const maxDays = daysToCover;
                    const pct = Math.max(5, 100 - (Math.min(s.coverageDays, maxDays) / maxDays) * 100);
                    // Aqui a barra reflete o quão "pouco" estoque tem (maior barra = mais grave)
                    return (
                      <div key={s.id} className="flex flex-col gap-1">
                        <div className="flex justify-between items-end text-sm">
                          <span className="font-semibold text-slate-700 truncate pr-2" title={s.name}>
                            {index + 1}. {s.name}
                          </span>
                          <span className="font-black text-slate-900">{s.coverageDays.toFixed(1)} <span className="text-[10px] text-slate-400 font-medium">DIAS</span></span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.1 * index }}
                            className={clsx(
                              "h-full rounded-full",
                              s.status === 'critical' ? 'bg-red-500' : 'bg-amber-400'
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

      <AnimatePresence mode="wait">
        {suggestions.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
          >
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">Produto</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-center">Estoque Destino</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-center">CDM</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-center">Cobertura</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">Lote Solicitado</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">Validade</th>
                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-right">Qtd Lote</th>
                    <th className="px-6 py-4 font-bold text-indigo-500 uppercase tracking-wider text-[10px] bg-indigo-50/30 text-right">Total Solicitado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {suggestions.map((item) => (
                    <React.Fragment key={item.id}>
                      {item.allocatedBatches.map((batch, index) => (
                        <tr key={`${item.id}-${batch.batch}-${index}`} className="group hover:bg-slate-50/80 transition-colors">
                          {index === 0 ? (
                            <>
                              <td className="px-6 py-4" rowSpan={item.allocatedBatches.length}>
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-slate-900 max-w-[250px] truncate" title={item.name}>{item.name}</span>
                                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded w-fit">ID: {item.id}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center font-mono font-bold text-slate-600 bg-slate-50/30" rowSpan={item.allocatedBatches.length}>
                                {item.localStock.toLocaleString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 text-center font-mono text-slate-500" rowSpan={item.allocatedBatches.length}>
                                {item.averageConsumption.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4 text-center" rowSpan={item.allocatedBatches.length}>
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                  item.status === 'critical' ? 'bg-red-50 text-red-600 border-red-200 shadow-sm shadow-red-100' : 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm shadow-amber-100'
                                }`}>
                                  {item.coverageDays.toFixed(1)} dias
                                </span>
                              </td>
                            </>
                          ) : null}
                          <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-500">
                              <Package className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-mono text-xs">{batch.batch}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-medium text-xs">{batch.validity}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {batch.originalQty !== undefined && batch.originalQty < 100 && (
                                <div className="group/tooltip relative flex items-center">
                                  <AlertTriangle className="w-4 h-4 text-amber-500 cursor-help animate-pulse" />
                                  <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block w-48 bg-slate-800 text-white text-xs p-2.5 rounded-xl shadow-xl z-10 text-center font-medium">
                                    Baixa disp. na origem: <strong className="text-amber-400">{batch.originalQty}</strong> un.
                                  </div>
                                </div>
                              )}
                              <span className="font-mono font-medium text-slate-700">{batch.qty.toLocaleString('pt-BR')}</span>
                            </div>
                          </td>
                          {index === 0 ? (
                            <td className="px-6 py-4 text-right font-mono font-black text-indigo-600 bg-indigo-50/20 text-lg group-hover:bg-indigo-50/40 transition-colors" rowSpan={item.allocatedBatches.length}>
                              {item.suggestedQty.toLocaleString('pt-BR')}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white p-16 rounded-3xl border border-dashed border-slate-300 text-center"
          >
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-100">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Aguardando Dados</h3>
            <p className="text-slate-500 max-w-md mx-auto font-medium">
              Importe os arquivos CSV acima para gerar as sugestões de reposição.
              <br/><br/>
              <span className="text-xs text-slate-400 block p-4 bg-slate-50 rounded-2xl border border-slate-100">
                Se os dados já foram importados, nenhum item está abaixo da meta de {daysToCover} dias. O estoque está saudável!
              </span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
