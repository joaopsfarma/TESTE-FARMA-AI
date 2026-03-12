import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { UploadCloud, AlertTriangle, Search, DollarSign, FileText, Filter, CheckCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ConsolidatedItem {
  id: string; // Unique key for react
  Solicitacao: string;
  Produto_ID: string;
  Produto_Nome: string;
  Qt_Solicitada: number;
  Qt_Atendida: number;
  Saldo: number;
  Custo_Medio: number;
  Custo_Total: number;
}

export const AnalysePendencies: React.FC = () => {
  const [data, setData] = useState<ConsolidatedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyInsufficient, setShowOnlyInsufficient] = useState(false);

  const parseNumber = (val: string | undefined): number => {
    if (!val) return 0;
    const cleanVal = val.replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(cleanVal);
    return isNaN(num) ? 0 : num;
  };

  const processFiles = async (files: File[]) => {
    if (files.length !== 3) {
      setError('Por favor, selecione exatamente 3 ficheiros CSV (Solicitações, Saldos e Custo Médio).');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const parsedFiles = await Promise.all(
        files.map(file => new Promise<{ name: string, data: string[][] }>((resolve, reject) => {
          Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => resolve({ name: file.name, data: results.data as string[][] }),
            error: (err) => reject(err)
          });
        }))
      );

      let solicitacoesData: string[][] | null = null;
      let saldosData: string[][] | null = null;
      let custoMedioData: string[][] | null = null;

      // Identify files
      parsedFiles.forEach(file => {
        const contentStr = file.data.slice(0, 20).map(row => row.join(' ')).join(' ');
        if (contentStr.includes('Situa') && contentStr.includes('Tp Solicita')) {
          solicitacoesData = file.data;
        } else if (contentStr.includes('Atendimento') && contentStr.includes('Qt. Solicitada')) {
          saldosData = file.data;
        } else if (contentStr.includes('Vl Custo M') || contentStr.includes('Produto:')) {
          custoMedioData = file.data;
        }
      });

      if (!solicitacoesData || !saldosData || !custoMedioData) {
        throw new Error('Não foi possível identificar os 3 ficheiros corretamente. Verifique se os ficheiros correspondem a Solicitações, Saldos e Custo Médio.');
      }

      // 1. Parse Solicitações (Find Pending)
      const pendingSolicitacoes = new Set<string>();
      let solColIdx = -1;
      let sitColIdx = -1;

      for (let i = 0; i < solicitacoesData.length; i++) {
        const row = solicitacoesData[i];
        if (solColIdx === -1) {
          solColIdx = row.findIndex(c => c && c.includes('Solicita'));
          sitColIdx = row.findIndex(c => c && c.includes('Situa'));
        } else {
          const sol = row[solColIdx]?.trim();
          const sit = row[sitColIdx]?.trim();
          if (sol && sit && sit.toLowerCase().startsWith('pend')) {
            pendingSolicitacoes.add(sol);
          }
        }
      }

      const normalizeId = (id: string) => {
        if (!id) return '';
        const trimmed = id.trim();
        const num = parseInt(trimmed, 10);
        return isNaN(num) ? trimmed : num.toString();
      };

      // 2. Parse Custo Médio
      const custoMedioMap = new Map<string, number>();
      let currentProdId = '';
      
      for (let i = 0; i < custoMedioData.length; i++) {
        const row = custoMedioData[i];
        if (!row || !Array.isArray(row)) continue;

        const prodLabelIdx = row.findIndex(c => c && typeof c === 'string' && c.trim() === 'Produto:');
        
        if (prodLabelIdx !== -1) {
          let prodStr = row[prodLabelIdx + 1]?.trim() || row[prodLabelIdx + 2]?.trim() || '';
          if (prodStr) {
            currentProdId = normalizeId(String(prodStr).split('-')[0]);
          }
        } else if (currentProdId) {
          const hasDate = row.some(c => c && typeof c === 'string' && c.match(/\d{2}\/\d{2}\/\d{2,4}/));
          if (hasDate || (row[6] && typeof row[6] === 'string' && row[6].includes('/'))) {
            let cost = 0;
            for (let j = row.length - 1; j >= 0; j--) {
              const cell = row[j];
              if (cell && typeof cell === 'string' && cell.match(/^-?\d{1,3}(\.\d{3})*,\d{2,4}$/)) {
                cost = parseNumber(cell);
                if (cost > 0) break;
              }
            }
            if (cost === 0 && row[10]) {
              cost = parseNumber(row[10]);
            }
            
            if (cost > 0) {
              custoMedioMap.set(currentProdId, cost);
            }
          }
        }
      }

      // 3. Parse Saldos and Consolidate
      const consolidated: ConsolidatedItem[] = [];
      
      for (let i = 0; i < saldosData.length; i++) {
        const row = saldosData[i];
        // Based on structure: Solicitacao is at index 3, Produto at 6, Qt Solicitada at 9, Qt Atendida at 11
        const sol = row[3]?.trim();
        
        if (sol && pendingSolicitacoes.has(sol)) {
          const produtoStr = row[6]?.trim();
          if (!produtoStr) continue;

          const qtSolicitada = parseNumber(row[9]);
          const qtAtendida = parseNumber(row[11]);

          // Extract ID and Name
          const prodParts = produtoStr.split('-');
          const prodId = normalizeId(prodParts[0]);
          const prodNome = prodParts.slice(1).join('-').trim() || produtoStr;

          // Find Saldo (Look at row above and below)
          let saldo = 0;
          const rowAbove = i > 0 ? saldosData[i - 1] : null;
          const rowBelow = i < saldosData.length - 1 ? saldosData[i + 1] : null;

          // Saldo is usually at index 13 in the empty row
          if (rowAbove && rowAbove[13] && !rowAbove[3]) {
            saldo = parseNumber(rowAbove[13]);
          } else if (rowBelow && rowBelow[13] && !rowBelow[3]) {
            saldo = parseNumber(rowBelow[13]);
          }

          const custoMedio = custoMedioMap.get(prodId) || 0;
          const custoTotal = qtSolicitada * custoMedio;

          consolidated.push({
            id: `${sol}-${prodId}-${i}`,
            Solicitacao: sol,
            Produto_ID: prodId,
            Produto_Nome: prodNome,
            Qt_Solicitada: qtSolicitada,
            Qt_Atendida: qtAtendida,
            Saldo: saldo,
            Custo_Medio: custoMedio,
            Custo_Total: custoTotal
          });
        }
      }

      setData(consolidated);
      setIsProcessing(false);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar ficheiros.');
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    processFiles(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: true
  } as any);

  // Derived state
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch = item.Solicitacao.includes(searchTerm) || 
                            item.Produto_Nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            item.Produto_ID.includes(searchTerm);
      const matchesInsufficient = showOnlyInsufficient ? item.Qt_Solicitada > item.Saldo : true;
      return matchesSearch && matchesInsufficient;
    });
  }, [data, searchTerm, showOnlyInsufficient]);

  const totalPending = new Set(data.map(d => d.Solicitacao)).size;
  const totalCost = data.reduce((acc, curr) => acc + curr.Custo_Total, 0);
  const totalInsufficient = data.filter(d => d.Qt_Solicitada > d.Saldo).length;

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Análise de Solicitações Pendentes', 14, 22);
    
    // KPIs
    doc.setFontSize(11);
    doc.text(`Solicitações Pendentes: ${totalPending}`, 14, 32);
    doc.text(`Itens em Rutura: ${totalInsufficient}`, 14, 38);
    doc.text(`Custo Financeiro Total: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}`, 14, 44);

    // Table
    const tableColumn = ["Solicitação", "Produto", "Qtd. Solicitada", "Qtd. Atendida", "Saldo", "Custo Médio", "Custo Total"];
    const tableRows: any[] = [];

    filteredData.forEach(item => {
      const itemData = [
        item.Solicitacao,
        `${item.Produto_ID} - ${item.Produto_Nome}`,
        item.Qt_Solicitada.toString(),
        item.Qt_Atendida.toString(),
        item.Saldo.toString(),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.Custo_Medio),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.Custo_Total)
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [8, 145, 178] }, // cyan-600
      didParseCell: function(data) {
        // Highlight rows where Qtd Solicitada > Saldo
        if (data.section === 'body') {
          const rowIndex = data.row.index;
          const item = filteredData[rowIndex];
          if (item && item.Qt_Solicitada > item.Saldo) {
            data.cell.styles.fillColor = [254, 226, 226]; // red-100
            data.cell.styles.textColor = [153, 27, 27]; // red-800
          }
        }
      }
    });

    doc.save('analise_pendencias.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-cyan-50 rounded-lg">
            <FileText className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Análise de Solicitações Pendentes</h2>
            <p className="text-slate-500 text-sm">
              Arraste os 3 ficheiros (Solicitações, Saldos e Custo Médio) para cruzar os dados e identificar ruturas.
            </p>
          </div>
        </div>

        {data.length === 0 && !isProcessing && (
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-cyan-500 bg-cyan-50' : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 font-medium text-lg mb-1">
              {isDragActive ? 'Largue os ficheiros aqui...' : 'Arraste os 3 ficheiros CSV para aqui'}
            </p>
            <p className="text-slate-500 text-sm">
              Ou clique para selecionar os ficheiros do seu computador
            </p>
            <div className="mt-6 flex justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Solicitações</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Saldos/Itens</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Custo Médio</span>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">A processar e cruzar dados...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {data.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Solicitações Pendentes</p>
                <p className="text-2xl font-bold text-slate-800">{totalPending}</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-lg text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Itens em Rutura (Qtd &gt; Saldo)</p>
                <p className="text-2xl font-bold text-slate-800">{totalInsufficient}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Custo Financeiro Total</p>
                <p className="text-2xl font-bold text-slate-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalCost)}
                </p>
              </div>
            </div>
          </div>

          {/* Filters & Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar solicitação ou produto..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={showOnlyInsufficient}
                      onChange={() => setShowOnlyInsufficient(!showOnlyInsufficient)}
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${showOnlyInsufficient ? 'bg-red-500' : 'bg-slate-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showOnlyInsufficient ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Filter className="w-4 h-4" />
                    Apenas Saldo Insuficiente
                  </span>
                </label>
                
                <button 
                  onClick={() => setData([])}
                  className="text-sm text-slate-500 hover:text-slate-800 underline"
                >
                  Limpar Dados
                </button>
                <button
                  onClick={generatePDF}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Gerar PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Solicitação</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-right">Qt. Solicitada</th>
                    <th className="px-4 py-3 text-right">Qt. Atendida</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-right">Custo Médio</th>
                    <th className="px-4 py-3 text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item) => {
                    const isInsufficient = item.Qt_Solicitada > item.Saldo;
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isInsufficient ? 'bg-red-50/30' : ''}`}>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.Solicitacao}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{item.Produto_Nome}</span>
                            <span className="text-xs text-slate-500">ID: {item.Produto_ID}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {item.Qt_Solicitada.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {item.Qt_Atendida.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`inline-flex items-center justify-end gap-1.5 ${isInsufficient ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                            {isInsufficient && <AlertTriangle className="w-3.5 h-3.5" />}
                            {item.Saldo.toLocaleString('pt-BR')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.Custo_Medio)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-800">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.Custo_Total)}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Nenhum registo encontrado com os filtros atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalysePendencies;
