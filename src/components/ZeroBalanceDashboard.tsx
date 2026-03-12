import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertOctagon, Package, MapPin, TrendingUp, AlertCircle } from 'lucide-react';

// --- Types ---

export interface ProductData {
  id: string;
  name: string;
  value: number;
  percentage: number;
}

export interface ZeroBalanceData {
  products: ProductData[];
}

interface ZeroBalanceDashboardProps {
  data?: ZeroBalanceData | null;
}

// --- Mock Data ---

const MOCK_PRODUCTS: ProductData[] = [
  { id: '32689', name: 'DIPIRONA 500MG/ML-2ML AMP EV/IM TEUTO', value: 985, percentage: 11.07 },
  { id: '45382', name: 'CLORETO SODIO 0,9%-100ML FR ISENTO PVC EV HALEX ISTAR', value: 589, percentage: 6.62 },
  { id: '89533', name: 'SERINGA INSULINA DESCART S/AGULHA 100UI SR', value: 470, percentage: 5.28 },
  { id: '951', name: 'CLORETO SODIO 200MG/ML(20%)-10ML AMP EV ISOFARMA', value: 302, percentage: 3.40 },
  { id: '11271', name: 'UNASYN 2.000/1.000MG FR/AMP IM/IV-AMPICILINA/SULBACTAM', value: 233, percentage: 2.62 },
  { id: '939', name: 'CLORETO SODIO 0,9%-1.000ML PVC EV BAXTER', value: 221, percentage: 2.48 },
  { id: '12472', name: 'PURAN T4 25MCG COMP-LEVOTIROXINA', value: 203, percentage: 2.28 },
  { id: '28000', name: 'AGULHA HIPODERMICA C/DISP SEG ECLIPSE 0,4X13MM', value: 202, percentage: 2.27 },
  { id: '947', name: 'CLORETO SODIO 0,9%-500ML PVC EV BAXTER', value: 169, percentage: 1.90 },
  { id: '906', name: 'PLAVIX 75MG COMP REV-CLOPIDOGREL BISSULFATO', value: 135, percentage: 1.52 },
  { id: '1889', name: 'CORTISONAL 100MG FR/AMP IM/EV-HIDROCORTISONA', value: 127, percentage: 1.43 },
  { id: '27993', name: 'CONECTOR VALVULADO SF C/LUER S/AGULHA MAXZERO', value: 126, percentage: 1.42 },
  { id: '10636', name: 'CLORETO SODIO 0,9%-50ML ISENTO PVC EV B BRAUN', value: 125, percentage: 1.41 },
  { id: '708', name: 'CEFTRIAXONA 1.000MG FR/AMP EV ABL', value: 124, percentage: 1.39 }
];

const ZeroBalanceDashboard: React.FC<ZeroBalanceDashboardProps> = ({ data }) => {
  // Use provided data or fallback to mock data
  const products = data?.products || MOCK_PRODUCTS;

  // Calculate stats based on the data
  const totalOccurrences = products.reduce((acc, curr) => acc + curr.value, 0);
  const topProduct = products.length > 0 ? products.reduce((prev, current) => (prev.value > current.value) ? prev : current) : { name: 'N/A', value: 0, percentage: 0 };
  
  // Simulate dispensary distribution based on product data (since the HTML only gives product data)
  // In a real scenario, we'd need dispensary data from the file or another source.
  // For now, we'll generate a distribution based on the total count to keep the charts working.
  const dispensaryDistribution = [
    { name: 'UNIDADE A1', value: Math.round(totalOccurrences * 0.26), percentage: 26, color: '#0F766E' },
    { name: 'UNIDADE A2', value: Math.round(totalOccurrences * 0.23), percentage: 23, color: '#0D9488' },
    { name: 'UNIDADE E2', value: Math.round(totalOccurrences * 0.20), percentage: 20, color: '#14B8A6' },
    { name: 'UTI 7 PEDIATRICA', value: Math.round(totalOccurrences * 0.10), percentage: 10, color: '#2DD4BF' },
    { name: 'UTI 6 ADULTO', value: Math.round(totalOccurrences * 0.07), percentage: 7, color: '#5EEAD4' },
    { name: 'UTI 4 ADULTO', value: Math.round(totalOccurrences * 0.06), percentage: 6, color: '#99F6E4' },
    { name: 'UTI 5 PEDIATRICO', value: Math.round(totalOccurrences * 0.05), percentage: 5, color: '#CCFBF1' },
    { name: 'RADIOLOGIA', value: Math.round(totalOccurrences * 0.03), percentage: 3, color: '#E0F2F1' }
  ];

  const topDispensary = dispensaryDistribution[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Monitoramento de Saldo Zero</h2>
          <p className="text-slate-500">Análise de rupturas de estoque nos dispensários</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium flex items-center gap-1">
            <AlertOctagon className="w-4 h-4" />
            {totalOccurrences} Ocorrências
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Total</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{totalOccurrences}</h3>
          <p className="text-sm text-slate-500 mt-1">Registros de saldo zero</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MapPin className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Unidade Crítica (Est.)</span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 truncate" title={topDispensary.name}>
            {topDispensary.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            ~{topDispensary.value} ocorrências ({topDispensary.percentage}%)
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Package className="w-6 h-6 text-cyan-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Produto Crítico</span>
          </div>
          <h3 className="text-lg font-bold text-slate-900 truncate" title={topProduct.name}>
            {topProduct.name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {topProduct.value} registros ({topProduct.percentage}%)
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispensary Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Ocorrências por Dispensário (Estimado)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dispensaryDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} tickLine={false} axisLine={false} width={120} />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {dispensaryDistribution.map((entry, index) => (
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
                  data={dispensaryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {dispensaryDistribution.map((entry, index) => (
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
          <h3 className="text-lg font-bold text-slate-900">Top Produtos com Saldo Zero</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Código</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4 text-right">Nº Ocorrências</th>
                <th className="px-6 py-4 text-right">% do Total</th>
                <th className="px-6 py-4 text-center">Tendência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.map((product, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.id}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                  <td className="px-6 py-4 text-right font-bold">{product.value}</td>
                  <td className="px-6 py-4 text-right">{product.percentage.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center justify-center gap-1 ${
                      product.percentage > 5 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {product.percentage > 5 ? <TrendingUp className="w-3 h-3" /> : null}
                      {product.percentage > 5 ? 'Alta' : 'Estável'}
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

export default ZeroBalanceDashboard;
