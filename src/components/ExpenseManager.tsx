import { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  TrendingDown, 
  Search, 
  Trash2, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  FileText,
  DollarSign
} from 'lucide-react';
import { Transaction } from '../types';
import { formatRupiah, formatDateTimeIndo, getPaymentMethodLabel } from '../utils/formatters';

interface ExpenseManagerProps {
  transactions: Transaction[];
  onOpenNewExpense: () => void;
  onDeleteTransaction: (txId: string) => void;
}

export default function ExpenseManager({
  transactions,
  onOpenNewExpense,
  onDeleteTransaction,
}: ExpenseManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const expenses = useMemo(() => {
    return transactions.filter(t => t.type === 'expense');
  }, [transactions]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => set.add(e.category));
    return Array.from(set);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.notes && e.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = categoryFilter === 'all' || e.category === categoryFilter;

      return matchesSearch && matchesCat;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchQuery, categoryFilter]);

  const totalExpenseAmount = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50">
              Pengeluaran & Beban Usaha
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
              {expenses.length} Catatan
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catat belanja modal, bahan baku, listrik, gaji, dan biaya operasional untuk perhitungan laba bersih otomatis.
          </p>
        </div>

        <button
          id="btn-new-expense-main"
          onClick={onOpenNewExpense}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-rose-900/20 active:scale-95 transition-all self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Catat Pengeluaran Baru</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-rose-900 via-[#4c1d24] to-[#2b1014] text-white p-5 rounded-2xl border border-rose-800/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rose-200">
            Total Beban Operasional Tercatat
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold font-mono-num text-white mt-1">
            {formatRupiah(totalExpenseAmount)}
          </p>
        </div>
        <div className="text-xs text-rose-200/80 max-w-sm">
          Seluruh pengeluaran secara otomatis dikurangkan dari omset kotor dalam Laporan Laba Rugi bulanan.
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="bg-white dark:bg-[#11211b] p-4 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-expenses"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pengeluaran atau rincian..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#172c23] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-600"
          />
        </div>

        <select
          id="select-filter-expense-category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-[#172c23] border border-slate-200 dark:border-emerald-800/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-600 w-full sm:w-auto"
        >
          <option value="all">Semua Kategori</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-[#11211b] rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-emerald-900 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              Belum Ada Pengeluaran
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Catat setiap beban dan pembelian bahan agar laporan laba rugi UMKM akurat.
            </p>
            <button
              onClick={onOpenNewExpense}
              className="mt-4 px-4 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold hover:bg-rose-800"
            >
              + Catat Pengeluaran Sekarang
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-[#0c1813] text-slate-500 dark:text-emerald-300/70 uppercase text-[11px] font-bold border-b border-slate-100 dark:border-emerald-900/40">
                <tr>
                  <th className="py-3.5 px-4">No. Ref / Tanggal</th>
                  <th className="py-3.5 px-4">Keperluan / Keterangan</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4 text-right">Nominal</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/30">
                {filteredExpenses.map((exp) => {
                  const method = getPaymentMethodLabel(exp.paymentMethod);
                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-[#162a22]/60 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100 block">
                          {exp.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block">
                          {formatDateTimeIndo(exp.date)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top max-w-sm">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {exp.title}
                        </p>
                        {exp.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {exp.notes}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-emerald-300 border border-slate-200 dark:border-emerald-800">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {exp.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${method.badgeColor}`}>
                          {method.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top text-right">
                        <span className="font-mono-num font-extrabold text-rose-600 dark:text-rose-400 text-sm">
                          -{formatRupiah(exp.amount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 align-top text-center">
                        <button
                          id={`btn-delete-expense-${exp.id}`}
                          onClick={() => {
                            if (confirm(`Hapus catatan pengeluaran ${exp.title}?`)) {
                              onDeleteTransaction(exp.id);
                            }
                          }}
                          title="Hapus"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
