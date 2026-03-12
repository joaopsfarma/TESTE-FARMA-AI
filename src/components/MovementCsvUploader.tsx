import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

export interface MovementData {
  id: string;
  consumption: number;
  currentStock: number;
}

interface MovementCsvUploaderProps {
  onDataLoaded: (data: Map<string, MovementData>) => void;
  title?: string;
}

export const MovementCsvUploader: React.FC<MovementCsvUploaderProps> = ({ onDataLoaded, title }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setSuccess(false);

    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const movementMap = new Map<string, MovementData>();
          const data = results.data as string[][];
          
          let count = 0;
          
          // Find the header row
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(20, data.length); i++) {
            const row = data[i];
            const prodIdx = row.findIndex(c => c && c.trim() === 'Produto');
            const qtdIdx = row.findIndex(c => c && c.trim() === 'Qtd');
            const qtdAtualIdx = row.findIndex(c => c && c.trim() === 'Qtd Atual');
            
            if (prodIdx !== -1 && qtdIdx !== -1 && qtdAtualIdx !== -1) {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex === -1) {
             throw new Error('Cabeçalhos não encontrados. Espera-se: Produto, Qtd, Qtd Atual.');
          }

          const headerRow = data[headerRowIndex];
          const idColHeader = headerRow.findIndex(c => c && c.trim() === 'Produto');
          const qtdColHeader = headerRow.findIndex(c => c && c.trim() === 'Qtd');
          const qtdAtualColHeader = headerRow.findIndex(c => c && c.trim() === 'Qtd Atual');

          for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 3) continue;

            // Find the actual columns by looking near the header index
            // Data might be shifted by 1 or 2 columns
            const idRaw = row[idColHeader];
            
            // For Qtd, look around qtdColHeader
            let qtdRaw = '';
            for (let j = Math.max(0, qtdColHeader - 2); j <= qtdColHeader + 2; j++) {
              if (row[j] && row[j].trim() !== '' && /[0-9]/.test(row[j])) {
                qtdRaw = row[j];
                break;
              }
            }

            // For Qtd Atual, look around qtdAtualColHeader
            let qtdAtualRaw = '';
            for (let j = Math.max(0, qtdAtualColHeader - 2); j <= qtdAtualColHeader + 2; j++) {
              if (row[j] && row[j].trim() !== '' && /[0-9]/.test(row[j])) {
                qtdAtualRaw = row[j];
                break;
              }
            }

            if (!idRaw || idRaw.trim() === '') continue;
            if (idRaw.trim() === 'Total do Estoque :' || idRaw.trim() === 'Total Geral :') continue;

            const id = idRaw.trim();
            
            let consumption = 0;
            if (qtdRaw) {
              consumption = parseFloat(qtdRaw.replace(/\./g, '').replace(',', '.'));
            }

            let currentStock = 0;
            if (qtdAtualRaw) {
              currentStock = parseFloat(qtdAtualRaw.replace(/\./g, '').replace(',', '.'));
            }

            if (id && !isNaN(consumption) && !isNaN(currentStock)) {
               movementMap.set(id, { id, consumption, currentStock });
               count++;
            }
          }

          if (count === 0) {
            throw new Error('Nenhum dado válido encontrado. Verifique o layout do arquivo.');
          }

          onDataLoaded(movementMap);
          setSuccess(true);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
          console.error(err);
        }
      },
      error: (err) => {
        setError(`Erro na leitura do CSV: ${err.message}`);
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Upload className="w-5 h-5 text-indigo-600" />
        {title || 'Importar Movimentações por Estoque (CSV)'}
      </h3>
      
      <div className="flex flex-col gap-4">
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.txt"
            className="hidden"
          />
          <div className="flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">
              {fileName || 'Clique para selecionar o arquivo CSV'}
            </span>
            <span className="text-xs text-slate-400">
              Formatos aceitos: .csv (Separado por vírgula)
            </span>
            <p className="text-xs text-slate-400 mt-2">
              Espera-se colunas: Produto (ID), Qtd, Qtd Atual
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm bg-emerald-50 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4" />
            Arquivo processado com sucesso!
          </div>
        )}
      </div>
    </div>
  );
};
