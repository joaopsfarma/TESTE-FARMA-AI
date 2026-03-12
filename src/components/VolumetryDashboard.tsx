import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { Activity, Clock, ArrowDownLeft, Package, TrendingUp, AlertCircle } from 'lucide-react';

// --- Mock Data ---

const hourlyData = [
  { hour: '00', count: 2963 },
  { hour: '01', count: 2800 },
  { hour: '02', count: 3396 },
  { hour: '03', count: 2800 },
  { hour: '04', count: 3271 },
  { hour: '05', count: 3000 },
  { hour: '06', count: 2077 },
  { hour: '07', count: 22001 },
  { hour: '08', count: 11199 },
  { hour: '09', count: 4447 },
  { hour: '10', count: 4500 },
  { hour: '11', count: 5139 },
  { hour: '12', count: 3604 },
  { hour: '13', count: 3800 },
  { hour: '14', count: 5573 },
  { hour: '15', count: 8732 },
  { hour: '16', count: 6670 },
  { hour: '17', count: 4396 },
  { hour: '18', count: 3000 },
  { hour: '19', count: 17635 },
  { hour: '20', count: 9989 },
  { hour: '21', count: 4545 },
  { hour: '22', count: 5374 },
  { hour: '23', count: 5000 }
];

const operationsData = [
  { name: 'Retirada Assistida', value: 80468, color: '#C0392B' },
  { name: 'Retirada Avulsa', value: 64961, color: '#F39C12' },
  { name: 'Devolução', value: 9575, color: '#0E668B' },
  { name: 'Retirada Conferida', value: 393, color: '#95A5A6' },
  { name: 'Ret. Conf. Fora Horário', value: 156, color: '#7F8C8D' }
];

const returnsTrendData = [
  { month: 'Nov/25', value: 10239 },
  { month: 'Dez/25', value: 10037 },
  { month: 'Jan/26', value: 9525 },
  { month: 'Fev/26', value: 9575 }
];

const returnsByDispensary = [
  { name: 'UTI 4 ADULTO', value: 407 },
  { name: 'DISP 2', value: 451 },
  { name: 'DISP 3', value: 780 },
  { name: 'DISP 4', value: 1139 },
  { name: 'DISP 5', value: 1193 },
  { name: 'DISP 6', value: 1370 },
  { name: 'DISP 7', value: 1894 },
  { name: 'DISP 8', value: 2341 }
];

const VolumetryDashboard: React.FC = () => {
  const totalMovements = operationsData.reduce((acc, curr) => acc + curr.value, 0);
  const assistidaPercentage = ((operationsData[0].value / totalMovements) * 100).toFixed(1);
  const avulsaPercentage = ((operationsData[1].value / totalMovements) * 100).toFixed(1);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Volumetria de Movimentações</h2>
          <p className="text-slate-500">Análise detalhada de retiradas e devoluções em Fevereiro/2026</p>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            Total: {totalMovements.toLocaleString()}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Maior Volume</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{operationsData[0].value.toLocaleString()}</h3>
          <p className="text-sm text-slate-500 mt-1">Retirada Assistida ({assistidaPercentage}%)</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Atenção</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{operationsData[1].value.toLocaleString()}</h3>
          <p className="text-sm text-slate-500 mt-1">Retirada Avulsa ({avulsaPercentage}%)</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Pico Diário</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">07:00</h3>
          <p className="text-sm text-slate-500 mt-1">22.001 movimentos/hora</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <ArrowDownLeft className="w-6 h-6 text-cyan-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Estável
            </span>
          </div>
          <h3 className="text-3xl font-bold text-slate-900">{operationsData[2].value.toLocaleString()}</h3>
          <p className="text-sm text-slate-500 mt-1">Devoluções no Mês</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Distribuição Horária de Retiradas</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0E668B" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0E668B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="hour" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0E668B' }}
                />
                <Area type="monotone" dataKey="count" stroke="#0E668B" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#0E668B]"></span>
              Picos às 07h e 19h (Troca de Plantão)
            </div>
          </div>
        </div>

        {/* Operations Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Movimentos por Tipo de Operação</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={operationsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {operationsData.map((entry, index) => (
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Returns Trend */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Evolução de Devoluções</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={returnsTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#0E668B" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Returns by Dispensary */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Devoluções por Dispensário (Top 8)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={returnsByDispensary} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} width={100} />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#0E668B" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolumetryDashboard;
