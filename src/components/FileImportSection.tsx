import React, { useState, useCallback } from 'react';
import { Upload, FileText, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';

interface FileImportSectionProps {
  folderName: string;
  onAnalyze: (files: File[]) => void;
}

const FileImportSection: React.FC<FileImportSectionProps> = ({ folderName, onAnalyze }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setUploadStatus('idle');
  }, []);

  const dropzoneOptions = {
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/html': ['.html', '.htm'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions as any);

  const removeFile = (name: string) => {
    setFiles(files.filter(f => f.name !== name));
  };

  const handleAnalyze = () => {
    if (files.length === 0) return;
    
    setIsAnalyzing(true);
    // Simulate analysis delay
    setTimeout(() => {
      setIsAnalyzing(false);
      setUploadStatus('success');
      onAnalyze(files);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-slate-900">Importação de Dados - {folderName}</h2>
        <p className="text-slate-500">
          Envie os arquivos (PDF, HTML, Imagens) para atualizar a análise de {folderName.toLowerCase()}.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-indigo-100 text-indigo-600 rounded-full">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-700">
              {isDragActive ? 'Solte os arquivos aqui...' : 'Clique ou arraste arquivos para fazer upload'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Suporta PDF, HTML e Imagens
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Arquivos Selecionados ({files.length})</h3>
            <button 
              onClick={() => setFiles([])}
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Limpar tudo
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                    {file.type.includes('pdf') ? <FileText className="w-5 h-5" /> : 
                     file.type.includes('image') ? <File className="w-5 h-5" /> : 
                     <File className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || uploadStatus === 'success'}
              className={`
                px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all
                ${uploadStatus === 'success' 
                  ? 'bg-green-600 text-white cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md'
                }
                ${isAnalyzing ? 'opacity-75 cursor-wait' : ''}
              `}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando...
                </>
              ) : uploadStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Análise Concluída
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Processar e Analisar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Message */}
      {uploadStatus === 'success' && (
        <div className="p-4 bg-green-50 text-green-800 rounded-xl border border-green-200 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold">Arquivos processados com sucesso!</h4>
            <p className="text-sm mt-1 opacity-90">
              Os dados foram extraídos e o dashboard será atualizado em breve. 
              (Simulação: Em um ambiente real, isso dispararia o processamento no backend).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileImportSection;
