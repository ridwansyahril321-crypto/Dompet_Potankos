import { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  Share2, 
  Landmark, 
  AlertCircle,
  FileSpreadsheet,
  Download,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Transaction, PaymentMethod, TransactionStatus } from '../types';
import { formatRupiah, formatDateTimeIndo, getPaymentMethodLabel } from '../utils/formatters';

interface SalesManagerProps {
  transactions: Transaction[];
  onOpenNewSale: () => void;
  onViewReceipt: (tx: Transaction) => void;
  onQuickVerifyBank: (txId: string) => void;
  onDeleteTransaction: (txId: string) => void;
  onExportCSV: () => void;
}

export default function SalesManager({
  transactions,
  onOpenNewSale,
  onViewReceipt,
  onQuickVerifyBank,
  onDeleteTransaction,
  onExportCSV,
}: SalesManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionStatus>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Filter sales only
  const sales = useMemo(() => {
    return transactions.filter(t => t.type === 'sale');
  }, [transactions]);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((item) => {
      // Search matches
      const matchesSearch = 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.customerName && item.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.bankRefNumber && item.bankRefNumber.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status matches
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      // Method matches
      const matchesMethod = methodFilter === 'all' || item.paymentMethod === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchQuery, statusFilter, methodFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalSalesAmount = sales
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + s.amount, 0);

    const pendingCount = sales.filter(s => s.status === 'pending_bank').length;
    const completedCount = sales.filter(s => s.status === 'completed').length;

    return { totalSalesAmount, pendingCount, completedCount, totalCount: sales.length };
  }, [sales]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Pencatatan Penjualan & Kasir
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {stats.totalCount} Catatan
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catat order pelanggan, pantau status pembayaran bank, dan cetak nota digital otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-sales-csv"
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#1a3328] hover:bg-slate-200 dark:hover:bg-[#214032] text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Ekspor CSV</span>
          </button>

          <button
            id="btn-new-sale-main"
            onClick={onOpenNewSale}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-900 hover:to-emerald-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/20 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4 text-emerald-200" />
            <span>+ Catat Penjualan Baru</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Total Penjualan Lunas</p>
            <p className="text-xl font-extrabold text-emerald-800 dark:text-emerald-400 font-mono-num mt-1">
              {formatRupiah(stats.totalSalesAmount)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Transaksi Berhasil</p>
            <p className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-mono-num mt-1">
              {stats.completedCount} Pesanan
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-emerald-950 flex items-center justify-center text-slate-700 dark:text-emerald-300">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#11211b] p-4 rounded-xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-amber-500">Menunggu Verifikasi Bank</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono-num mt-1">
              {stats.pendingCount} Transaksi
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-300">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#11211b] p-4 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-sales"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor faktur, nama produk, pelanggan, atau ref bank..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#172c23] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            id="select-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#172c23] border border-slate-200 dark:border-emerald-800/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            <option value="all">Semua Status</option>
            <option value="completed">Lunas (Selesai)</option>
            <option value="pending_bank">Menunggu Bank API</option>
          </select>

          {/* Payment Method Filter */}
          <select
            id="select-filter-payment-method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#172c23] border border-slate-200 dark:border-emerald-800/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
          >
            <option value="all">Semua Metode Pembayaran</option>
            <option value="transfer_bca">Transfer BCA</option>
            <option value="transfer_mandiri">Transfer Mandiri</option>
            <option value="transfer_bri">Transfer BRI</option>
            <option value="transfer_bni">Transfer BNI</option>
            <option value="qris">QRIS Instan</option>
            <option value="cash">Tunai (Cash)</option>
            <option value="ewallet">E-Wallet</option>
          </select>
        </div>
      </div>

      {/* Sales Transactions List Table */}
      <div className="bg-white dark:bg-[#11211b] rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm overflow-hidden">
        {filteredSales.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-12 h-12 text-slate-300 dark:text-emerald-900 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Tidak Ada Data Penjualan
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || methodFilter !== 'all'
                ? 'Tidak ada penjualan yang cocok dengan filter yang dipilih. Coba sesuaikan kata kunci pencarian.'
                : 'Belum ada transaksi penjualan yang dicatat. Klik tombol di bawah untuk mencatat transaksi pertama Anda.'}
            </p>
            {!searchQuery && (
              <button
                onClick={onOpenNewSale}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900"
              >
                + Catat Penjualan Sekarang
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-[#0c1813] text-slate-500 dark:text-emerald-300/70 uppercase text-[11px] font-bold border-b border-slate-100 dark:border-emerald-900/40">
                <tr>
                  <th className="py-3.5 px-4">No. Faktur / Tanggal</th>
                  <th className="py-3.5 px-4">Rincian Penjualan</th>
                  <th className="py-3.5 px-4">Pelanggan</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/30">
                {filteredSales.map((sale) => {
                  const method = getPaymentMethodLabel(sale.paymentMethod);
                  const isPending = sale.status === 'pending_bank';

                  return (
                    <tr 
                      key={sale.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-[#162a22]/60 transition-colors"
                    >
                      {/* Invoice & Date */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100 block">
                          {sale.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          {formatDateTimeIndo(sale.date)}
                        </span>
                      </td>

                      {/* Items / Description */}
                      <td className="py-3.5 px-4 align-top max-w-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {sale.title}
                        </p>
                        {sale.items && sale.items.length > 0 ? (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {sale.items.map((it, idx) => (
                              <span key={idx} className="block">
                                • {it.name} <span className="text-slate-400">({it.qty}x)</span>
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {sale.uniqueCode ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                            Kode Unik: +Rp {sale.uniqueCode}
                          </span>
                        ) : null}
                      </td>

                      {/* Customer Info */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-medium text-slate-800 dark:text-slate-200 block">
                          {sale.customerName || 'Pelanggan Umum'}
                        </span>
                        {sale.customerPhone && (
                          <span className="text-[11px] text-slate-400">
                            {sale.customerPhone}
                          </span>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${method.badgeColor}`}>
                          {method.label}
                        </span>
                        {sale.bankRefNumber && (
                          <span className="text-[10px] text-slate-400 font-mono block mt-1">
                            Ref: {sale.bankRefNumber}
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <span className="font-mono-num font-extrabold text-emerald-800 dark:text-emerald-400 text-sm">
                          {formatRupiah(sale.amount)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top text-center">
                        {sale.status === 'completed' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Lunas
                            </span>
                            {sale.verifiedBy === 'system_api' && (
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                                API Bank Verified
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                              <Clock className="w-3 h-3" /> Menunggu Bank
                            </span>
                            <button
                              id={`btn-verify-row-${sale.id}`}
                              onClick={() => onQuickVerifyBank(sale.id)}
                              className="px-2 py-0.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white text-[10px] font-bold shadow-xs active:scale-95 transition-all"
                            >
                              Verifikasi Sekarang
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            id={`btn-view-receipt-${sale.id}`}
                            onClick={() => onViewReceipt(sale)}
                            title="Lihat Struk Digital"
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>

                          <button
                            id={`btn-delete-sale-${sale.id}`}
                            onClick={() => {
                              if (confirm(`Hapus catatan penjualan ${sale.invoiceNumber}?`)) {
                                onDeleteTransaction(sale.id);
                              }
                            }}
                            title="Hapus Transaksi"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
