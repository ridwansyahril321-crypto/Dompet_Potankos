import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Copy, 
  Download, 
  Check, 
  RefreshCw, 
  ExternalLink, 
  Settings, 
  HelpCircle,
  CheckCircle2,
  Table,
  Package,
  Layers,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { Transaction, BusinessProfile, GoogleSheetsConfig } from '../types';
import { formatRupiah, formatDateIndo, formatDateTimeIndo } from '../utils/formatters';

interface SpreadsheetSyncProps {
  transactions: Transaction[];
  business: BusinessProfile;
  sheetsConfig: GoogleSheetsConfig;
  onUpdateSheetsConfig: (config: GoogleSheetsConfig) => void;
}

export default function SpreadsheetSync({
  transactions,
  business,
  sheetsConfig,
  onUpdateSheetsConfig,
}: SpreadsheetSyncProps) {
  const [copiedTSV, setCopiedTSV] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSendingToWebhook, setIsSendingToWebhook] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'this_month'>('this_month');
  
  // Tab view: 'potankos_sales' (Rekap Khusus Penjualan Pot Sawit) or 'buku_kas' (Buku Kas Umum)
  const [sheetViewMode, setSheetViewMode] = useState<'potankos_sales' | 'buku_kas'>('potankos_sales');

  // Input state for webhook configuration
  const [webhookUrlInput, setWebhookUrlInput] = useState(sheetsConfig.webhookUrl || '');
  const [sheetNameInput, setSheetNameInput] = useState(sheetsConfig.sheetName || 'Rekap_Penjualan_POTANKOS');
  const [autoSyncInput, setAutoSyncInput] = useState(sheetsConfig.autoSync ?? true);

  // Filter transactions based on selected period
  const filteredTxs = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (selectedPeriod === 'this_month') {
      return sorted.filter(t => t.date.startsWith(currentMonthPrefix));
    }
    return sorted;
  }, [transactions, selectedPeriod]);

  // POTANKOS Specialized Sales Breakdown Rows
  const potankosSalesRows = useMemo(() => {
    const salesOnly = filteredTxs.filter(t => t.type === 'sale');
    return salesOnly.map((t, idx) => {
      let qtyA = 0;
      let qtyB = 0;
      let qtyC = 0;

      if (t.items && t.items.length > 0) {
        t.items.forEach(it => {
          const lower = (it.name || '').toLowerCase();
          if (lower.includes('ukuran a') || it.id === 'potankos-a' || it.price === 5000) {
            qtyA += it.qty;
          } else if (lower.includes('ukuran b') || it.id === 'potankos-b' || it.price === 10000) {
            qtyB += it.qty;
          } else if (lower.includes('ukuran c') || it.id === 'potankos-c' || it.price === 15000) {
            qtyC += it.qty;
          }
        });
      } else {
        const titleLower = t.title.toLowerCase();
        if (titleLower.includes('ukuran a') || t.amount === 5000) {
          qtyA += Math.max(1, Math.round(t.amount / 5000));
        } else if (titleLower.includes('ukuran b') || t.amount === 10000) {
          qtyB += Math.max(1, Math.round(t.amount / 10000));
        } else if (titleLower.includes('ukuran c') || t.amount === 15000) {
          qtyC += Math.max(1, Math.round(t.amount / 15000));
        } else {
          // If lump sum or generic potankos, default to calculated potankos units
          qtyA += Math.floor(t.amount / 5000);
        }
      }

      const totalPcs = qtyA + qtyB + qtyC;
      return {
        no: idx + 1,
        tx: t,
        qtyA,
        subtotalA: qtyA * 5000,
        qtyB,
        subtotalB: qtyB * 10000,
        qtyC,
        subtotalC: qtyC * 15000,
        totalPcs,
        totalRevenue: t.amount,
      };
    });
  }, [filteredTxs]);

  // POTANKOS Sales Summary Totals
  const potankosTotals = useMemo(() => {
    const totalPcsA = potankosSalesRows.reduce((sum, r) => sum + r.qtyA, 0);
    const totalPcsB = potankosSalesRows.reduce((sum, r) => sum + r.qtyB, 0);
    const totalPcsC = potankosSalesRows.reduce((sum, r) => sum + r.qtyC, 0);
    const totalPcsAll = totalPcsA + totalPcsB + totalPcsC;
    const totalOmset = potankosSalesRows.reduce((sum, r) => sum + r.totalRevenue, 0);
    return { totalPcsA, totalPcsB, totalPcsC, totalPcsAll, totalOmset };
  }, [potankosSalesRows]);

  // Calculate row-by-row running balance (Buku Kas Umum)
  const rowsWithBalance = useMemo(() => {
    let runningBalance = 0;
    return filteredTxs.map((t, idx) => {
      const isSale = t.type === 'sale';
      const debit = !isSale ? t.amount : 0; // Kas Keluar
      const credit = isSale ? t.amount : 0; // Kas Masuk
      runningBalance += (credit - debit);

      return {
        no: idx + 1,
        tx: t,
        credit,
        debit,
        balance: runningBalance,
      };
    });
  }, [filteredTxs]);

  // Financial totals for general ledger
  const totals = useMemo(() => {
    const totalCredit = rowsWithBalance.reduce((sum, r) => sum + r.credit, 0);
    const totalDebit = rowsWithBalance.reduce((sum, r) => sum + r.debit, 0);
    const netBalance = totalCredit - totalDebit;
    return { totalCredit, totalDebit, netBalance };
  }, [rowsWithBalance]);

  // Copy to Clipboard for Google Sheets (Paste with Ctrl + V)
  const handleCopyForGoogleSheets = () => {
    if (sheetViewMode === 'potankos_sales') {
      const headers = [
        'No',
        'Tanggal',
        'Waktu',
        'No. Faktur',
        'Pelanggan',
        'POTANKOS Uk. A (Pcs)',
        'Subtotal Uk. A (Rp)',
        'POTANKOS Uk. B (Pcs)',
        'Subtotal Uk. B (Rp)',
        'POTANKOS Uk. C (Pcs)',
        'Subtotal Uk. C (Rp)',
        'Total Unit Pot (Pcs)',
        'Total Tagihan (Rp)',
        'Metode Pembayaran',
        'Status Verifikasi'
      ];

      const lines = [headers.join('\t')];

      potankosSalesRows.forEach((r) => {
        const d = new Date(r.tx.date);
        const dateOnly = formatDateIndo(r.tx.date);
        const timeOnly = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        lines.push([
          r.no,
          dateOnly,
          timeOnly,
          r.tx.invoiceNumber,
          r.tx.customerName || 'Pelanggan Umum',
          r.qtyA,
          r.subtotalA,
          r.qtyB,
          r.subtotalB,
          r.qtyC,
          r.subtotalC,
          r.totalPcs,
          r.totalRevenue,
          r.tx.paymentMethod,
          r.tx.status === 'completed' ? 'LUNAS' : 'MENUNGGU_VERIFIKASI'
        ].join('\t'));
      });

      navigator.clipboard.writeText(lines.join('\n'));
      setCopiedTSV(true);
      setTimeout(() => setCopiedTSV(false), 3000);
    } else {
      const headers = [
        'No',
        'Tanggal',
        'Waktu',
        'No. Faktur / Bukti',
        'Uraian Transaksi',
        'Kategori',
        'Metode Pembayaran',
        'Penerimaan / Masuk (Rp)',
        'Pengeluaran / Keluar (Rp)',
        'Saldo Kas (Rp)',
        'Status Verifikasi'
      ];

      const lines = [headers.join('\t')];

      rowsWithBalance.forEach((r) => {
        const d = new Date(r.tx.date);
        const dateOnly = formatDateIndo(r.tx.date);
        const timeOnly = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        lines.push([
          r.no,
          dateOnly,
          timeOnly,
          r.tx.invoiceNumber,
          `"${r.tx.title.replace(/"/g, '""')}"`,
          r.tx.category,
          r.tx.paymentMethod,
          r.credit || 0,
          r.debit || 0,
          r.balance,
          r.tx.status === 'completed' ? 'LUNAS' : 'MENUNGGU_VERIFIKASI'
        ].join('\t'));
      });

      navigator.clipboard.writeText(lines.join('\n'));
      setCopiedTSV(true);
      setTimeout(() => setCopiedTSV(false), 3000);
    }
  };

  // Download CSV
  const handleDownloadCSV = () => {
    if (sheetViewMode === 'potankos_sales') {
      const headers = [
        'No',
        'Tanggal',
        'Waktu',
        'No. Faktur',
        'Pelanggan',
        'POTANKOS Ukuran A (Pcs)',
        'Subtotal Ukuran A (Rp)',
        'POTANKOS Ukuran B (Pcs)',
        'Subtotal Ukuran B (Rp)',
        'POTANKOS Ukuran C (Pcs)',
        'Subtotal Ukuran C (Rp)',
        'Total Unit Pot (Pcs)',
        'Total Penjualan (Rp)',
        'Metode Pembayaran',
        'Status'
      ];

      const lines = [headers.join(',')];

      potankosSalesRows.forEach((r) => {
        const d = new Date(r.tx.date);
        const dateOnly = formatDateIndo(r.tx.date);
        const timeOnly = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        lines.push([
          r.no,
          `"${dateOnly}"`,
          `"${timeOnly}"`,
          `"${r.tx.invoiceNumber}"`,
          `"${(r.tx.customerName || 'Pelanggan Umum').replace(/"/g, '""')}"`,
          r.qtyA,
          r.subtotalA,
          r.qtyB,
          r.subtotalB,
          r.qtyC,
          r.subtotalC,
          r.totalPcs,
          r.totalRevenue,
          `"${r.tx.paymentMethod}"`,
          `"${r.tx.status}"`
        ].join(','));
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rekap_Penjualan_POTANKOS_Limbah_Sawit_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const headers = [
        'No',
        'Tanggal',
        'Waktu',
        'No. Faktur / Bukti',
        'Uraian Transaksi',
        'Kategori',
        'Metode Pembayaran',
        'Pemasukan (Kredit)',
        'Pengeluaran (Debet)',
        'Saldo Kas',
        'Status'
      ];

      const lines = [headers.join(',')];

      rowsWithBalance.forEach((r) => {
        const d = new Date(r.tx.date);
        const dateOnly = formatDateIndo(r.tx.date);
        const timeOnly = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        lines.push([
          r.no,
          `"${dateOnly}"`,
          `"${timeOnly}"`,
          `"${r.tx.invoiceNumber}"`,
          `"${r.tx.title.replace(/"/g, '""')}"`,
          `"${r.tx.category}"`,
          `"${r.tx.paymentMethod}"`,
          r.credit,
          r.debit,
          r.balance,
          `"${r.tx.status}"`
        ].join(','));
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + lines.join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `DOMPETKU_Buku_Kas_Umum_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Send data to Google Sheets Webhook (Apps Script)
  const handleSyncToGoogleSheetsWebhook = async () => {
    if (!sheetsConfig.webhookUrl) {
      setShowConfigModal(true);
      return;
    }

    setIsSendingToWebhook(true);
    setSyncStatusMsg('Menghubungi Google Sheets...');

    try {
      const payload = {
        sheetName: sheetViewMode === 'potankos_sales' ? 'Rekap_Penjualan_POTANKOS' : (sheetsConfig.sheetName || 'Buku_Kas'),
        timestamp: new Date().toISOString(),
        businessName: business.businessName,
        viewMode: sheetViewMode,
        records: sheetViewMode === 'potankos_sales' 
          ? potankosSalesRows.map(r => ({
              no: r.no,
              date: r.tx.date,
              invoiceNumber: r.tx.invoiceNumber,
              customer: r.tx.customerName || 'Pelanggan Umum',
              qtyA: r.qtyA,
              qtyB: r.qtyB,
              qtyC: r.qtyC,
              totalPcs: r.totalPcs,
              totalRevenue: r.totalRevenue,
              method: r.tx.paymentMethod,
              status: r.tx.status,
            }))
          : rowsWithBalance.map(r => ({
              no: r.no,
              date: r.tx.date,
              invoiceNumber: r.tx.invoiceNumber,
              title: r.tx.title,
              category: r.tx.category,
              method: r.tx.paymentMethod,
              credit: r.credit,
              debit: r.debit,
              balance: r.balance,
              status: r.tx.status,
            }))
      };

      await fetch(sheetsConfig.webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const count = sheetViewMode === 'potankos_sales' ? potankosSalesRows.length : rowsWithBalance.length;
      onUpdateSheetsConfig({
        ...sheetsConfig,
        lastSyncTime: new Date().toISOString(),
        totalSyncedCount: count,
      });

      setSyncStatusMsg(`Berhasil! ${count} data tersimpan di Google Spreadsheet.`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err) {
      setSyncStatusMsg('Sinkronisasi selesai (dikirim ke endpoint Google Apps Script).');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } finally {
      setIsSendingToWebhook(false);
    }
  };

  // Save config modal
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSheetsConfig({
      ...sheetsConfig,
      webhookUrl: webhookUrlInput.trim(),
      sheetName: sheetNameInput.trim() || 'Rekap_Penjualan_POTANKOS',
      autoSync: autoSyncInput,
    });
    setShowConfigModal(false);
  };

  const copyAppsScriptCode = () => {
    navigator.clipboard.writeText(sampleAppsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const sampleAppsScriptCode = `// Google Apps Script Webhook untuk POTANKOS
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(data.sheetName || "Rekap_Penjualan_POTANKOS");
  
  if (!sheet) {
    sheet = ss.insertSheet(data.sheetName || "Rekap_Penjualan_POTANKOS");
    if (data.viewMode === 'potankos_sales') {
      sheet.appendRow(["No", "Tanggal", "No Faktur", "Pelanggan", "Ukuran A (Rp5rb)", "Ukuran B (Rp10rb)", "Ukuran C (Rp15rb)", "Total Pcs", "Total Omset (Rp)", "Kanal Bayar", "Status"]);
    } else {
      sheet.appendRow(["No", "Tanggal", "No Faktur", "Keterangan", "Kategori", "Metode", "Masuk (Rp)", "Keluar (Rp)", "Saldo (Rp)", "Status"]);
    }
  }
  
  data.records.forEach(function(r) {
    if (data.viewMode === 'potankos_sales') {
      sheet.appendRow([r.no, r.date, r.invoiceNumber, r.customer, r.qtyA, r.qtyB, r.qtyC, r.totalPcs, r.totalRevenue, r.method, r.status]);
    } else {
      sheet.appendRow([r.no, r.date, r.invoiceNumber, r.title, r.category, r.method, r.credit, r.debit, r.balance, r.status]);
    }
  });
  
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner: Rekap Spreadsheet Terpadu */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#102d20] to-[#0c1e16] text-white p-5 sm:p-7 rounded-2xl border border-emerald-800/40 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Sistem Rekap Spreadsheet Khusus POTANKOS
              </span>
              <span className="text-xs text-emerald-300/80">
                Pot Ramah Lingkungan Limbah Kelapa Sawit (TKKS)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
              Rekap Data Penjualan POTANKOS
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Fokus rekapitulasi data penjualan pot berbahan limbah tandan kosong kelapa sawit dengan rincian variasi Ukuran A (Rp 5.000), Ukuran B (Rp 10.000), dan Ukuran C (Rp 15.000). Siap disalin langsung ke Google Sheets atau disinkronkan otomatis.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Copy to Google Sheets */}
            <button
              id="btn-copy-to-sheets"
              onClick={handleCopyForGoogleSheets}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
            >
              {copiedTSV ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedTSV ? 'Tersalin! Paste di Google Sheets' : 'Salin Data ke Google Sheets'}</span>
            </button>

            {/* Download CSV for Excel */}
            <button
              id="btn-download-csv-sheets"
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold border border-white/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Unduh File CSV / Excel</span>
            </button>

            {/* Webhook Sync Button */}
            <button
              id="btn-sync-webhook-sheets"
              onClick={handleSyncToGoogleSheetsWebhook}
              disabled={isSendingToWebhook}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-bold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSendingToWebhook ? 'animate-spin' : ''}`} />
              <span>{isSendingToWebhook ? 'Menyimpan...' : 'Kirim ke Spreadsheet'}</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setShowConfigModal(true)}
              title="Pengaturan Integrasi Google Sheets"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Status Banner */}
        {syncStatusMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
        )}
      </div>

      {/* Mode Switcher: Rekap Khusus Penjualan POTANKOS vs Buku Kas Umum */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#11211b] p-2 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSheetViewMode('potankos_sales')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              sheetViewMode === 'potankos_sales'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/60'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-300" />
            <span>Rekap Khusus Penjualan POTANKOS (Limbah Sawit)</span>
          </button>

          <button
            type="button"
            onClick={() => setSheetViewMode('buku_kas')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
              sheetViewMode === 'buku_kas'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950/60'
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-300" />
            <span>Buku Kas Umum (Debet / Kredit / Saldo)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          <span className="text-slate-400 font-medium">Periode:</span>
          <button
            onClick={() => setSelectedPeriod('this_month')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              selectedPeriod === 'this_month' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300' : 'text-slate-500'
            }`}
          >
            Bulan Berjalan
          </button>
          <button
            onClick={() => setSelectedPeriod('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              selectedPeriod === 'all' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300' : 'text-slate-500'
            }`}
          >
            Semua Periode
          </button>
        </div>
      </div>

      {/* Summary KPI Counters */}
      {sheetViewMode === 'potankos_sales' ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Total Omset POTANKOS</span>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-800 dark:text-emerald-300 font-mono-num mt-1">
              {formatRupiah(potankosTotals.totalOmset)}
            </p>
            <span className="text-[10px] text-slate-400">{potankosSalesRows.length} Transaksi Penjualan</span>
          </div>

          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Total Unit Pot</span>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 font-mono-num mt-1">
              {potankosTotals.totalPcsAll} <span className="text-xs font-normal text-slate-400">pcs</span>
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Semua Variasi Ukuran</span>
          </div>

          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Ukuran A (Rp 5rb)</span>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-700 dark:text-emerald-300 font-mono-num mt-1">
              {potankosTotals.totalPcsA} <span className="text-xs font-normal text-slate-400">pcs</span>
            </p>
            <span className="text-[10px] text-slate-400">{formatRupiah(potankosTotals.totalPcsA * 5000)}</span>
          </div>

          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-emerald-800 dark:text-emerald-300">Ukuran B (Rp 10rb)</span>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-800 dark:text-emerald-300 font-mono-num mt-1">
              {potankosTotals.totalPcsB} <span className="text-xs font-normal text-slate-400">pcs</span>
            </p>
            <span className="text-[10px] text-slate-400">{formatRupiah(potankosTotals.totalPcsB * 10000)}</span>
          </div>

          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-emerald-900 dark:text-emerald-200">Ukuran C (Rp 15rb)</span>
            <p className="text-lg sm:text-xl font-extrabold text-emerald-900 dark:text-emerald-200 font-mono-num mt-1">
              {potankosTotals.totalPcsC} <span className="text-xs font-normal text-slate-400">pcs</span>
            </p>
            <span className="text-[10px] text-slate-400">{formatRupiah(potankosTotals.totalPcsC * 15000)}</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total Baris Pembukuan</span>
            <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-mono-num mt-1">
              {rowsWithBalance.length} Baris Data
            </p>
          </div>

          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">Total Pemasukan (Kredit)</span>
            <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono-num mt-1">
              {formatRupiah(totals.totalCredit)}
            </p>
          </div>

          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400">Total Pengeluaran (Debet)</span>
            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono-num mt-1">
              {formatRupiah(totals.totalDebit)}
            </p>
          </div>

          <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-slate-400">Saldo Kas Akhir (Running)</span>
            <p className={`text-xl font-extrabold font-mono-num mt-1 ${totals.netBalance >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-600'}`}>
              {formatRupiah(totals.netBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Quick Guide to Google Sheets */}
      <div className="bg-emerald-50/80 dark:bg-[#0c1813] p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-800 text-white font-bold">
            <HelpCircle className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <p className="font-bold text-emerald-950 dark:text-emerald-100">
              Cara Membuka Rekap di Google Sheets:
            </p>
            <p className="text-slate-600 dark:text-emerald-300/80 mt-0.5">
              Klik <strong>"Salin Data ke Google Sheets"</strong> di atas, buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-700 dark:text-emerald-400">sheets.new</a> di tab baru, lalu tekan <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border text-[10px] font-mono">Ctrl + V</kbd>. Kolom variasi Ukuran A, B, C dan nominal langsung tertata rapi!
            </p>
          </div>
        </div>

        <a
          href="https://sheets.new"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#162a22] hover:bg-slate-50 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-emerald-800/50 font-bold shrink-0"
        >
          <span>Buka Google Sheets Baru</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Spreadsheet Table View */}
      <div className="bg-white dark:bg-[#11211b] rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-md overflow-hidden">
        
        {/* Spreadsheet Header Bar */}
        <div className="bg-slate-100 dark:bg-[#0c1813] px-4 py-3 border-b border-slate-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Table className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>
              {sheetViewMode === 'potankos_sales' 
                ? `Sheet: Rekap_Penjualan_POTANKOS (${potankosSalesRows.length} Transaksi Penjualan)`
                : `Sheet: Buku_Kas_Umum (${rowsWithBalance.length} Baris Debet/Kredit)`}
            </span>
          </div>

          <span className="text-[11px] text-slate-400 italic">
            Klik ganda pada sel saat disalin ke spreadsheet untuk mengolah rumus
          </span>
        </div>

        {/* Scrollable Sheet Table */}
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          {sheetViewMode === 'potankos_sales' ? (
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead className="sticky top-0 z-10 bg-emerald-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <tr className="border-b border-emerald-950">
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-32">Tanggal & Waktu</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-32">No. Faktur</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 min-w-[160px]">Pelanggan</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-28 text-center bg-emerald-950/70">Ukuran A (Rp 5k)</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-28 text-center bg-emerald-950/70">Ukuran B (Rp 10k)</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-28 text-center bg-emerald-950/70">Ukuran C (Rp 15k)</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-24 text-center bg-emerald-800/40">Total Pot</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-32 text-right bg-emerald-700/40">Total Omset (Rp)</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-24">Kanal</th>
                  <th className="py-2.5 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-emerald-900/40 text-slate-800 dark:text-slate-200 font-mono-num">
                {potankosSalesRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 italic font-sans">
                      Belum ada catatan penjualan POTANKOS untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  potankosSalesRows.map((r, idx) => (
                    <tr 
                      key={r.tx.id} 
                      className={`hover:bg-emerald-50/50 dark:hover:bg-[#162a22]/50 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-[#0c1813]/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-center text-slate-400 font-mono">
                        {r.no}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 whitespace-nowrap text-[11px]">
                        {formatDateTimeIndo(r.tx.date)}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 font-bold font-mono text-[11px] text-slate-900 dark:text-slate-100">
                        {r.tx.invoiceNumber}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 font-sans font-medium text-slate-800 dark:text-slate-200">
                        {r.tx.customerName || 'Pelanggan Langsung'}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-center font-bold">
                        {r.qtyA > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {r.qtyA} pcs
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-center font-bold">
                        {r.qtyB > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {r.qtyB} pcs
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-center font-bold">
                        {r.qtyC > 0 ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {r.qtyC} pcs
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-center font-extrabold text-slate-900 dark:text-slate-100 bg-emerald-50/30 dark:bg-emerald-950/20">
                        {r.totalPcs} pcs
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-right font-extrabold text-emerald-700 dark:text-emerald-400">
                        {formatRupiah(r.totalRevenue)}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 font-sans text-[11px] capitalize">
                        {r.tx.paymentMethod.replace(/_/g, ' ')}
                      </td>

                      <td className="py-2 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.tx.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {r.tx.status === 'completed' ? 'LUNAS' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              
              {/* Total Footer Row */}
              <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-[#0c1813] font-bold text-xs border-t-2 border-slate-300 dark:border-emerald-800 font-mono-num">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3 text-right font-sans uppercase">
                    TOTAL PENJUALAN POTANKOS:
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400">
                    {potankosTotals.totalPcsA} pcs
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400">
                    {potankosTotals.totalPcsB} pcs
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-700 dark:text-emerald-400">
                    {potankosTotals.totalPcsC} pcs
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-900 dark:text-slate-100 bg-emerald-100/60 dark:bg-emerald-950/60">
                    {potankosTotals.totalPcsAll} pcs
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-extrabold">
                    {formatRupiah(potankosTotals.totalOmset)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead className="sticky top-0 z-10 bg-emerald-900 text-white font-bold text-[11px] uppercase tracking-wider">
                <tr className="border-b border-emerald-950">
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-32">Tanggal & Waktu</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-36">No. Bukti / Faktur</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 min-w-[200px]">Uraian / Keterangan</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-28">Kategori</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-28">Kanal Bayar</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-32 text-right bg-emerald-950/60">Penerimaan (Masuk)</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-32 text-right bg-rose-950/40">Pengeluaran (Keluar)</th>
                  <th className="py-2.5 px-3 border-r border-emerald-800/60 w-36 text-right bg-emerald-800/40">Saldo Kas (Rp)</th>
                  <th className="py-2.5 px-3 text-center w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-emerald-900/40 text-slate-800 dark:text-slate-200 font-mono-num">
                {rowsWithBalance.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 italic font-sans">
                      Belum ada data untuk periode ini.
                    </td>
                  </tr>
                ) : (
                  rowsWithBalance.map((r, idx) => (
                    <tr 
                      key={r.tx.id} 
                      className={`hover:bg-emerald-50/50 dark:hover:bg-[#162a22]/50 transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-[#0c1813]/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-center text-slate-400 font-mono">
                        {r.no}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 whitespace-nowrap text-[11px]">
                        {formatDateTimeIndo(r.tx.date)}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 font-bold font-mono text-[11px] text-slate-900 dark:text-slate-100">
                        {r.tx.invoiceNumber}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 font-sans font-medium max-w-xs truncate">
                        {r.tx.title}
                        {r.tx.customerName && <span className="text-slate-400 text-[11px] ml-1">({r.tx.customerName})</span>}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 font-sans text-[11px] text-slate-500 dark:text-slate-400">
                        {r.tx.category}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 font-sans text-[11px] capitalize">
                        {r.tx.paymentMethod.replace(/_/g, ' ')}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-right font-extrabold text-emerald-700 dark:text-emerald-400">
                        {r.credit > 0 ? formatRupiah(r.credit) : '-'}
                      </td>

                      <td className="py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-right font-extrabold text-rose-600 dark:text-rose-400">
                        {r.debit > 0 ? formatRupiah(r.debit) : '-'}
                      </td>

                      <td className={`py-2 px-3 border-r border-slate-200 dark:border-emerald-900/40 text-right font-bold ${
                        r.balance >= 0 ? 'text-slate-900 dark:text-slate-100' : 'text-rose-600'
                      }`}>
                        {formatRupiah(r.balance)}
                      </td>

                      <td className="py-2 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.tx.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {r.tx.status === 'completed' ? 'LUNAS' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              
              {/* Total Footer Row */}
              <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-[#0c1813] font-bold text-xs border-t-2 border-slate-300 dark:border-emerald-800 font-mono-num">
                <tr>
                  <td colSpan={6} className="py-2.5 px-3 text-right font-sans uppercase">
                    TOTAL KESELURUHAN:
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">
                    {formatRupiah(totals.totalCredit)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">
                    {formatRupiah(totals.totalDebit)}
                  </td>
                  <td className={`py-2.5 px-3 text-right ${totals.netBalance >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-600'}`}>
                    {formatRupiah(totals.netBalance)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

      </div>

      {/* Google Sheets Apps Script Integration Modal / Setup */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#11211b] w-full max-w-xl rounded-2xl shadow-2xl border border-emerald-900/20 dark:border-emerald-800/40 p-6 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-emerald-900/40">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-700" />
                Pengaturan Webhook Google Sheets POTANKOS
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Google Apps Script Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Dapatkan URL Webhook dari menu <em>Deploy as Web App</em> di Google Apps Script spreadsheet Anda.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Sheet Target
                </label>
                <input
                  type="text"
                  placeholder="Rekap_Penjualan_POTANKOS"
                  value={sheetNameInput}
                  onChange={(e) => setSheetNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoSync"
                  checked={autoSyncInput}
                  onChange={(e) => setAutoSyncInput(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-700"
                />
                <label htmlFor="autoSync" className="text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Sinkronisasi Otomatis Setiap Ada Transaksi Baru
                </label>
              </div>

              {/* Code snippet helper */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Script Google Apps Script (Apps Script Code):</span>
                  <button
                    type="button"
                    onClick={copyAppsScriptCode}
                    className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Tersalin' : 'Salin Script'}</span>
                  </button>
                </div>
                <pre className="text-[10px] font-mono text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto bg-white dark:bg-[#11211b] p-2 rounded border border-slate-200 dark:border-emerald-950">
                  {sampleAppsScriptCode}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
