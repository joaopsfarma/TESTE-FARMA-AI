import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, UnitType } from '../types';

interface CsvUploaderProps {
  onDataLoaded: (data: Product[]) => void;
}

export const CsvUploader: React.FC<CsvUploaderProps> = ({ onDataLoaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const parseBrazilianNumber = (str: string): number => {
    if (!str) return 0;
    // Remove quotes and spaces
    let clean = str.replace(/['"\s]/g, '');
    
    // Check if it has dots and commas
    // If it has both, dot is likely thousands separator and comma is decimal
    // If it has only comma, comma is decimal
    // If it has only dot, it might be thousands separator OR decimal (US format)
    // But since it's Brazilian context, we assume dot = thousands, comma = decimal
    
    // Remove dots (thousands separator)
    clean = clean.replace(/\./g, '');
    // Replace comma with dot (decimal separator)
    clean = clean.replace(',', '.');
    
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  const parseDate = (str: string): string => {
    if (!str) return new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
    
    // Try DD/MM/YYYY
    const parts = str.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // Try YYYY-MM-DD
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return str;
    }
    return new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);

    Papa.parse(file, {
      header: false, // Parse as array of arrays to handle the specific layout
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`Erro ao ler CSV: ${results.errors[0].message}`);
          return;
        }

        const data = results.data as string[][];
        
        if (data.length < 2) {
          setError('O arquivo CSV parece estar vazio ou inválido.');
          return;
        }

        try {
          const parsedProducts: Product[] = [];
          
          // Detect Header Row
          let headerRowIndex = -1;
          let colMap = {
            id: -1,
            name: -1,
            unit: -1,
            avg: -1, // Média
            stock: -1 // Saldo
          };

          // Search for header in first 10 rows
          for (let i = 0; i < Math.min(data.length, 10); i++) {
            const row = data[i].map(c => c ? c.toString().toLowerCase().trim() : '');
            
            // Check for key columns
            // "Saldo" is a strong indicator. "Qtd Atual" is for other formats.
            const saldoIndex = row.findIndex(c => c === 'saldo' || c === 'qtd atual');
            
            if (saldoIndex !== -1) {
              const hasProduto = row.includes('produto') || row.includes('id');
              
              if (hasProduto || row.length > 5) { // If we have Saldo and enough columns, likely it's the header
                headerRowIndex = i;
                colMap.stock = saldoIndex;
                
                // Try to find Average ("Média")
                // It might be corrupted (Mdia), so we look for "média", "media", or rely on relative position
                let avgIndex = row.findIndex(c => c === 'média' || c === 'media' || c.includes('mdia'));
                
                // Fallback: In the user's format, Média is immediately before Saldo
                if (avgIndex === -1 && saldoIndex > 0) {
                   avgIndex = saldoIndex - 1;
                }
                colMap.avg = avgIndex;
                
                // Map ID/Name/Unit
                const produtoIndex = row.indexOf('produto');
                if (produtoIndex !== -1) {
                  colMap.id = produtoIndex; // In this CSV, "Produto" header aligns with ID column
                  colMap.name = produtoIndex + 1; // Name is next to ID
                } else {
                  // Fallback for ID/Name if "Produto" header is missing but "Saldo" exists
                  colMap.id = 0;
                  colMap.name = 1;
                }
                
                const unidadeIndex = row.indexOf('unidade');
                if (unidadeIndex !== -1) {
                  colMap.unit = unidadeIndex;
                } else {
                  colMap.unit = 2; // Default position
                }

                break;
              }
            }
          }

          // Fallback if specific header not found (try fixed indices from sample)
          if (headerRowIndex === -1) {
             // Sample format: 
             // 0: ID, 1: Name, 2: Unit, ..., 10: Avg, 11: Saldo
             // Let's try to detect if row 0 looks like the sample header
             const row0 = data[0].map(c => c ? c.toString().toLowerCase().trim() : '');
             if (row0[0] === 'produto' && row0[11] === 'saldo') {
                headerRowIndex = 0;
                colMap = { id: 0, name: 1, unit: 2, avg: 10, stock: 11 };
             }
          }

          const startIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;

          for (let i = startIndex; i < data.length; i++) {
            const row = data[i];
            if (row.length < 2) continue;

            let id = '';
            let name = '';
            let unit = 'UN';
            let stock = 0;
            let dailyConsumption = 0;

            // Strategy 1: Use detected column map
            if (headerRowIndex !== -1) {
               // ID
               if (colMap.id !== -1 && row[colMap.id]) id = row[colMap.id];
               
               // Name
               if (colMap.name !== -1 && row[colMap.name]) name = row[colMap.name];
               
               // Unit
               if (colMap.unit !== -1 && row[colMap.unit]) unit = row[colMap.unit];
               
               // Stock (Saldo)
               if (colMap.stock !== -1 && row[colMap.stock]) stock = parseBrazilianNumber(row[colMap.stock]);
               
               // Avg (Média)
               if (colMap.avg !== -1 && row[colMap.avg]) dailyConsumption = parseBrazilianNumber(row[colMap.avg]);

            } else {
               // Strategy 2: Heuristic parsing (Legacy/Fallback)
               
               // Check if col 1 has " - " (ID - Name format)
               const productColumn = row[1];
               if (productColumn && typeof productColumn === 'string' && productColumn.includes(' - ')) {
                  const parts = productColumn.split(' - ');
                  if (!isNaN(Number(parts[0].trim()))) {
                     id = parts[0].trim();
                     name = parts.slice(1).join(' - ').trim();
                     stock = parseBrazilianNumber(row[6]); // Old fixed index
                     // dailyConsumption default 0
                  }
               } 
               // Check if col 0 is ID (Number)
               else if (row[0] && !isNaN(Number(row[0].trim()))) {
                  id = row[0].trim();
                  name = row[1];
                  unit = row[2] || 'UN';
                  // Try to find stock/avg based on sample indices if map failed
                  // Sample: Avg at 10, Stock at 11
                  if (row.length >= 12) {
                     dailyConsumption = parseBrazilianNumber(row[10]);
                     stock = parseBrazilianNumber(row[11]);
                  } else {
                     // Fallback to old indices
                     dailyConsumption = parseBrazilianNumber(row[5]);
                     stock = parseBrazilianNumber(row[6]);
                  }
               }
            }

            if (id && name) {
               // Clean up Name (remove quotes if any)
               name = name.replace(/^["']|["']$/g, '').trim();
               
               // Clean up ID (sometimes it has spaces)
               id = id.trim();

               const expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

               parsedProducts.push({
                  id: id,
                  name: name,
                  unit: unit || 'UN',
                  physicalStock: stock,
                  systemStock: stock,
                  totalExits30Days: dailyConsumption * 30, // Calculate monthly
                  expiryDate: expiryDate,
               });
            }
          }

          if (parsedProducts.length === 0) {
            setError('Nenhum produto válido encontrado. Verifique se o arquivo segue o padrão: ID, Produto, Unidade, ..., Média, Saldo.');
            return;
          }

          onDataLoaded(parsedProducts);
          setSuccess(`Sucesso! ${parsedProducts.length} produtos carregados.`);
        } catch (err: any) {
          setError(`Erro ao processar dados: ${err.message}`);
        }
      },
      error: (err) => {
        setError(`Erro ao processar arquivo: ${err.message}`);
      }
    });
  };

  const downloadTemplate = () => {
    const headers = ['Produto', '', 'Unidade', '01', '02', '03', '04', '05', '06', 'Total', 'Média', 'Saldo', 'Projeção'];
    const exampleRow = ['38', 'ACICLOVIR 200MG', 'COMP', '14', '7', '14', '10', '8', '2', '55', '"9,167"', '34', '"3,709"'];
    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_consumo.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-6 relative overflow-hidden group/card"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/card:scale-110 transition-transform duration-700 pointer-events-none">
         <Upload className="w-32 h-32 text-indigo-600" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Upload className="w-6 h-6" />
            </div>
            Importar Consumo Diário
          </h3>
          <p className="text-sm font-medium text-slate-500 mt-2">
            Carregue o arquivo CSV (ID, Produto, ..., Média, Saldo).
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={downloadTemplate}
          className="text-sm text-slate-600 hover:text-indigo-700 font-bold flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors shadow-sm"
        >
          <FileText className="w-4 h-4" />
          Baixar Modelo
        </motion.button>
      </div>

      <div className="relative z-10">
        <label className="cursor-pointer block group">
          <div className={`
            flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl transition-all duration-300
            ${success ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50' : 
              error ? 'border-red-300 bg-red-50/50 hover:bg-red-50' : 
              'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'}
          `}>
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className={`
                p-4 rounded-full mb-4 transition-colors duration-300
                ${success ? 'bg-emerald-100 text-emerald-600' : 
                  error ? 'bg-red-100 text-red-600' : 
                  'bg-white shadow-sm border border-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-100'}
              `}>
                {success ? <CheckCircle className="w-8 h-8" /> : 
                 error ? <AlertCircle className="w-8 h-8" /> : 
                 <Upload className="w-8 h-8" />}
              </div>
              <p className={`text-lg font-bold mb-1 transition-colors ${success ? 'text-emerald-700' : error ? 'text-red-700' : 'text-slate-700 group-hover:text-indigo-700'}`}>
                {success ? 'Arquivo importado com sucesso!' : 
                 error ? 'Erro na importação' : 
                 'Clique ou arraste para enviar o CSV'}
              </p>
              <p className={`text-sm font-medium transition-colors ${success ? 'text-emerald-600/80' : error ? 'text-red-600/80' : 'text-slate-500'}`}>
                {success ? success : 
                 error ? 'Por favor, tente novamente.' : 
                 'Suporta o formato padrão do sistema (ConsumoDiario.csv)'}
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
