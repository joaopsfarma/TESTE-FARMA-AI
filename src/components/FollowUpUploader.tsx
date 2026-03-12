import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { FollowUpItem } from '../types';

interface FollowUpUploaderProps {
  onDataLoaded: (data: FollowUpItem[], merge: boolean) => void;
}

export const FollowUpUploader: React.FC<FollowUpUploaderProps> = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isMerge, setIsMerge] = useState(false);

  const processCSV = (file: File) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "ISO-8859-1",
      complete: (results) => {
        try {
          const mappedData: FollowUpItem[] = results.data
            .filter((row: any) => {
              // Verifica Formato Completo (OC + Item) ou Formato Resumo (Fornecedor Mestre + Count)
              const isFull = (row['OC - Núm'] || row['OC - Num'] || row['OC - Nm'] || row['OC - Num.']) && 
                             (row['Cod. Item'] || row['Cd. Item'] || row['Cód. Item']);
              const isSummary = row['Fornecedor Mestre'] || row['Fornecedor'];
              return (isFull && String(isFull).trim() !== '') || (isSummary && String(isSummary).trim() !== '');
            })
            .map((row: any, index: number) => {
              // Detecção de Formato Mestre (Resumo)
              const summaryFornecedor = row['Fornecedor Mestre'] || row['Fornecedor_Resumo'];
              const customItemName = row['Desc Item'] || row['Desc. Item'] || row['Produto'] || row['Item'] || row['Descrição'] || row['Descri\uFFFD\uFFFDo'];

              if (summaryFornecedor && !row['OC - Núm'] && !row['OC - Num'] && !row['OC - Nm']) {
                 const countItens = row['Contagem de Cod. Item'] || row['Qtd Itens'] || '0';
                 const statusAt = row['Status Atualizado'] || row['Status'] || '';
                 
                 // Se tivermos uma descrição específica, usamos ela. Caso contrário, usamos o texto genérico.
                 const finalItemName = customItemName ? String(customItemName) : 'Agrupamento de Itens por Fornecedor';

                 return {
                    id: `summary-${index}-${Date.now()}`,
                    hospital: row['Hospital'] || 'Geral',
                    supplier: String(summaryFornecedor),
                    ocNumber: row['OC - Núm'] || row['OC - Num'] || 'Múltiplas OCs',
                    itemCode: row['Cod. Item'] || row['Cd. Item'] || 'Resumo',
                    itemName: finalItemName,
                    creationDate: new Date().toLocaleDateString('pt-BR'),
                    deliveryDate: row['DT - Entrega'] || row['Data Entrega'] || 'Pendente',
                    pendingQty: parseInt(countItens) || 0,
                    totalQty: parseInt(countItens) || 0,
                    coverage: parseInt(row['Cobertura']) || 0,
                    status: (statusAt as any) || (String(statusAt).toLowerCase().includes('atrasado') ? 'Atrasado' : 'No Prazo'),
                    delayDays: String(statusAt).toLowerCase().includes('atrasado') ? (parseInt(row['Dias de Atraso']) || 10) : 0,
                    ltRespected: String(row['LT Respeitado']).toLowerCase() === 'sim',
                    observations: String(row['Obs.'] || row['Observações'] || 'Resumo importado diretamente.')
                 };
              }

              // Formato Completo Padrão
              const ocNumber = row['OC - Núm'] || row['OC - Num'] || row['OC - Nm'] || row['OC - N\uFFFDm'] || row['OC - Num.'] || '';
              const itemCode = row['Cod. Item'] || row['Cd. Item'] || row['Cód. Item'] || '';
              const itemName = row['Desc Item'] || row['Desc. Item'] || row['Produto'] || '';
              
              const formatDate = (dateStr: string) => {
                if (!dateStr || dateStr === '0') return '';
                const parts = dateStr.split(' ')[0].split('-');
                if (parts.length === 3) {
                  return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return dateStr;
              };

              const creationDate = formatDate(row['OC - Criação'] || row['OC - Criao'] || row['OC - Cria\uFFFD\uFFFDo'] || '');
              const deliveryDate = formatDate(row['DT - Entrega'] || row['Data Entrega'] || '');
              
              const pendingQty = row['Qtd Pend'] || row['Qtd. Pendente'] || row['Qtd Pend.'] || row['Qtde'] || '0';
              const totalQty = row['Qtd Total'] || row['Qtd. Total'] || '0';
              const coverage = row['Cobertura'] || '0';
              const status = row['Status'] || 'No Prazo';
              const delayDays = row['Dias de Atraso'] || '0';
              const ltRespected = row['LT Respeitado'] || row['LT Respeitado?'] || '';
              const observations = row['Obs.'] || row['Observaes'] || row['Observações'] || row['Obs'] || '';

              return {
                id: `upload-${index}-${Date.now()}`,
                hospital: row['Hospital'] || '',
                supplier: row['Fornecedor'] || '',
                ocNumber: String(ocNumber),
                itemCode: String(itemCode),
                itemName: String(itemName),
                creationDate: creationDate,
                deliveryDate: deliveryDate,
                pendingQty: parseInt(pendingQty) || 0,
                totalQty: parseInt(totalQty) || 0,
                coverage: parseInt(coverage) || 0,
                status: (status as any) || 'No Prazo',
                delayDays: parseInt(delayDays) || 0,
                ltRespected: String(ltRespected).toLowerCase() === 'sim',
                observations: observations === '0' ? '' : String(observations)
              };
            });

          if (mappedData.length === 0) {
            throw new Error('Nenhum dado válido encontrado no arquivo. Verifique se o formato está correto.');
          }

          onDataLoaded(mappedData, isMerge);
          setSuccess(true);
          setIsLoading(false);
        } catch (err: any) {
          setError(err.message || 'Erro ao processar o arquivo CSV.');
          setIsLoading(false);
        }
      },
      error: (err) => {
        setError(`Erro na leitura do arquivo: ${err.message}`);
        setIsLoading(false);
      }
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "text/csv") {
      processCSV(file);
    } else {
      setError("Por favor, envie um arquivo CSV válido.");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCSV(file);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-4 ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-200 bg-slate-50 hover:bg-slate-100/50'
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className={`p-4 rounded-full ${success ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : success ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>

        <div className="text-center">
          <h3 className="text-lg font-bold text-slate-900">
            {isLoading ? 'Processando...' : success ? 'Arquivo Importado!' : 'Importar Follow Up'}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Arraste o arquivo CSV ou clique para selecionar
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <FileText className="w-3.5 h-3.5" />
            Formato: CSV (Vírgula ou Ponto e Vírgula)
          </div>
          
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm z-10 relative">
            <input 
              type="checkbox" 
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 font-bold"
              checked={isMerge}
              onChange={(e) => setIsMerge(e.target.checked)}
            />
            <span className="font-semibold select-none">Mesclar com dados existentes em Follow Up</span>
          </label>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};
