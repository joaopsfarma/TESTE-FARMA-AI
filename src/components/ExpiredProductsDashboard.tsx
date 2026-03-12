import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Package, MapPin, AlertCircle } from 'lucide-react';

// --- Mock Data ---

const EXPIRED_STATS = {
  total: 212,
  topDispensary: { name: 'UNIDADE E2', value: 70, percentage: 33.02 },
  topProduct: { name: 'GLICOSE 500MG/ML(50%)-10ML', value: 146, percentage: 68.87 }
};

const EXPIRED_BY_DISPENSARY = [
  { name: 'UNIDADE E2', value: 70, percentage: 33.02, color: '#DC2626' },
  { name: 'UNIDADE A2', value: 42, percentage: 19.81, color: '#EA580C' },
  { name: 'UTI 7 PEDIATRICA', value: 37, percentage: 17.45, color: '#D97706' },
  { name: 'UTI 5 PEDIATRICO', value: 36, percentage: 16.98, color: '#D97706' },
  { name: 'UNIDADE A1', value: 25, percentage: 11.79, color: '#CA8A04' },
  { name: 'UTI 4 ADULTO', value: 2, percentage: 0.94, color: '#16A34A' }
];

const EXPIRED_PRODUCTS = [
  { id: '1791', name: 'GLICOSE 500MG/ML(50%)-10ML AMP EV ISOFARMA', value: 146, percentage: 68.87 },
  { id: '919', name: 'CLORETO POTASSIO 100MG/ML(10%)-10ML AMP OCTOG EV ISOFARMA', value: 38, percentage: 17.92 },
  { id: '32420', name: 'CIPROFLOXACINO 2MG/ML-200ML(400MG) BOLSA SF IV HALEX ISTAR', value: 10, percentage: 4.72 },
  { id: '37516', name: 'CLORETO SODIO 0,9%-50ML PVC EV BAXTER', value: 8, percentage: 3.77 },
  { id: '1784', name: 'GLUCONATO CALCIO 100MG/ML(10%)-10ML AMP EV ISOFARMA', value: 7, percentage: 3.30 },
  { id: '3605', name: 'DIOVAN 80MG COMP REV-VALSARTANA', value: 3, percentage: 1.42 }
];

const ExpiredProductsDashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Monitoramento de Vencidos</h2>
          <p className="text-slate-500">Análise de produtos vencidos retirados dos dispensários em Fev/2026</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            {EXPIRED_STATS.total} Ocorrências
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-rose-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Total</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{EXPIRED_STATS.total}</h3>
          <p className="text-sm text-slate-500 mt-1">Produtos vencidos identificados</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MapPin className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Unidade Crítica</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 truncate" title={EXPIRED_STATS.topDispensary.name}>
            {EXPIRED_STATS.topDispensary.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {EXPIRED_STATS.topDispensary.value} ocorrências ({EXPIRED_STATS.topDispensary.percentage}%)
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Produto Crítico</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 truncate" title={EXPIRED_STATS.topProduct.name}>
            {EXPIRED_STATS.topProduct.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {EXPIRED_STATS.topProduct.value} unidades ({EXPIRED_STATS.topProduct.percentage}%)
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispensary Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Ocorrências por Dispensário</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EXPIRED_BY_DISPENSARY} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} width={120} />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {EXPIRED_BY_DISPENSARY.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Distribuição Percentual</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={EXPIRED_BY_DISPENSARY}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {EXPIRED_BY_DISPENSARY.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Detalhamento por Produto</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4 text-right">Nº Ocorrências</th>
                <th className="px-6 py-4 text-right">% do Total</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {EXPIRED_PRODUCTS.map((product, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                  <td className="px-6 py-4 text-right font-bold">{product.value}</td>
                  <td className="px-6 py-4 text-right">{product.percentage.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      product.percentage > 15 
                        ? 'bg-red-100 text-red-700' 
                        : product.percentage > 5 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-slate-100 text-slate-700'
                    }`}>
                      {product.percentage > 15 ? 'Crítico' : product.percentage > 5 ? 'Atenção' : 'Monitorar'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpiredProductsDashboard;
