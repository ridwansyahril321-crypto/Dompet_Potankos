import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  CheckCircle2, 
  Landmark, 
  Receipt, 
  PlusCircle, 
  Calendar, 
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Transaction, BankMutation } from '../types';
import { formatRupiah, formatDateIndo, formatDateTimeIndo, getPaymentMethodLabel } from '../utils/formatters';

interface DashboardProps {
  transactions: Transaction[];
  bankMutations: BankMutation[];
  onOpenNewSale: () => void;
  onOpenNewExpense: () => void;
  onViewReceipt: (tx: Transaction) => void;
  onNavigateToTab: (tab: string) => void;
  onQuickVerifyBank: (txId: string) => void;
  onSimulateIncomingTransfer: () => void;
}

export default function Dashboard({
  transactions,
  bankMutations,
  onOpenNewSale,
  onOpenNewExpense,
  onViewReceipt,
  onNavigateToTab,
  onQuickVerifyBank,
  onSimulateIncomingTransfer,
}: DashboardProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'this_month' | 'today' | 'all'>('this_month');

  // Filter transactions based on selected timeframe
  const filteredTxs = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (selectedTimeframe === 'today') {
      return transactions.filter(t => t.date.startsWith(todayStr));
    }
    if (selectedTimeframe === 'this_month') {
      return transactions.filter(t => t.date.startsWith(currentMonthKey));
    }
    return transactions;
  }, [transactions, selectedTimeframe]);

  // Financial summary metrics
  const metrics = useMemo(() => {
    let totalSales = 0;
    let totalExpenses = 0;
    let pendingSalesCount = 0;
    let completedSalesCount = 0;

    filteredTxs.forEach((tx) => {
      if (tx.type === 'sale') {
        if (tx.status === 'completed') {
          totalSales += tx.amount;
          completedSalesCount++;
        } else if (tx.status === 'pending_bank') {
          pendingSalesCount++;
        }
      } else if (tx.type === 'expense' && tx.status === 'completed') {
        totalExpenses += tx.amount;
      }
    });

    const netProfit = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return {
      totalSales,
      totalExpenses,
      netProfit,
      profitMargin,
      pendingSalesCount,
      completedSalesCount,
      totalCount: filteredTxs.length,
    };
  }, [filteredTxs]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const summary: Record<string, { count: number; total: number; label: string }> = {};

    filteredTxs
      .filter(t => t.type === 'sale' && t.status === 'completed')
      .forEach(t => {
        const methodInfo = getPaymentMethodLabel(t.paymentMethod);
        if (!summary[t.paymentMethod]) {
          summary[t.paymentMethod] = { count: 0, total: 0, label: methodInfo.label };
        }
        summary[t.paymentMethod].count++;
        summary[t.paymentMethod].total += t.amount;
      });

    return Object.entries(summary).sort((a, b) => b[1].total - a[1].total);
  }, [filteredTxs]);

  // Top products sold
  const topProducts = useMemo(() => {
    const productsMap: Record<string, { qty: number; revenue: number }> = {};

    filteredTxs.filter(t => t.type === 'sale' && t.status === 'completed').forEach(t => {
      if (t.items && t.items.length > 0) {
        t.items.forEach(it => {
          if (!productsMap[it.name]) {
            productsMap[it.name] = { qty: 0, revenue: 0 };
          }
          productsMap[it.name].qty += it.qty;
          productsMap[it.name].revenue += it.subtotal;
        });
      } else {
        if (!productsMap[t.title]) {
          productsMap[t.title] = { qty: 0, revenue: 0 };
        }
        productsMap[t.title].qty += 1;
        productsMap[t.title].revenue += t.amount;
      }
    });

    return Object.entries(productsMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredTxs]);

  // Dedicated POTANKOS 3 Variations Volume Analytics
  const potankosVolume = useMemo(() => {
    let countA = 0;
    let countB = 0;
    let countC = 0;
    let revA = 0;
    let revB = 0;
    let revC = 0;

    filteredTxs.filter(t => t.type === 'sale' && t.status === 'completed').forEach(t => {
      if (t.items && t.items.length > 0) {
        t.items.forEach(it => {
          if (it.id === 'potankos-a' || it.name.includes('Ukuran A')) {
            countA += it.qty;
            revA += it.subtotal;
          } else if (it.id === 'potankos-b' || it.name.includes('Ukuran B')) {
            countB += it.qty;
            revB += it.subtotal;
          } else if (it.id === 'potankos-c' || it.name.includes('Ukuran C')) {
            countC += it.qty;
            revC += it.subtotal;
          }
        });
      }
    });

    const totalUnits = countA + countB + countC;
    const totalRev = revA + revB + revC;

    return { countA, countB, countC, revA, revB, revC, totalUnits, totalRev };
  }, [filteredTxs]);

  // Last 7 days trend for chart
  const weeklyTrend = useMemo(() => {
    const days: { label: string; dateStr: string; sales: number; expense: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d);
      
      const sales = transactions
        .filter(t => t.type === 'sale' && t.status === 'completed' && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = transactions
        .filter(t => t.type === 'expense' && t.status === 'completed' && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0);

      days.push({ label: `${dayName} ${d.getDate()}`, dateStr, sales, expense });
    }

    const maxVal = Math.max(...days.map(d => Math.max(d.sales, d.expense)), 50000);
    return { days, maxVal };
  }, [transactions]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }, [transactions]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Header Banner & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-[#1b4332] to-[#122e20] dark:from-[#0a1811] dark:via-[#11241c] dark:to-[#0d1e16] p-5 sm:p-7 rounded-2xl text-white shadow-lg shadow-emerald-950/20 border border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Sistem Keuangan UMKM Terpadu
            </span>
            <span className="text-xs text-emerald-200/70 hidden sm:inline">
              POTANKOS Ecosystem
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Dashboard Rekapitulasi
          </h1>
          <p className="text-sm text-emerald-100/80 mt-1 max-w-xl">
            Pantau arus kas, realisasi penjualan, dan laba operasional usaha Anda secara langsung dengan verifikasi bank otomatis.
          </p>
        </div>

        {/* Timeframe Selector & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-center bg-black/25 p-1 rounded-xl border border-white/10">
          <button
            id="filter-timeframe-month"
            onClick={() => setSelectedTimeframe('this_month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedTimeframe === 'this_month'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white'
            }`}
          >
            Bulan Ini
          </button>
          <button
            id="filter-timeframe-today"
            onClick={() => setSelectedTimeframe('today')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedTimeframe === 'today'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white'
            }`}
          >
            Hari Ini
          </button>
          <button
            id="filter-timeframe-all"
            onClick={() => setSelectedTimeframe('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedTimeframe === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-100/70 hover:text-white'
            }`}
          >
            Semua
          </button>
        </div>
      </div>

      {/* Main Metric Cards (4 Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Total Penjualan (Omset) */}
        <div className="bg-white dark:bg-[#11211b] p-5 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm transition-all hover:border-emerald-700/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-300/70">
              Total Penjualan (Omset)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono-num">
              {formatRupiah(metrics.totalSales)}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{metrics.completedSalesCount} transaksi lunas</span>
            </div>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white dark:bg-[#11211b] p-5 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm transition-all hover:border-emerald-700/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-300/70">
              Pengeluaran Usaha
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono-num">
              {formatRupiah(metrics.totalExpenses)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Bahan baku, operasional & utilitas
            </p>
          </div>
        </div>

        {/* Laba Bersih Operasional */}
        <div className="bg-white dark:bg-[#11211b] p-5 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm transition-all hover:border-emerald-700/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-300/70">
              Laba Bersih
            </span>
            <div className={`w-9 h-9 rounded-xl ${metrics.netProfit >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800'} flex items-center justify-center`}>
              {metrics.netProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl sm:text-3xl font-extrabold font-mono-num ${metrics.netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatRupiah(metrics.netProfit)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-semibold">
              Margin Laba: <span className="font-bold text-emerald-600 dark:text-emerald-400">{metrics.profitMargin.toFixed(1)}%</span>
            </p>
          </div>
        </div>

        {/* Transaksi Pending Bank */}
        <div className="bg-white dark:bg-[#11211b] p-5 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm transition-all hover:border-emerald-700/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-300/70">
              Verifikasi Bank API
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 font-mono-num">
                {metrics.pendingSalesCount}
              </p>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                Menunggu Transfer
              </span>
            </div>
            <button
              onClick={() => onNavigateToTab('bank_api')}
              className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Cek Mutasi Bank Masuk <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

      </div>

      {/* Quick Action Bar for UMKM Daily Operational Flow */}
      <div className="bg-emerald-50/70 dark:bg-[#0e1d16] p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-800 text-white dark:bg-emerald-700 shadow-sm">
            <Sparkles className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-emerald-950 dark:text-emerald-100">
              Aksi Cepat UMKM POTANKOS
            </h2>
            <p className="text-xs text-slate-600 dark:text-emerald-300/70">
              Pencatatan langsung & integrasi verifikasi mutasi rekening instan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="dash-action-new-sale"
            onClick={onOpenNewSale}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-emerald-200" />
            + Catat Penjualan
          </button>

          <button
            id="dash-action-new-expense"
            onClick={onOpenNewExpense}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#162a22] hover:bg-slate-50 dark:hover:bg-[#1d352b] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-emerald-800/40 text-xs sm:text-sm font-semibold shadow-sm transition-all"
          >
            <TrendingDown className="w-4 h-4 text-rose-500" />
            + Catat Pengeluaran
          </button>

          <button
            id="dash-action-bank-sim"
            onClick={onSimulateIncomingTransfer}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Landmark className="w-4 h-4" />
            Simulasi Transfer Masuk
          </button>
        </div>
      </div>

      {/* Grid: 7-Days Trend Chart + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Trend Bar Chart (Custom SVG & Tailwind, ultra responsive) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Tren Penjualan & Pengeluaran 7 Hari
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Perbandingan omset masuk dengan beban operasional
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="w-3 h-3 rounded bg-emerald-600"></span> Penjualan
              </span>
              <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="w-3 h-3 rounded bg-rose-500"></span> Pengeluaran
              </span>
            </div>
          </div>

          {/* SVG Interactive Chart */}
          <div className="h-56 sm:h-64 w-full flex items-end gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-100 dark:border-emerald-900/40">
            {weeklyTrend.days.map((item, idx) => {
              const salesHeight = Math.max(8, (item.sales / weeklyTrend.maxVal) * 100);
              const expenseHeight = Math.max(8, (item.expense / weeklyTrend.maxVal) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] p-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap">
                    <span>Masuk: {formatRupiah(item.sales)}</span>
                    <span className="text-rose-300">Keluar: {formatRupiah(item.expense)}</span>
                  </div>

                  <div className="w-full flex items-end justify-center gap-1 h-[85%]">
                    {/* Sales Bar */}
                    <div
                      style={{ height: `${salesHeight}%` }}
                      className="w-1/2 max-w-[18px] bg-gradient-to-t from-emerald-800 to-emerald-500 rounded-t-sm group-hover:brightness-110 transition-all"
                    ></div>
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${expenseHeight}%` }}
                      className="w-1/2 max-w-[18px] bg-gradient-to-t from-rose-700 to-rose-400 rounded-t-sm group-hover:brightness-110 transition-all"
                    ></div>
                  </div>

                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 truncate w-full text-center">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Rata-rata Penjualan: <strong className="text-emerald-700 dark:text-emerald-400">{formatRupiah(metrics.totalSales / (weeklyTrend.days.length || 1))}</strong>/hari</span>
            <button 
              onClick={() => onNavigateToTab('reports')}
              className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
            >
              Lihat Laporan Lengkap <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Metode Pembayaran
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Distribusi pembayaran dari pelanggan
            </p>

            <div className="space-y-3">
              {paymentBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Belum ada transaksi di periode ini</p>
              ) : (
                paymentBreakdown.map(([methodKey, data]) => {
                  const percent = metrics.totalSales > 0 ? (data.total / metrics.totalSales) * 100 : 0;
                  return (
                    <div key={methodKey} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {data.label}
                        </span>
                        <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                          {formatRupiah(data.total)} ({percent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-emerald-950/60 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>SNAP Open Bank API Aktif</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-emerald-300/70 mt-1">
              BCA, Mandiri, BRI & QRIS siap memverifikasi otomatis dalam hitungan detik.
            </p>
          </div>
        </div>

      </div>

      {/* Grid: Produk Terlaris & Transaksi Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Rekapitulasi Volume Produk POTANKOS */}
        <div className="bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Produk POTANKOS
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
                Volume Penjualan
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
              {potankosVolume.totalUnits} Pcs Terjual
            </span>
          </div>

          <div className="space-y-3">
            {/* Ukuran A */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Ukuran A (Kecil)</span>
                  <span className="text-[11px] text-slate-400 block">Rp 5.000 / pcs</span>
                </div>
                <div className="text-right">
                  <span className="font-mono-num font-extrabold text-sm text-emerald-700 dark:text-emerald-300 block">
                    {potankosVolume.countA} pcs
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatRupiah(potankosVolume.revA)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ukuran B */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Ukuran B (Sedang)</span>
                  <span className="text-[11px] text-slate-400 block">Rp 10.000 / pcs</span>
                </div>
                <div className="text-right">
                  <span className="font-mono-num font-extrabold text-sm text-emerald-700 dark:text-emerald-300 block">
                    {potankosVolume.countB} pcs
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatRupiah(potankosVolume.revB)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ukuran C */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Ukuran C (Besar)</span>
                  <span className="text-[11px] text-slate-400 block">Rp 15.000 / pcs</span>
                </div>
                <div className="text-right">
                  <span className="font-mono-num font-extrabold text-sm text-emerald-700 dark:text-emerald-300 block">
                    {potankosVolume.countC} pcs
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatRupiah(potankosVolume.revC)}
                  </span>
                </div>
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-200 font-bold block">
                  Total Omset Produk
                </span>
                <span className="text-sm font-extrabold">
                  {potankosVolume.totalUnits} Unit POTANKOS
                </span>
              </div>
              <span className="text-base font-extrabold font-mono-num">
                {formatRupiah(potankosVolume.totalRev)}
              </span>
            </div>

          </div>
        </div>

        {/* Recent Transactions List with Action to Verify Pending Transactions */}
        <div className="lg:col-span-2 bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Aktivitas Transaksi Terkini
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Catatan penjualan dan pengeluaran terbaru
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('sales')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              Semua Transaksi <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-emerald-900/30">
            {recentTransactions.map((tx) => {
              const isSale = tx.type === 'sale';
              const method = getPaymentMethodLabel(tx.paymentMethod);
              const isPending = tx.status === 'pending_bank';

              return (
                <div key={tx.id} className="py-3 sm:py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSale 
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                    }`}>
                      {isSale ? <Receipt className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {tx.title}
                        </p>
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                            Menunggu Bank
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatDateTimeIndo(tx.date)}</span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${method.badgeColor}`}>
                          {method.label}
                        </span>
                        {tx.customerName && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 dark:text-slate-300 font-medium">{tx.customerName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-xs sm:text-sm font-extrabold font-mono-num ${
                      isSale ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {isSale ? '+' : '-'}{formatRupiah(tx.amount)}
                    </p>
                    
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      {isPending ? (
                        <button
                          id={`btn-verify-dash-${tx.id}`}
                          onClick={() => onQuickVerifyBank(tx.id)}
                          className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold shadow-sm"
                        >
                          Verifikasi Sekarang
                        </button>
                      ) : (
                        <button
                          id={`btn-receipt-dash-${tx.id}`}
                          onClick={() => onViewReceipt(tx)}
                          className="text-[11px] text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 font-medium underline"
                        >
                          Struk
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
