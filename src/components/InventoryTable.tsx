import React from 'react';
import { ProcessedProduct, AlertStatus, ProductCategory } from '../types';
import { AlertTriangle, CheckCircle, Clock, Truck, AlertOctagon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryTableProps {
  products: ProcessedProduct[];
  onUpdateStock: (id: string, unit: string, newStock: number) => void;
}

const getCategoryColor = (category: ProductCategory) => {
  switch (category) {
    case 'Portaria 344': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Material': return 'bg-slate-50 text-slate-700 border-slate-200';
    default: return 'bg-blue-50 text-blue-700 border-blue-200';
  }
};

const getStatusColor = (status: AlertStatus) => {
  switch (status) {
    case 'VERIFICAR INVENTÁRIO': return 'bg-red-50 text-red-700 border-red-200 shadow-sm shadow-red-100';
    case 'URGENTE!': return 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm shadow-orange-100';
    case 'REMANEJAR (VALIDADE)': return 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm shadow-yellow-100';
    case 'PEDIR AO RECEBIMENTO': return 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100';
    default: return 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100';
  }
};

const getStatusIcon = (status: AlertStatus) => {
  switch (status) {
    case 'VERIFICAR INVENTÁRIO': return <AlertOctagon className="w-4 h-4 animate-pulse" />;
    case 'URGENTE!': return <AlertTriangle className="w-4 h-4 animate-pulse text-orange-600" />;
    case 'REMANEJAR (VALIDADE)': return <Clock className="w-4 h-4" />;
    case 'PEDIR AO RECEBIMENTO': return <Truck className="w-4 h-4" />;
    default: return <CheckCircle className="w-4 h-4" />;
  }
};

const getActionDescription = (status: AlertStatus) => {
  switch (status) {
    case 'VERIFICAR INVENTÁRIO': return 'Ajustar saldo no sistema ou justificar divergência.';
    case 'URGENTE!': return 'Risco iminente de falta! Acionar compras ou empréstimo.';
    case 'REMANEJAR (VALIDADE)': return 'Transferir para unidade de maior consumo imediatamente.';
    case 'PEDIR AO RECEBIMENTO': return 'Solicitar reposição ao estoque central (501/561).';
    default: return 'Estoque regular. Acompanhar consumo.';
  }
};

export const InventoryTable: React.FC<InventoryTableProps> = ({ products, onUpdateStock }) => {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">Produto</th>
            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">Categoria</th>
            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-right">Sistema</th>
            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-right">CDM (30d)</th>
            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-right">Cobertura</th>
            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-right">Validade</th>
            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50 text-right">Lote</th>
            <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">Status / Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          <AnimatePresence>
            {products.map((product, index) => (
              <motion.tr 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.05, 0.5) }}
                key={`${product.id}-${product.unit}`} 
                className="group hover:bg-slate-50/80 transition-all duration-200"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs flex-shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all border border-slate-200 group-hover:border-slate-300">
                      {product.name.substring(0, 2)}
                    </div>
                    <span className="font-semibold text-slate-900 line-clamp-2">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${getCategoryColor(product.category)}`}>
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                    {product.systemStock}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-mono text-slate-600">{product.dailyConsumption.toFixed(1)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono font-bold ${product.coverageDays < 7 ? 'text-orange-600' : 'text-slate-700'}`}>
                      {product.coverageDays > 900 ? '∞' : product.coverageDays.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-slate-400">dias</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium text-slate-700">
                      {new Date(product.expiryDate).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`text-[10px] font-bold ${product.daysToExpiry < 90 ? 'text-yellow-600' : 'text-slate-400'}`}>
                      {product.daysToExpiry} dias
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-mono text-slate-500 text-xs">
                  {product.batch || '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col items-start gap-1.5">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${getStatusColor(product.status)}`}>
                      {getStatusIcon(product.status)}
                      {product.status}
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium max-w-[200px] leading-tight opacity-70 group-hover:opacity-100 transition-opacity">
                      {getActionDescription(product.status)}
                    </span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
};
