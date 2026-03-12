import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp, Package } from 'lucide-react';

export const InventoryAccuracyDashboard = () => {
  return (
    <div
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Acurácia Geral</p>
              <h3 className="text-2xl font-bold text-slate-900">98.5%</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Divergências</p>
              <h3 className="text-2xl font-bold text-slate-900">12</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Itens Analisados</p>
              <h3 className="text-2xl font-bold text-slate-900">1,240</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Detalhes da Acurácia</h2>
        <p className="text-slate-500">Dashboard de acurácia de inventário em desenvolvimento...</p>
      </div>
    </div>
  );
};
