import React, { useState } from 'react';
import { Upload, Folder, AlertTriangle, FileText, XCircle, ArrowRightLeft, CalendarX, BarChart3, Archive, FileWarning, AlertCircle, CalendarOff, BarChart2, ChevronDown, Filter, Download, LayoutDashboard, FileInput, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts';
import VolumetryDashboard from './VolumetryDashboard';
import ExpiredProductsDashboard from './ExpiredProductsDashboard';
import ZeroBalanceDashboard, { ZeroBalanceData } from './ZeroBalanceDashboard';
import { InventoryAccuracyDashboard } from './InventoryAccuracyDashboard';
import { DispensaryProject } from './DispensaryProject';
import FileImportSection from './FileImportSection';
import { processFiles } from '../utils/fileParser';

// --- Mock Data Extracted from User Files ---

const DRAWER_STATS = {
  totalOpenings: 113358,
  withoutRetrieval: 15053,
  withoutRetrievalPercentage: 13.28,
  breakdown: [
    { name: 'Sem Retirada (Erro)', value: 12505, color: '#DC2626' }, // Red-600
    { name: 'Sem Retirada (Com Leitura)', value: 2548, color: '#2563EB' }, // Blue-600
  ]
};

const DISPENSARY_DATA = [
  { name: 'UNIDADE A1', value: 3401 },
  { name: 'UNIDADE A2', value: 3100 },
  { name: 'UNIDADE E2', value: 2396 },
  { name: 'UTI 7 PED', value: 1676 },
  { name: 'UTI 6 ADULTO', value: 1391 },
  { name: 'UTI 4 ADULTO', value: 1284 },
  { name: 'UTI 5 PED', value: 1173 },
  { name: 'RADIOLOGIA', value: 632 },
];

const USER_RANKING = [
  { name: 'ALBA LUCIA DA SILVA DE FREITAS', count: 209, percentage: 1.39 },
  { name: 'DANIELLE DA CUNHA SILVA', count: 193, percentage: 1.28 },
  { name: 'RENATA RODRIGUES DA SILVEIRA', count: 191, percentage: 1.27 },
  { name: 'ALEXANDRA MARIA DE MEDEIROS RIBEIRO', count: 184, percentage: 1.22 },
  { name: 'LEILA SILVA LOPES COIMBRA', count: 168, percentage: 1.12 },
  { name: 'CELMA DA CONCEICAO DE SOUZA ALMEIDA', count: 165, percentage: 1.10 },
  { name: 'GISELLE AGATHA MOREIRA DA SILVA', count: 164, percentage: 1.09 },
  { name: 'IGOR SERGIO DO NASCIMENTO', count: 153, percentage: 1.02 },
  { name: 'ANA CLARA SILVA SOARES', count: 141, percentage: 0.94 },
  { name: 'LORENA KATLEN SOUZA DA SILVA', count: 141, percentage: 0.94 },
];

const INVALID_CODES_STATS = {
  total: 6683,
  topDispensary: { name: 'UNIDADE A1', value: 1918, percentage: 28.70 },
  topCode: { code: '1727063010PR452R9', count: 371 }
};

const INVALID_CODES_DISPENSARY_DATA = [
  { name: 'UNIDADE A1', value: 1918 },
  { name: 'UNIDADE E2', value: 1060 },
  { name: 'UNIDADE A2', value: 1029 },
  { name: 'UTI 5 PED', value: 890 },
  { name: 'UTI 7 PED', value: 639 },
  { name: 'UTI 4 ADULTO', value: 418 },
  { name: 'RADIOLOGIA', value: 416 },
  { name: 'UTI 6 ADULTO', value: 313 },
];

const TOP_INVALID_CODES = [
  { code: '1727063010PR452R9', count: 371, percentage: 5.55 },
  { code: '010789836170004117280109106010049', count: 284, percentage: 4.25 },
  { code: '010038290306565317280531105154785', count: 270, percentage: 4.04 },
  { code: '7898361700188', count: 186, percentage: 2.78 },
  { code: '1727063010PR452W6', count: 160, percentage: 2.39 },
];

const INVALID_CODES_USER_DATA = [
  { name: 'ROMILDA DE OLIVEIRA ABRANTES', code: '1727063010PR452R9', count: 22 },
  { name: 'VANESSA VALADARES DE SOUSA', code: '2000024280707', count: 19 },
  { name: 'LIDIANA CARNEIRO DE ARAUJO', code: '7898361700188', count: 18 },
  { name: 'DANIELA SCALIA MARQUES', code: '7898361700188', count: 16 },
  { name: 'MARIVAN ALVES ENEDINO', code: '1727063010PR452R9', count: 16 },
  { name: 'MONICA MACHADO DOS SANTOS', code: '010038290306565317280229105066918', count: 16 },
  { name: 'VANESSA SALVADOR DOS SANTOS', code: '010038290306565317280531105154785', count: 16 },
  { name: 'TAYNARA RODRIGUES DA SILVA', code: '010038290306565317280531105154785', count: 15 },
  { name: 'WIVIAN KELY FERREIRA MARTINS', code: '2000009543841', count: 14 },
  { name: 'ROSANGELA PEREIRA DE OLIVEIRA', code: '7898361700188', count: 14 },
];

const PRESCRIPTIONS_STATS = {
  totalPrescribed: 86977,
  totalWithdrawn: 67809,
  globalAdherence: 77.96,
  lowAdherenceThreshold: 50
};

const PRESCRIPTIONS_DATA = [
  { name: 'UNIDADE A1', prescribed: 31074, withdrawn: 24311, percentage: 78.24 },
  { name: 'UNIDADE A2', prescribed: 23881, withdrawn: 19164, percentage: 80.25 },
  { name: 'UNIDADE E2', prescribed: 11370, withdrawn: 9286, percentage: 81.67 },
  { name: 'UTI 6 ADULTO', prescribed: 6349, withdrawn: 5192, percentage: 81.78 },
  { name: 'UTI 7 ADULTO', prescribed: 6232, withdrawn: 4959, percentage: 79.57 },
  { name: 'UTI 4 ADULTO', prescribed: 4564, withdrawn: 3784, percentage: 82.91 },
  { name: 'UTI 5 PED', prescribed: 2451, withdrawn: 1106, percentage: 45.12 },
  { name: 'ONCOLOGIA', prescribed: 974, withdrawn: 0, percentage: 0.00 },
  { name: 'RADIOLOGIA', prescribed: 82, withdrawn: 7, percentage: 8.54 },
].sort((a, b) => b.prescribed - a.prescribed); // Sort by volume

const TRANSFERS_STATS = {
  total: 1181,
  completionRate: 98.3,
  avgTime: 120, // Estimated average in minutes
};

const TRANSFERS_DISPENSARY_DATA = [
  { name: 'UNIDADE A1', completo: 251, pendente: 3, parcial: 0, total: 254 },
  { name: 'UNIDADE A2', completo: 207, pendente: 2, parcial: 0, total: 209 },
  { name: 'UNIDADE E2', completo: 183, pendente: 3, parcial: 3, total: 189 },
  { name: 'RADIOLOGIA', completo: 121, pendente: 1, parcial: 0, total: 122 },
  { name: 'UTI 6 ADULTO', completo: 107, pendente: 0, parcial: 0, total: 107 },
  { name: 'UTI 5 PED', completo: 101, pendente: 1, parcial: 0, total: 102 },
  { name: 'UTI 7 ADULTO', completo: 95, pendente: 4, parcial: 1, total: 100 },
  { name: 'UTI 4 ADULTO', completo: 96, pendente: 0, parcial: 2, total: 98 },
].sort((a, b) => b.total - a.total);

const TRANSFERS_TIME_DATA = [
  { name: 'RADIOLOGIA', min: 1.10, max: 563.68, avg: 80 },
  { name: 'UNIDADE A1', min: 2.57, max: 880.60, avg: 90 },
  { name: 'UNIDADE A2', min: 4.90, max: 928.70, avg: 100 },
  { name: 'UNIDADE E2', min: 1.87, max: 313.48, avg: 120 },
  { name: 'UTI 4 ADULTO', min: 1.97, max: 1148.55, avg: 195.74 },
  { name: 'UTI 5 PED', min: 1.48, max: 1066.93, avg: 150 },
  { name: 'UTI 6 ADULTO', min: 1.70, max: 498.87, avg: 140 },
  { name: 'UTI 7 ADULTO', min: 3.10, max: 1664.17, avg: 130 },
];

const TRANSFERS_DAILY_DATA = [
  { day: '01/02', completo: 30, pendente: 1, parcial: 0 },
  { day: '03/02', completo: 27, pendente: 0, parcial: 0 },
  { day: '05/02', completo: 34, pendente: 2, parcial: 0 },
  { day: '07/02', completo: 37, pendente: 0, parcial: 1 },
  { day: '09/02', completo: 73, pendente: 1, parcial: 0 },
  { day: '11/02', completo: 28, pendente: 2, parcial: 0 },
  { day: '13/02', completo: 23, pendente: 1, parcial: 0 },
  { day: '15/02', completo: 26, pendente: 0, parcial: 0 },
  { day: '17/02', completo: 17, pendente: 0, parcial: 0 },
  { day: '19/02', completo: 19, pendente: 4, parcial: 0 },
  { day: '21/02', completo: 34, pendente: 0, parcial: 2 },
  { day: '23/02', completo: 63, pendente: 0, parcial: 0 },
  { day: '25/02', completo: 45, pendente: 1, parcial: 0 },
  { day: '27/02', completo: 50, pendente: 1, parcial: 1 },
];

// --- Components ---

const TransfersDashboard = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total de Transferências</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{TRANSFERS_STATS.total.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-400 mt-1">Solicitações no período</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Taxa de Conclusão</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{TRANSFERS_STATS.completionRate}%</p>
          <p className="text-xs text-slate-400 mt-1">Transferências completas</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tempo Médio Abastecimento</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">~{TRANSFERS_STATS.avgTime} min</p>
          <p className="text-xs text-slate-400 mt-1">Tempo estimado de atendimento</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status by Dispensary */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Status por Dispensário</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TRANSFERS_DISPENSARY_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="completo" name="Completo" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="parcial" name="Parcial" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendente" name="Pendente" stackId="a" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Replenishment Time */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Tempo de Abastecimento (Min/Máx/Méd)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={TRANSFERS_TIME_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value) => [`${value} min`, 'Tempo']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="max" name="Máximo" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="avg" name="Média" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="min" name="Mínimo" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Evolution Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Evolução Diária de Transferências</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={TRANSFERS_DAILY_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{fontSize: 12}} />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Bar dataKey="completo" name="Completo" stackId="a" fill="#84CC16" radius={[0, 0, 0, 0]} />
              <Bar dataKey="parcial" name="Parcial" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pendente" name="Pendente" stackId="a" fill="#0E7490" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const PrescriptionsDashboard = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total de Itens Prescritos</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{PRESCRIPTIONS_STATS.totalPrescribed.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-400 mt-1">Volume total no período</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total de Itens Retirados</p>
          <p className="text-3xl font-bold text-emerald-600 mt-2">{PRESCRIPTIONS_STATS.totalWithdrawn.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-400 mt-1">
            {PRESCRIPTIONS_STATS.globalAdherence}% de atendimento via dispensário
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Adesão Global</p>
          <div className="flex items-end gap-2 mt-2">
            <p className={`text-3xl font-bold ${PRESCRIPTIONS_STATS.globalAdherence >= 70 ? 'text-emerald-600' : 'text-amber-500'}`}>
              {PRESCRIPTIONS_STATS.globalAdherence}%
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-1">Meta ideal: &gt; 90%</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Volume: Prescrito vs Retirado</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PRESCRIPTIONS_DATA} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString('pt-BR'), 'Itens']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Bar dataKey="prescribed" name="Prescrito" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="withdrawn" name="Retirado" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Adherence Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Taxa de Adesão por Setor (%)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={PRESCRIPTIONS_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Adesão']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="percentage" name="% Adesão" radius={[0, 4, 4, 0]} barSize={20}>
                  {PRESCRIPTIONS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.percentage < 50 ? '#EF4444' : entry.percentage < 80 ? '#F59E0B' : '#10B981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Detalhamento de Adesão à Prescrição</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Dispensário</th>
                <th className="px-6 py-4 text-right">Itens Prescritos</th>
                <th className="px-6 py-4 text-right">Itens Retirados</th>
                <th className="px-6 py-4 text-right">% Adesão</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {PRESCRIPTIONS_DATA.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.name}</td>
                  <td className="px-6 py-4 text-right">{item.prescribed.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-right">{item.withdrawn.toLocaleString('pt-BR')}</td>
                  <td className="px-6 py-4 text-right font-bold">
                    <span className={item.percentage < 50 ? 'text-red-600' : item.percentage < 80 ? 'text-amber-600' : 'text-emerald-600'}>
                      {item.percentage}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.percentage < 50 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Crítico</span>
                    ) : item.percentage < 80 ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Atenção</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Bom</span>
                    )}
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

const InvalidCodesDashboard = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total de Códigos Inválidos</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{INVALID_CODES_STATS.total.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-400 mt-1">Leituras não reconhecidas pelo sistema</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Dispensário Mais Crítico</p>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-2xl font-bold text-red-600 truncate">{INVALID_CODES_STATS.topDispensary.name}</p>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {INVALID_CODES_STATS.topDispensary.value} ocorrências ({INVALID_CODES_STATS.topDispensary.percentage}%)
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Código Mais Recorrente</p>
          <p className="text-lg font-bold text-slate-900 mt-2 truncate" title={INVALID_CODES_STATS.topCode.code}>
            {INVALID_CODES_STATS.topCode.code}
          </p>
          <p className="text-xs text-slate-400 mt-1">{INVALID_CODES_STATS.topCode.count} leituras</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Ocorrências por Dispensário</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={INVALID_CODES_DISPENSARY_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                <Tooltip 
                  formatter={(value) => [value, 'Ocorrências']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#DC2626" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Codes List */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Top 5 Códigos Inválidos</h3>
          <div className="space-y-4">
            {TOP_INVALID_CODES.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-red-100 text-red-600 font-bold rounded-full text-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]" title={item.code}>
                      {item.code}
                    </p>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5">
                      <div 
                        className="bg-red-500 h-1.5 rounded-full" 
                        style={{ width: `${(item.count / TOP_INVALID_CODES[0].count) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{item.count}</p>
                  <p className="text-xs text-slate-500">{item.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Usuários com Mais Erros de Leitura</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Código Mais Lido (Inválido)</th>
                <th className="px-6 py-4 text-right">Nº Ocorrências</th>
                <th className="px-6 py-4 text-center">Ação Recomendada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {INVALID_CODES_USER_DATA.map((user, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 truncate max-w-[150px]" title={user.code}>
                    {user.code}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900">{user.count}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      Reorientar
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

const DrawerOpeningDashboard = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total de Aberturas (Fev/2026)</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{DRAWER_STATS.totalOpenings.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-400 mt-1">Todas as operações registradas</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Aberturas Sem Retirada</p>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-3xl font-bold text-red-600">{DRAWER_STATS.withoutRetrieval.toLocaleString('pt-BR')}</p>
            <span className="text-sm font-medium text-red-100 bg-red-600 px-2 py-0.5 rounded-full mb-1">
              {DRAWER_STATS.withoutRetrievalPercentage.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Índice de ineficiência operacional</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Impacto Operacional</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">~41h</p>
          <p className="text-xs text-slate-400 mt-1">Tempo estimado perdido (10s/abertura)</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Top Dispensários (Abertura s/ Retirada)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DISPENSARY_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                <Tooltip 
                  formatter={(value) => [value, 'Ocorrências']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#0F766E" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Tipos de Ocorrência</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DRAWER_STATS.breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {DRAWER_STATS.breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-sm text-slate-500 mt-[-20px]">
            <p><span className="font-bold text-red-600">83%</span> Gaveta Aberta s/ Retirada</p>
            <p><span className="font-bold text-blue-600">17%</span> Com Leitura de Código</p>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Ranking de Usuários (Top 10)</h3>
          <button className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
            <Filter className="w-4 h-4" />
            Ver Todos
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4 text-right">Nº Movimentos</th>
                <th className="px-6 py-4 text-right">% do Total</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {USER_RANKING.map((user, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                  <td className="px-6 py-4 text-right">{user.count}</td>
                  <td className="px-6 py-4 text-right">{user.percentage.toFixed(2)}%</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.count > 180 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {user.count > 180 ? 'Crítico' : 'Atenção'}
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

export function DispensaryAnalysis() {
  const [selectedFolder, setSelectedFolder] = useState<string>('Abertura de Gaveta');
  const [activeTab, setActiveTab] = useState<'analysis' | 'import' | 'accuracy' | 'pedidos'>('analysis');
  const [zeroBalanceData, setZeroBalanceData] = useState<ZeroBalanceData | null>(null);

  const handleAnalyze = async (files: File[]) => {
    console.log("Analyzing files:", files);
    
    if (selectedFolder === 'Saldo Zero') {
      const parsedData = await processFiles(files);
      if (parsedData && parsedData.items.length > 0) {
        setZeroBalanceData({ products: parsedData.items });
        setActiveTab('analysis'); // Switch back to analysis view
      }
    } else {
      // For other folders, we just simulate for now or implement similar logic
      // if the file structure is the same.
      console.log("File analysis for this folder is not yet fully implemented, but files were received.");
      setActiveTab('analysis');
    }
  };

  const folders = [
    { label: 'Abertura de Gaveta', icon: Archive, color: 'text-blue-600', bg: 'bg-blue-50', activeBg: 'bg-blue-100', activeBorder: 'border-blue-300' },
    { label: 'Códigos Inválidos', icon: FileWarning, color: 'text-red-600', bg: 'bg-red-50', activeBg: 'bg-red-100', activeBorder: 'border-red-300' },
    { label: 'Prescrições', icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', activeBg: 'bg-emerald-100', activeBorder: 'border-emerald-300' },
    { label: 'Saldo Zero', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', activeBg: 'bg-orange-100', activeBorder: 'border-orange-300' },
    { label: 'Transferências', icon: ArrowRightLeft, color: 'text-purple-600', bg: 'bg-purple-50', activeBg: 'bg-purple-100', activeBorder: 'border-purple-300' },
    { label: 'Vencidos', icon: CalendarOff, color: 'text-rose-600', bg: 'bg-rose-50', activeBg: 'bg-rose-100', activeBorder: 'border-rose-300' },
    { label: 'Volumetria', icon: BarChart2, color: 'text-indigo-600', bg: 'bg-indigo-50', activeBg: 'bg-indigo-100', activeBorder: 'border-indigo-300' },
  ];

  const renderDashboardContent = () => {
    switch (selectedFolder) {
      case 'Abertura de Gaveta':
        return <DrawerOpeningDashboard />;
      case 'Códigos Inválidos':
        return <InvalidCodesDashboard />;
      case 'Prescrições':
        return <PrescriptionsDashboard />;
      case 'Transferências':
        return <TransfersDashboard />;
      case 'Volumetria':
        return <VolumetryDashboard />;
      case 'Vencidos':
        return <ExpiredProductsDashboard />;
      case 'Saldo Zero':
        return <ZeroBalanceDashboard data={zeroBalanceData} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Folder className="w-16 h-16 mb-4 opacity-20" />
            <p>Selecione uma pasta para visualizar a análise.</p>
          </div>
        );
    }
  };

  const renderContent = () => {
    if (activeTab === 'accuracy') {
        return <InventoryAccuracyDashboard />;
    }
    if (activeTab === 'pedidos') {
        return <DispensaryProject />;
    }
    if (activeTab === 'import') {
        return <FileImportSection 
            folderName={selectedFolder} 
            onAnalyze={handleAnalyze} 
          />;
    }
    return renderDashboardContent();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Análise Dispensários</h2>
          <p className="text-slate-500 text-sm">Gerenciamento e monitoramento de indicadores</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'analysis' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Análise
            </button>
            <button
              onClick={() => setActiveTab('accuracy')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'accuracy' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Acurácia
            </button>
            <button
              onClick={() => setActiveTab('pedidos')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'pedidos' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Package className="w-4 h-4" />
              Pedido Dispensário
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'import' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Upload className="w-4 h-4" />
              Importar Arquivos
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

          <div className="flex items-center gap-2">
             <span className="text-sm text-slate-500 hidden md:inline">Período:</span>
             <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
               Fevereiro 2026
               <ChevronDown className="w-4 h-4 text-slate-400" />
             </button>
          </div>
        </div>
      </div>

      {/* Folders Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {folders.map((folder, index) => {
          const isActive = selectedFolder === folder.label;
          return (
            <button 
              key={index} 
              onClick={() => setSelectedFolder(folder.label)}
              className={`flex flex-col items-center p-4 rounded-xl border transition-all cursor-pointer group relative overflow-hidden text-left w-full ${
                isActive 
                  ? `${folder.activeBg} ${folder.activeBorder} shadow-md scale-105 z-10` 
                  : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
              }`}
            >
              <div className={`p-3 rounded-full ${folder.bg} ${folder.color} mb-3 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                <folder.icon className="w-6 h-6" />
              </div>
              <span className={`text-xs font-medium text-center w-full truncate ${isActive ? 'text-slate-900 font-bold' : 'text-slate-600 group-hover:text-slate-900'}`}>
                {folder.label}
              </span>
              {isActive && (
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${folder.color.replace('text', 'bg')}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="min-h-[400px] mt-6">
        {renderContent()}
      </div>
    </div>
  );
}
