import React from 'react';
import { Menu, X, Pill } from 'lucide-react';

interface MobileHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  return (
    <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-600 p-2 rounded-xl shadow-sm">
          <Pill className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">Logística Farma</h1>
        </div>
      </div>
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </div>
  );
};
