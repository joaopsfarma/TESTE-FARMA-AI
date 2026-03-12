import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

interface TransferCsvUploaderProps {
  onStockLoaded: (stockMap: Map<string, Array<{ batch: string, validity: string, qty: number }>>) => void;
  title?: string;
}

export const TransferCsvUploader: React.FC<TransferCsvUploaderProps> = ({ onStockLoaded, title }) => {
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
      header: false, // We parse as array of arrays to handle offsets manually
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const stockMap = new Map<string, Array<{ batch: string, validity: string, qty: number }>>();
          const data = results.data as string[][];
          
          let count = 0;
          
          // Default indices based on the provided snippet
          // Data: ,32178,(BC)OSCAL...,,COMP C/50,,"344,000",,FRA05085-F1,,20/06/2026,,501,,"0,000",,,,"4,000",,
          let idCol = 1;
          let batchCol = 8;
          let validityCol = 10;
          let qtyCol = 20;
          
          // Try to detect header row to confirm or adjust indices
          let headerRowIndex = -1;
          for(let i=0; i<Math.min(20, data.length); i++) {
             const row = data[i];
             // Look for signature columns
             const loteIdx = row.findIndex(c => c && c.trim() === 'Lote');
             const valIdx = row.findIndex(c => c && c.trim() === 'Validade');
             const qtDigIdx = row.findIndex(c => c && c.trim() === 'Qt. Dig.');
             const quantIdx = row.findIndex(c => c && c.trim() === 'Quantidade');
             
             if (loteIdx !== -1 && valIdx !== -1) {
               headerRowIndex = i;
               
               // Check for data offset in the next row
               // We look at the row immediately following the header to determine offset
               let offset = 0;
               if (i + 1 < data.length) {
                 const nextRow = data[i+1];
                 const valAtHeaderIdx = nextRow[loteIdx];
                 const valAtHeaderIdxPlus1 = nextRow[loteIdx+1];
                 
                 // If data is at +1 position
                 if ((!valAtHeaderIdx || valAtHeaderIdx.trim() === '') && (valAtHeaderIdxPlus1 && valAtHeaderIdxPlus1.trim() !== '')) {
                   offset = 1;
                 }
               }

               batchCol = loteIdx + offset;
               validityCol = valIdx + offset;
               
               // Determine Quantity Column
               // We prefer Qt. Dig., but fallback to Quantidade if Qt. Dig. is empty in data
               let candidateQtyCols: number[] = [];
               if (qtDigIdx !== -1) candidateQtyCols.push(qtDigIdx + offset);
               if (quantIdx !== -1) candidateQtyCols.push(quantIdx + offset);
               
               // Fallback: if no headers found, guess based on snippet (18 or 20)
               if (candidateQtyCols.length === 0) {
                 candidateQtyCols = [20, 18]; 
               }

               // Check which candidate has data in the first few data rows
               let bestQtyCol = -1;
               for (const colIdx of candidateQtyCols) {
                 // Check next 5 rows for data
                 let hasData = false;
                 for (let j = 1; j <= 5; j++) {
                   if (i + j < data.length) {
                     const val = data[i+j][colIdx];
                     if (val && val.trim() !== '' && /[0-9]/.test(val)) {
                       hasData = true;
                       break;
                     }
                   }
                 }
                 if (hasData) {
                   bestQtyCol = colIdx;
                   break;
                 }
               }
               
               if (bestQtyCol !== -1) {
                 qtyCol = bestQtyCol;
               } else if (candidateQtyCols.length > 0) {
                 qtyCol = candidateQtyCols[0]; // Default to first candidate
               }

               // ID usually follows similar shift. If header 'Produto' was at 0, ID might be at 1.
               const prodIdx = row.findIndex(c => c && c.trim() === 'Produto');
               if (prodIdx !== -1) {
                 idCol = prodIdx + offset;
                 // Special case: sometimes ID is +1 relative to Produto even without general offset?
                 // In snippet: Produto at 0, ID at 1. Offset detected as 1. So 0+1=1. Correct.
               } else {
                 idCol = 1; // Default
               }
               
               break;
             }
          }
          
          // If no header found, we stick to defaults (1, 8, 10, 20) which match the user's snippet.

          for (let i = (headerRowIndex === -1 ? 0 : headerRowIndex + 1); i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 5) continue;

            const idRaw = row[idCol];
            const batchRaw = row[batchCol];
            const validityRaw = row[validityCol];
            const qtyRaw = row[qtyCol];

            // Handle "continuation" rows where ID is empty but Batch is present
            // Logic: If ID is empty, look up for the last non-empty ID
            
            let id = idRaw ? idRaw.trim() : '';
            
            if (!id && batchRaw && i > 0) {
               // Look back for the last valid ID
               let prevIdx = i - 1;
               while (prevIdx >= (headerRowIndex === -1 ? 0 : headerRowIndex + 1)) {
                 const prevRow = data[prevIdx];
                 if (prevRow[idCol] && prevRow[idCol].trim()) {
                   id = prevRow[idCol].trim();
                   break;
                 }
                 prevIdx--;
               }
            }

            if (!id) continue;

            const batch = batchRaw ? batchRaw.trim() : '';
            const validity = validityRaw ? validityRaw.trim() : '';
            
            // Parse Qty: "4,000" -> 4.0
            let qty = 0;
            if (qtyRaw) {
              // Remove dots (thousands), replace comma with dot
              qty = parseFloat(qtyRaw.replace(/\./g, '').replace(',', '.'));
            }

            if (id && batch && !isNaN(qty)) {
               if (!stockMap.has(id)) {
                 stockMap.set(id, []);
               }
               stockMap.get(id)?.push({ batch, validity, qty });
               count++;
            }
          }

          if (count === 0) {
            throw new Error('Nenhum dado válido encontrado. Verifique o layout do arquivo.');
          }

          onStockLoaded(stockMap);
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
        {title || 'Importar Relatório de Lotes (CSV)'}
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
              Espera-se colunas: Produto (ID), Lote, Validade, Qt. Dig.
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
