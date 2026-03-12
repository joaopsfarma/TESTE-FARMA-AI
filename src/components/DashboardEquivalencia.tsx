import React, { useState, useRef } from 'react';
import { DEFAULT_EQUIVALENCES, EquivalenceItem } from '../data/equivalences';
import { Search, Database, ArrowRight, Pill, AlertCircle, Upload } from 'lucide-react';

export const DashboardEquivalencia: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [equivalences, setEquivalences] = useState<EquivalenceItem[]>(DEFAULT_EQUIVALENCES);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newEquivalences: EquivalenceItem[] = [];

      // Assume simple CSV format: id,name,status,suggestion,suggestionId
      lines.forEach((line, index) => {
        if (index === 0 || line.trim() === '') return; // Skip header or empty lines
        const [id, name, status, suggestion, suggestionId] = line.split(',').map(s => s.trim());
        if (id && name) {
          newEquivalences.push({ id, name, status, suggestion, suggestionId });
        }
      });

      if (newEquivalences.length > 0) {
        setEquivalences(newEquivalences);
      }
    };
    reader.readAsText(file);
  };

  const filteredEquivalences = equivalences.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.includes(searchTerm) ||
    item.suggestion.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.suggestionId.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 p-2 rounded-lg text-teal-700">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Base de Dados de Equivalências</h2>
              <p className="text-slate-500 text-sm">
                Lista de produtos faltantes e suas sugestões de substituição configuradas no sistema.
              </p>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileImport} 
            accept=".csv,.txt" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold"
          >
            <Upload className="w-4 h-4" />
            Importar Equivalências
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou ID do produto ou substituto..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produto Faltante</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sugestão de Substituição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEquivalences.length > 0 ? (
                filteredEquivalences.map((item) => (
                  <tr key={`${item.id}-${item.suggestionId}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-1.5 rounded text-slate-500">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500 font-mono">ID: {item.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-slate-700">{item.suggestion}</p>
                          <p className="text-xs text-slate-500 font-mono">ID Substituto: {item.suggestionId}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <p>Nenhuma equivalência encontrada para "{searchTerm}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <p className="text-xs text-slate-500">
            Total de {filteredEquivalences.length} equivalências mapeadas.
          </p>
        </div>
      </div>
    </div>
  );
};
