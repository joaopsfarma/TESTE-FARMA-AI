import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ValidityUploaderProps {
  onValidityLoaded: (validityMap: Record<string, { date: string, batch: string }>) => void;
}

export const ValidityUploader: React.FC<ValidityUploaderProps> = ({ onValidityLoaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parseDate = (str: string): string | null => {
    if (!str) return null;
    // Expecting DD/MM/YYYY
    const parts = str.split('/');
    if (parts.length === 3) {
      // Return YYYY-MM-DD
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';', // Force semicolon delimiter
      complete: (results) => {
        if (results.errors.length > 0) {
          // Some CSVs might have minor errors but still parseable data
          console.warn('CSV Errors:', results.errors);
        }

        const data = results.data as any[];
        const validityMap: Record<string, { date: string, batch: string }> = {};
        let count = 0;

        try {
          // The file format is structured with headers:
          // mv;produto;lote;validade;quantidade
          
          // We need to handle multiple batches for the same product.
          // We will store the EARLIEST expiry date for each product.

          const tempMap: Record<string, { date: string, batch: string }[]> = {};

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            // Access by column name (header: true)
            // Keys might be lower case or have whitespace, so we should be careful.
            // Based on user input: 'mv', 'validade'
            
            const idRaw = row['mv'];
            const dateRaw = row['validade'];
            const batchRaw = row['lote'];
            
            if (!idRaw || !dateRaw) continue;

            // Check if ID is a number
            if (isNaN(Number(idRaw.toString().replace('.', '')))) continue;

            const id = idRaw.toString().trim();
            const parsedDate = parseDate(dateRaw);
            const batch = batchRaw ? batchRaw.toString().trim() : '';
            
            if (id && parsedDate) {
              if (!tempMap[id]) {
                tempMap[id] = [];
              }
              tempMap[id].push({ date: parsedDate, batch });
              count++;
            }
          }

          // Find earliest date for each product
          Object.keys(tempMap).forEach(id => {
            // Sort by date string (ISO format works for string sort)
            const sorted = tempMap[id].sort((a, b) => a.date.localeCompare(b.date));
            validityMap[id] = sorted[0];
          });

          if (count === 0) {
            setError('Nenhuma data de validade encontrada. Verifique se o arquivo possui as colunas "mv" e "validade" separadas por ponto e vírgula.');
            return;
          }

          onValidityLoaded(validityMap);
          setSuccess(`Sucesso! Validades atualizadas para ${Object.keys(validityMap).length} produtos.`);
        } catch (err: any) {
          setError(`Erro ao processar dados: ${err.message}`);
        }
      },
      error: (err) => {
        setError(`Erro ao processar arquivo: ${err.message}`);
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-6 relative overflow-hidden group/card"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/card:scale-110 transition-transform duration-700 pointer-events-none">
         <Calendar className="w-32 h-32 text-orange-600" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
            Importar Relatório de Validades
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Carregue o relatório de estoque (CSV) para atualizar as datas de validade.
          </p>
        </div>
      </div>

      <div className="relative z-10">
        <label className="cursor-pointer block group">
          <div className={`
            flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl transition-all duration-300
            ${success ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50' : 
              error ? 'border-red-300 bg-red-50/50 hover:bg-red-50' : 
              'border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50/50'}
          `}>
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className={`
                p-4 rounded-full mb-4 transition-colors duration-300
                ${success ? 'bg-emerald-100 text-emerald-600' : 
                  error ? 'bg-red-100 text-red-600' : 
                  'bg-white shadow-sm border border-slate-100 text-slate-400 group-hover:text-orange-500 group-hover:border-orange-100'}
              `}>
                {success ? <CheckCircle className="w-8 h-8" /> : 
                 error ? <AlertCircle className="w-8 h-8" /> : 
                 <Upload className="w-8 h-8" />}
              </div>
              <p className={`text-lg font-bold mb-1 transition-colors ${success ? 'text-emerald-700' : error ? 'text-red-700' : 'text-slate-700 group-hover:text-orange-700'}`}>
                {success ? 'Arquivo de validades importado!' : 
                 error ? 'Erro na importação' : 
                 'Clique ou arraste para enviar o CSV'}
              </p>
              <p className={`text-sm font-medium transition-colors ${success ? 'text-emerald-600/80' : error ? 'text-red-600/80' : 'text-slate-500'}`}>
                {success ? success : 
                 error ? 'Por favor, tente novamente.' : 
                 'Formato: Relatório de Estoque por Classe'}
              </p>
            </div>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </div>
        </label>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-sm text-red-700 shadow-sm">
              <div className="p-1.5 bg-red-100 rounded-lg shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="font-bold mb-0.5">Falha no processamento</p>
                <p className="text-red-600/90">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
