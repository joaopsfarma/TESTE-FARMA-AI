import React, { useState } from 'react';
import { FileUp } from 'lucide-react';

export const PedidosDispensario: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center">
      <div className="text-xs font-mono tracking-widest text-slate-500 mb-8 flex items-center gap-2 uppercase">
        <span className="h-px w-12 bg-slate-700"></span>
        Dispensário 347 · UTI 5 Pediátrico
        <span className="h-px w-12 bg-slate-700"></span>
      </div>
      
      <h1 className="text-3xl font-bold mb-2">Pedido de Reposição 24h</h1>
      <p className="text-slate-400 text-sm mb-12">Faça o upload dos 3 arquivos para iniciar</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8">
        {[
          { icon: '🧑‍⚕️', name: 'Consumo por Paciente', hint: 'R_LIST_CONS_PAC_txt.csv' },
          { icon: '🏥', name: 'Saldo Hospital / Lotes', hint: 'R_CONF_LOTE.csv' },
          { icon: '⚖️', name: 'Comparação de Saldos', hint: 'ExportStockComparison*.CSV' },
        ].map((card, i) => (
          <div key={i} className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center cursor-pointer hover:border-blue-500 hover:bg-slate-800 transition-all">
            <div className="text-2xl mb-2">{card.icon}</div>
            <div className="font-semibold text-sm mb-1">{card.name}</div>
            <div className="font-mono text-[10px] text-slate-500">{card.hint}</div>
          </div>
        ))}
      </div>
      
      <button className="bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold py-3 px-8 rounded-md font-mono text-xs tracking-wider transition-colors">
        Carregar e Iniciar →
      </button>
    </div>
  );
};
