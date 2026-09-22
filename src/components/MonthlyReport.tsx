import { useState, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  Printer, 
  Download, 
  Share2, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CheckCircle, 
  FileText,
  Copy,
  ChevronDown
} from 'lucide-react';
import { Transaction, BusinessProfile } from '../types';
import { formatRupiah, formatDateIndo, formatDateTimeIndo } from '../utils/formatters';

interface MonthlyReportProps {
  transactions: Transaction[];
  business: BusinessProfile;
}

export default function MonthlyReport({
  transactions,
  business,
}: MonthlyReportProps) {
  // Extract unique available months from transactions
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      const ym = t.date.substring(0, 7); // 'YYYY-MM'
      monthsSet.add(ym);
    });

    const sorted = Array.from(monthsSet).sort().reverse();
    return sorted.length > 0 ? sorted : ['2026-09'];
  }, [transactions]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || '2026-09');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Month label formatter (e.g., 'September 2026')
  const monthLabel = useMemo(() => {
    try {
      const [year, month] = selectedMonth.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  // Filter transactions for chosen month
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Financial calculations
  const reportData = useMemo(() => {
    let grossSales = 0;
    let pendingSales = 0;
    let salesCount = 0;
    let expenseTotal = 0;
    const expenseByCategory: Record<string, number> = {};
    const salesByMethod: Record<string, number> = {};

    monthTransactions.forEach(t => {
      if (t.type === 'sale') {
        if (t.status === 'completed') {
          grossSales += t.amount;
          salesCount++;
          salesByMethod[t.paymentMethod] = (salesByMethod[t.paymentMethod] || 0) + t.amount;
        } else if (t.status === 'pending_bank') {
          pendingSales += t.amount;
        }
      } else if (t.type === 'expense' && t.status === 'completed') {
        expenseTotal += t.amount;
        const cat = t.category || 'Lain-lain';
        expenseByCategory[cat] = (expenseByCategory[cat] || 0) + t.amount;
      }
    });

    const netProfit = grossSales - expenseTotal;
    const profitMargin = grossSales > 0 ? (netProfit / grossSales) * 100 : 0;

    return {
      grossSales,
      pendingSales,
      salesCount,
      expenseTotal,
      expenseByCategory,
      salesByMethod,
      netProfit,
      profitMargin,
    };
  }, [monthTransactions]);

  // Handle Print
  const handlePrint = () => {
    window.print();
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = ['Tanggal', 'No. Faktur', 'Tipe', 'Kategori', 'Keterangan', 'Metode Pembayaran', 'Nominal (Rp)', 'Status'];
    const rows = monthTransactions.map(t => [
      formatDateIndo(t.date),
      t.invoiceNumber,
      t.type === 'sale' ? 'Penjualan' : 'Pengeluaran',
      t.category,
      `"${t.title.replace(/"/g, '""')}"`,
      t.paymentMethod,
      t.amount,
      t.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_DOMPETKU_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy WhatsApp Summary
  const handleCopyWhatsApp = () => {
    const text = 
      `*LAPORAN KEUANGAN BULANAN UMKM*\n` +
      `*${business.businessName}* (DOMPETKU by POTANKOS)\n` +
      `Periode: ${monthLabel}\n` +
      `--------------------------------\n` +
      `💰 *RINGKASAN LABA RUGI:*\n` +
      `• Total Pendapatan Usaha : ${formatRupiah(reportData.grossSales)} (${reportData.salesCount} transaksi)\n` +
      `• Total Pengeluaran      : ${formatRupiah(reportData.expenseTotal)}\n` +
      `--------------------------------\n` +
      `📈 *LABA BERSIH (NET PROFIT) : ${formatRupiah(reportData.netProfit)}*\n` +
      `• Margin Laba Bersih    : ${reportData.profitMargin.toFixed(1)}%\n` +
      (reportData.pendingSales > 0 ? `• Piutang/Menunggu Bank : ${formatRupiah(reportData.pendingSales)}\n` : '') +
      `--------------------------------\n` +
      `_Dibuat otomatis oleh Sistem Keuangan Terpadu DOMPETKU POTANKOS_`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Month Selector & Report Actions Header */}
      <div className="no-print bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Laporan Keuangan Bulanan Otomatis
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              SAK EMKM Ready
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kompilasi otomatis laba rugi, arus kas, dan beban usaha standar POTANKOS untuk UMKM.
          </p>
        </div>

        {/* Controls: Select Month, Print, Export, WA */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month selector dropdown */}
          <div className="relative">
            <select
              id="select-report-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="pl-3.5 pr-8 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-100 dark:bg-[#1a3328] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700 appearance-none cursor-pointer"
            >
              {availableMonths.map((m) => {
                const [y, mm] = m.split('-');
                const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(parseInt(y), parseInt(mm) - 1, 1));
                return (
                  <option key={m} value={m}>{label}</option>
                );
              })}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Copy WhatsApp text */}
          <button
            id="btn-copy-wa-report"
            onClick={handleCopyWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm font-semibold border border-emerald-200/80 dark:border-emerald-800/40 transition-colors"
          >
            {copiedSuccess ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedSuccess ? 'Tersalin!' : 'Salin WhatsApp'}</span>
          </button>

          {/* Export CSV */}
          <button
            id="btn-export-report-csv"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1a3328] hover:bg-slate-200 dark:hover:bg-[#214032] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          {/* Print PDF */}
          <button
            id="btn-print-report"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Printer className="w-4 h-4 text-emerald-200" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Official Report Document Sheet (Printable) */}
      <div className="bg-white dark:bg-[#11211b] rounded-2xl border border-slate-200 dark:border-emerald-800/30 p-6 sm:p-10 shadow-md">
        
        {/* Letterhead / Kop Surat Resmi POTANKOS UMKM */}
        <div className="border-b-2 border-slate-800 dark:border-emerald-600/60 pb-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-emerald-900 dark:text-emerald-400">
                  DOMPETKU
                </span>
                <span className="text-xs uppercase px-2 py-0.5 font-bold rounded bg-emerald-900 text-white dark:bg-emerald-700">
                  POTANKOS
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {business.businessName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {business.address} • Telp: {business.phone} • Email: {business.email}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs uppercase tracking-widest font-bold text-slate-400 dark:text-emerald-300/70 block">
                Dokumen Laporan Keuangan
              </span>
              <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                Periode: {monthLabel}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Dicetak pada: {formatDateIndo(new Date().toISOString())}
              </p>
            </div>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/50">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Pendapatan Usaha</span>
            <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono-num mt-1">
              {formatRupiah(reportData.grossSales)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Dari {reportData.salesCount} transaksi terverifikasi
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/50">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Total Beban Operasional</span>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-mono-num mt-1">
              {formatRupiah(reportData.expenseTotal)}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {Object.keys(reportData.expenseByCategory).length} pos pengeluaran
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/50">
            <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Laba Bersih Usaha (Net Profit)</span>
            <p className={`text-2xl font-extrabold font-mono-num mt-1 ${reportData.netProfit >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-600'}`}>
              {formatRupiah(reportData.netProfit)}
            </p>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block">
              Margin Laba: {reportData.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Laporan Laba Rugi Formal (Income Statement Table) */}
        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-emerald-900/40 pb-2 mb-4">
            I. LAPORAN LABA RUGI (INCOME STATEMENT)
          </h3>

          <div className="space-y-4 text-xs sm:text-sm">
            {/* Section A: Pendapatan */}
            <div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 py-1 bg-slate-50 dark:bg-[#0c1813] px-3 rounded">
                <span>A. PENDAPATAN OPERASIONAL</span>
                <span className="font-mono-num">{formatRupiah(reportData.grossSales)}</span>
              </div>
              <div className="pl-6 pr-3 py-1.5 flex justify-between text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-emerald-950">
                <span>Penjualan Bersih (Lunas)</span>
                <span className="font-mono-num">{formatRupiah(reportData.grossSales)}</span>
              </div>
              {reportData.pendingSales > 0 && (
                <div className="pl-6 pr-3 py-1.5 flex justify-between text-amber-600 dark:text-amber-400 border-b border-slate-100 dark:border-emerald-950">
                  <span>Piutang / Menunggu Verifikasi Bank</span>
                  <span className="font-mono-num">{formatRupiah(reportData.pendingSales)}</span>
                </div>
              )}
            </div>

            {/* Section B: Beban Pengeluaran */}
            <div>
              <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 py-1 bg-slate-50 dark:bg-[#0c1813] px-3 rounded">
                <span>B. BEBAN POKOK & OPERASIONAL</span>
                <span className="font-mono-num text-rose-600 dark:text-rose-400">({formatRupiah(reportData.expenseTotal)})</span>
              </div>
              {Object.keys(reportData.expenseByCategory).length === 0 ? (
                <p className="text-xs text-slate-400 italic pl-6 py-2">Tidak ada beban tercatat untuk periode ini.</p>
              ) : (
                Object.entries(reportData.expenseByCategory).map(([cat, amt]) => (
                  <div key={cat} className="pl-6 pr-3 py-1.5 flex justify-between text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-emerald-950">
                    <span>{cat}</span>
                    <span className="font-mono-num">{formatRupiah(amt)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Total Net Profit Row */}
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 flex justify-between items-center text-sm sm:text-base font-extrabold text-emerald-950 dark:text-emerald-100">
              <span>LABA BERSIH OPERASIONAL (NET PROFIT)</span>
              <span className="font-mono-num text-emerald-700 dark:text-emerald-400">
                {formatRupiah(reportData.netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Section II: Arus Kas & Saluran Pembayaran */}
        <div className="mb-8">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-emerald-900/40 pb-2 mb-4">
            II. DISTRIBUSI KAS MASUK BERDASARKAN KANAL
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(reportData.salesByMethod).map(([method, amount]) => (
              <div key={method} className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-100 dark:border-emerald-900/30 flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                  {method.replace(/_/g, ' ')}
                </span>
                <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                  {formatRupiah(amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Signature & Accountability Block */}
        <div className="border-t border-slate-200 dark:border-emerald-900/40 pt-6 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <p className="font-bold text-slate-700 dark:text-slate-300">
              POTANKOS Keuangan Terpadu UMKM
            </p>
            <p className="text-[11px] mt-0.5">
              Sistem verifikasi otomatis SNAP BI & integrasi kasir digital.
            </p>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-slate-600 dark:text-slate-300 mb-12">
              Disahkan oleh Pemilik Usaha:
            </p>
            <p className="font-extrabold text-slate-900 dark:text-slate-100 border-t border-slate-400 pt-1 inline-block min-w-[160px]">
              {business.ownerName}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
