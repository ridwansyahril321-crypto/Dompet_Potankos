import { useState, useEffect } from 'react';
import { 
  Wallet, 
  RefreshCw, 
  Moon, 
  Sun, 
  Building2, 
  PlusCircle, 
  Landmark,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { BusinessProfile } from '../types';

interface HeaderProps {
  business: BusinessProfile;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  activeTab: string;
  onChangeTab: (tab: string) => void;
  isSyncing: boolean;
  onTriggerSync: () => void;
  lastSyncTime: Date;
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
  pendingCount: number;
}

export default function Header({
  business,
  darkMode,
  onToggleDarkMode,
  activeTab,
  onChangeTab,
  isSyncing,
  onTriggerSync,
  lastSyncTime,
  onOpenNewSale,
  onOpenNewExpense,
  pendingCount,
}: HeaderProps) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000);
      setSecondsAgo(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const navItems = [
    { id: 'pemasukan', label: 'Pemasukan', icon: ArrowUpCircle, badge: pendingCount > 0 ? pendingCount : null },
    { id: 'pengeluaran', label: 'Pengeluaran', icon: ArrowDownCircle },
    { id: 'spreadsheet', label: 'Rekap Spreadsheet', icon: FileSpreadsheet, highlight: true },
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'reports', label: 'Laporan Bulanan', icon: Building2 },
    { id: 'bank_api', label: 'API Bank SNAP', icon: Landmark },
  ];


  return (
    <header className="sticky top-0 z-30 border-b border-emerald-900/10 dark:border-emerald-800/20 bg-white/95 dark:bg-[#0c1813]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2 sm:gap-4">
          
          {/* Brand Logo & UMKM Identity */}
          <div className="flex items-center gap-3">
            <button 
              id="brand-home-btn"
              onClick={() => onChangeTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-[#122e20] dark:from-emerald-700 dark:to-emerald-950 flex items-center justify-center text-white shadow-md shadow-emerald-900/20 group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-emerald-950 dark:text-emerald-50">
                    DOMPET<span className="text-emerald-600 dark:text-emerald-400">KU</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hidden sm:inline-block">
                    POTANKOS
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-emerald-200/60 font-medium truncate max-w-[160px] sm:max-w-xs">
                  {business.businessName}
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => onChangeTab(item.id)}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-emerald-800 text-white dark:bg-emerald-700 shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-slate-900 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Header Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Real-time Sync Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isSyncing ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSyncing ? 'bg-amber-500' : 'bg-emerald-600'}`}></span>
              </span>
              <div className="text-left leading-none">
                <p className="text-[11px] font-semibold text-emerald-950 dark:text-emerald-100">
                  {isSyncing ? 'Menyinkronkan...' : 'Real-time Aktif'}
                </p>
                <p className="text-[9px] text-slate-500 dark:text-emerald-300/70">
                  {secondsAgo < 5 ? 'Baru saja' : `${secondsAgo}d lalu`}
                </p>
              </div>
              <button
                id="btn-manual-sync"
                title="Sinkronkan Data & Mutasi Bank Sekarang"
                onClick={onTriggerSync}
                disabled={isSyncing}
                className="p-1 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/50 dark:hover:bg-emerald-900/50 rounded transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Quick Action Button: Catat Penjualan */}
            <button
              id="btn-quick-new-sale"
              onClick={onOpenNewSale}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs sm:text-sm font-semibold shadow-sm shadow-emerald-900/20 active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-emerald-200" />
              <span className="hidden sm:inline">Catat</span> Penjualan
            </button>

            {/* Dark Mode Switcher */}
            <button
              id="btn-toggle-dark-mode"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
              className="p-2 sm:p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/80 border border-slate-200 dark:border-emerald-900/50 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-900" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="lg:hidden border-t border-emerald-900/10 dark:border-emerald-800/20 bg-white/95 dark:bg-[#0c1813]/95 px-2 py-1.5 overflow-x-auto no-scrollbar flex items-center justify-between gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={`mob-${item.id}`}
              id={`nav-link-mobile-${item.id}`}
              onClick={() => onChangeTab(item.id)}
              className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-lg flex flex-col items-center gap-1 text-[11px] font-semibold transition-all ${
                isActive 
                  ? 'bg-emerald-800 text-white dark:bg-emerald-700' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : ''}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold rounded-full bg-amber-500 text-slate-900">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[70px]">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
