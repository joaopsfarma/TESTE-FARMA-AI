import React from 'react';
import { Menu, X, LayoutDashboard, FileSpreadsheet, Code, Pill, Database, AlertCircle, PieChart, ListTodo, Activity, ClipboardList, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type TabId = 'dashboard' | 'analytics' | 'transfer' | 'vba' | 'import' | 'followup' | 'dispensary' | 'genesis' | 'previsibilidade' | 'equivalencia' | 'dispensaryProject' | 'pedido24h' | 'rastreio';

// Define the nav item structure with classes specific to Sidebar
export interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  classes: {
    activeBg: string;
    activeText: string;
    activeBorder: string;
    iconActive: string;
    badgeBg: string;
    badgeText: string;
  };
}

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  navItems: readonly NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  activeTab, 
  setActiveTab,
  navItems
}) => {
  return (
    <>
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 z-50
          w-72 flex-shrink-0 flex flex-col transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-slate-100 hidden md:block">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-2.5 rounded-xl shadow-md shadow-emerald-200">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Logística Farma</h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Gestão Inteligente</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Menu Principal</p>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium transition-all group relative overflow-hidden
                    ${isActive 
                      ? `${item.classes.activeBg} ${item.classes.activeText} shadow-sm border ${item.classes.activeBorder}` 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}
                  `}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={`
                      transition-colors
                      ${isActive ? item.classes.iconActive : 'text-slate-400 group-hover:text-slate-600'}
                    `}>
                      {item.icon}
                    </div>
                    {item.label}
                  </div>
                  
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active" 
                      className={`absolute inset-0 ${item.classes.activeBg} opacity-50 pointer-events-none`}
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <div className="flex items-center gap-2 relative z-10">
                    {item.badge !== undefined && item.badge > 0 ? (
                      <span className={`
                        px-2 py-0.5 rounded-full text-[10px] font-bold
                        ${isActive ? `${item.classes.badgeBg} ${item.classes.badgeText}` : 'bg-slate-200 text-slate-600'}
                      `}>
                        {item.badge}
                      </span>
                    ) : null}
                    {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-100">
           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
             <p className="text-xs text-slate-500 font-medium">Sistema Atualizado</p>
             <p className="text-[10px] text-slate-400 mt-1">v2.0.0 • Hoje</p>
           </div>
        </div>
      </aside>
    </>
  );
};
