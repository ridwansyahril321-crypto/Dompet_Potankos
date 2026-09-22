import { useState, useMemo } from 'react';
import { 
  PlusCircle, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Search, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  Landmark, 
  Trash2, 
  FileSpreadsheet,
  Package, 
  CreditCard, 
  Users, 
  Tag, 
  Sparkles, 
  Zap, 
  Truck, 
  Home, 
  DollarSign, 
  Wrench, 
  Minus,
  Plus,
  RotateCcw,
  Layers,
  Banknote,
  QrCode
} from 'lucide-react';
import { Transaction, PaymentMethod, SaleItem } from '../types';
import { potankosVariants } from '../data/initialData';
import { formatRupiah, formatDateTimeIndo, generateInvoiceNumber, getPaymentMethodLabel } from '../utils/formatters';

interface TransactionCenterProps {
  transactions: Transaction[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (txId: string) => void;
  onViewReceipt: (tx: Transaction) => void;
  onQuickVerifyBank: (txId: string) => void;
  onNavigateToSpreadsheet: () => void;
  initialMode?: 'pemasukan' | 'pengeluaran';
}

export default function TransactionCenter({
  transactions,
  onAddTransaction,
  onDeleteTransaction,
  onViewReceipt,
  onQuickVerifyBank,
  onNavigateToSpreadsheet,
  initialMode = 'pemasukan',
}: TransactionCenterProps) {
  // Main Menu Toggle: Pemasukan vs Pengeluaran
  const [activeMenu, setActiveMenu] = useState<'pemasukan' | 'pengeluaran'>(initialMode);

  // POTANKOS Fast POS State (Count for Size A, B, C)
  const [qtyA, setQtyA] = useState<number>(0);
  const [qtyB, setQtyB] = useState<number>(0);
  const [qtyC, setQtyC] = useState<number>(0);

  // General Customer & Payment details
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isPendingBank, setIsPendingBank] = useState(false);
  const [useUniqueCode, setUseUniqueCode] = useState(true);

  // Expense form state
  const [selectedExpenseType, setSelectedExpenseType] = useState<string>('bahan_baku');
  const [expenseTitle, setExpenseTitle] = useState('Bahan Baku Sabut Kelapa POTANKOS');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseMethod, setExpenseMethod] = useState<PaymentMethod>('transfer_bca');

  // Search & Filter in list below
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Calculate POTANKOS Fast POS Totals
  const totalPcsA = qtyA;
  const totalPcsB = qtyB;
  const totalPcsC = qtyC;
  const totalPcsAll = totalPcsA + totalPcsB + totalPcsC;

  const totalRpA = totalPcsA * 5000;
  const totalRpB = totalPcsB * 10000;
  const totalRpC = totalPcsC * 15000;
  const subtotalPotankos = totalRpA + totalRpB + totalRpC;

  // Unique code for bank transfer
  const isBankPayment = paymentMethod.startsWith('transfer_');
  const uniqueCode = (isBankPayment && useUniqueCode && subtotalPotankos > 0) ? Math.floor(100 + Math.random() * 899) : 0;
  const grandTotalPotankos = subtotalPotankos + uniqueCode;

  // Reset Fast POS form
  const handleResetFastPOS = () => {
    setQtyA(0);
    setQtyB(0);
    setQtyC(0);
    setCustomerName('');
    setIsPendingBank(false);
  };

  // Submit Fast POS Sale
  const handleSavePotankosSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPcsAll <= 0 || subtotalPotankos <= 0) {
      alert('Pilih minimal 1 variasi produk POTANKOS (Ukuran A, B, atau C) terlebih dahulu!');
      return;
    }

    const now = new Date();
    const invoiceNumber = generateInvoiceNumber(now);

    // Build items list
    const items: SaleItem[] = [];
    const titlesList: string[] = [];

    if (qtyA > 0) {
      items.push({ id: 'potankos-a', name: 'POTANKOS Ukuran A', price: 5000, qty: qtyA, subtotal: totalRpA });
      titlesList.push(`Ukuran A (${qtyA} pcs)`);
    }
    if (qtyB > 0) {
      items.push({ id: 'potankos-b', name: 'POTANKOS Ukuran B', price: 10000, qty: qtyB, subtotal: totalRpB });
      titlesList.push(`Ukuran B (${qtyB} pcs)`);
    }
    if (qtyC > 0) {
      items.push({ id: 'potankos-c', name: 'POTANKOS Ukuran C', price: 15000, qty: qtyC, subtotal: totalRpC });
      titlesList.push(`Ukuran C (${qtyC} pcs)`);
    }

    const finalTitle = `Penjualan POTANKOS: ${titlesList.join(', ')}`;

    const newTx: Omit<Transaction, 'id'> = {
      invoiceNumber,
      date: now.toISOString(),
      type: 'sale',
      title: finalTitle,
      category: 'Produk POTANKOS',
      amount: subtotalPotankos,
      uniqueCode: uniqueCode > 0 ? uniqueCode : undefined,
      totalReceived: grandTotalPotankos,
      paymentMethod,
      status: (isBankPayment && isPendingBank) ? 'pending_bank' : 'completed',
      customerName: customerName || undefined,
      items,
      verifiedAt: (!isPendingBank) ? now.toISOString() : undefined,
      verifiedBy: (!isPendingBank) ? 'manual' : undefined,
    };

    onAddTransaction(newTx);
    handleResetFastPOS();
  };

  // Submit Expense Form
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = Number(expenseAmount);
    if (!nominal || nominal <= 0) {
      alert('Masukkan nominal pengeluaran yang valid!');
      return;
    }

    const now = new Date();
    const invoiceNumber = generateInvoiceNumber(now);

    const expenseCategoryMap: Record<string, string> = {
      bahan_baku: 'Bahan Baku & Persediaan',
      gaji: 'Gaji & Honorarium',
      utilitas: 'Operasional & Utilitas',
      sewa: 'Sewa Tempat',
      logistik: 'Logistik & Transportasi',
      kemasan: 'Perlengkapan & Kemasan',
      lainnya: 'Lain-lain',
    };

    const newTx: Omit<Transaction, 'id'> = {
      invoiceNumber,
      date: now.toISOString(),
      type: 'expense',
      title: expenseTitle || 'Pengeluaran Usaha POTANKOS',
      category: expenseCategoryMap[selectedExpenseType] || 'Beban Operasional',
      amount: nominal,
      paymentMethod: expenseMethod,
      status: 'completed',
      notes: expenseNotes || undefined,
      verifiedAt: now.toISOString(),
      verifiedBy: 'manual',
    };

    onAddTransaction(newTx);
    setExpenseAmount('');
    setExpenseNotes('');
  };

  // Jenis Transaksi Pengeluaran Definitions Khusus POTANKOS
  const expenseTypes = [
    {
      id: 'bahan_baku',
      label: 'Limbah Tandan Kosong Sawit & Perekat',
      sublabel: 'Limbah TKKS, tepung tapioka/perekat alami',
      icon: Package,
    },
    {
      id: 'kemasan',
      label: 'Kemasan & Label POTANKOS',
      sublabel: 'Tali rami, stiker sablon & kantong ramah lingkungan',
      icon: Tag,
    },
    {
      id: 'gaji',
      label: 'Upah Pengrajin Cetak & Staf',
      sublabel: 'Honor pekerja pencacah & pencetak pot',
      icon: Users,
    },
    {
      id: 'utilitas',
      label: 'Listrik Mesin Pres & Workshop',
      sublabel: 'Biaya PLN mesin pres hidrolik & utilitas air',
      icon: Zap,
    },
    {
      id: 'logistik',
      label: 'Logistik & Pengiriman Pot',
      sublabel: 'Biaya angkut limbah TKKS & kirim pesanan pot',
      icon: Truck,
    },
    {
      id: 'sewa',
      label: 'Sewa Workshop Produksi',
      sublabel: 'Biaya sewa workshop / gudang pengeringan pot',
      icon: Home,
    },
    {
      id: 'lainnya',
      label: 'Pemeliharaan Mesin & Alat Cetak',
      sublabel: 'Perawatan mesin pencacah & cetakan pot',
      icon: Wrench,
    },
  ];

  // Aggregated Volume of POTANKOS Sold across all transactions
  const potankosAnalytics = useMemo(() => {
    let countA = 0;
    let countB = 0;
    let countC = 0;
    let revA = 0;
    let revB = 0;
    let revC = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'sale' && tx.items) {
        tx.items.forEach((item) => {
          if (item.id === 'potankos-a' || item.name.includes('Ukuran A')) {
            countA += item.qty;
            revA += item.subtotal;
          } else if (item.id === 'potankos-b' || item.name.includes('Ukuran B')) {
            countB += item.qty;
            revB += item.subtotal;
          } else if (item.id === 'potankos-c' || item.name.includes('Ukuran C')) {
            countC += item.qty;
            revC += item.subtotal;
          }
        });
      }
    });

    const totalUnits = countA + countB + countC;
    const totalRev = revA + revB + revC;

    return { countA, countB, countC, revA, revB, revC, totalUnits, totalRev };
  }, [transactions]);

  // Financial totals
  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'sale') {
        if (tx.status === 'completed') totalIncome += tx.amount;
      } else if (tx.type === 'expense' && tx.status === 'completed') {
        totalExpense += tx.amount;
      }
    });

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [transactions]);

  // Filtered transactions for the current tab
  const filteredList = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesMenu = activeMenu === 'pemasukan' ? t.type === 'sale' : t.type === 'expense';
        if (!matchesMenu) return false;

        const matchesSearch =
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.customerName && t.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          t.category.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCat = filterCategory === 'all' || t.category === filterCategory;

        return matchesSearch && matchesCat;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, activeMenu, searchQuery, filterCategory]);

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* 1. Header Dual Switcher: Pemasukan vs Pengeluaran */}
      <div className="bg-white dark:bg-[#11211b] p-3 sm:p-4 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          <div className="grid grid-cols-2 gap-2 sm:gap-3 flex-1">
            <button
              id="menu-btn-pemasukan"
              onClick={() => setActiveMenu('pemasukan')}
              className={`p-3 sm:p-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base ${
                activeMenu === 'pemasukan'
                  ? 'bg-gradient-to-r from-emerald-800 to-emerald-700 text-white shadow-md shadow-emerald-900/30 ring-2 ring-emerald-500'
                  : 'bg-emerald-50/60 dark:bg-[#152a21] text-emerald-900 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-[#1a352a]'
              }`}
            >
              <ArrowUpCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${activeMenu === 'pemasukan' ? 'text-emerald-200' : 'text-emerald-700'}`} />
              <div className="text-left leading-tight">
                <span className="block text-[10px] uppercase tracking-wider font-extrabold opacity-80">Kas Masuk</span>
                <span>Pemasukan Penjualan POTANKOS</span>
              </div>
            </button>

            <button
              id="menu-btn-pengeluaran"
              onClick={() => setActiveMenu('pengeluaran')}
              className={`p-3 sm:p-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all text-sm sm:text-base ${
                activeMenu === 'pengeluaran'
                  ? 'bg-gradient-to-r from-rose-800 to-rose-700 text-white shadow-md shadow-rose-900/30 ring-2 ring-rose-500'
                  : 'bg-rose-50/60 dark:bg-[#2b1519] text-rose-900 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-[#381c21]'
              }`}
            >
              <ArrowDownCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${activeMenu === 'pengeluaran' ? 'text-rose-200' : 'text-rose-600'}`} />
              <div className="text-left leading-tight">
                <span className="block text-[10px] uppercase tracking-wider font-extrabold opacity-80">Kas Keluar</span>
                <span>Pengeluaran Biaya & Bahan Baku</span>
              </div>
            </button>
          </div>

          <button
            id="btn-shortcut-spreadsheet"
            onClick={onNavigateToSpreadsheet}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-900/10 dark:bg-emerald-950/60 hover:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200 font-bold text-xs sm:text-sm border border-emerald-300/60 dark:border-emerald-800/60 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>Rekap Spreadsheet (Google Sheets)</span>
          </button>

        </div>

        {/* Quick Balance Status Ticker */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-emerald-900/40 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-emerald-400">Total Pemasukan</span>
            <p className="font-mono-num font-extrabold text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm mt-0.5">
              {formatRupiah(totals.totalIncome)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/30">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-rose-400">Total Pengeluaran</span>
            <p className="font-mono-num font-extrabold text-rose-600 dark:text-rose-300 text-xs sm:text-sm mt-0.5">
              {formatRupiah(totals.totalExpense)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-[#0c1813]">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Saldo Kas Bersih</span>
            <p className={`font-mono-num font-extrabold text-xs sm:text-sm mt-0.5 ${totals.balance >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-600'}`}>
              {formatRupiah(totals.balance)}
            </p>
          </div>
        </div>
      </div>

      {/* 2. MODE PEMASUKAN: KASIR CEPAT 1-TAP PRODUK POTANKOS */}
      {activeMenu === 'pemasukan' && (
        <div className="bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm space-y-6">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-emerald-900/40 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300">
                  Kasir 1-Tap Cepat
                </span>
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                  Khusus Produk POTANKOS
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                Pencatatan Penjualan Produk POTANKOS
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Pot Ramah Lingkungan Berbahan Dasar Limbah Tandan Kosong Kelapa Sawit (TKKS). Pilih jumlah variasi ukuran yang dibeli pelanggan di bawah ini. Nominal dihitung otomatis dan langsung tersimpan ke pembukuan spreadsheet.
              </p>
            </div>

            {totalPcsAll > 0 && (
              <button
                type="button"
                onClick={handleResetFastPOS}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-600 self-start sm:self-auto font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Pilihan</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSavePotankosSale} className="space-y-6">
            
            {/* 3 VARIATION BIG TOUCH CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Ukuran A - Rp 5.000 */}
              <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all relative ${
                qtyA > 0 
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/60 shadow-md ring-2 ring-emerald-500/20' 
                  : 'border-slate-200 dark:border-emerald-800/40 bg-slate-50/50 dark:bg-[#162a22]/40 hover:border-emerald-400'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-800 text-white">
                      Ukuran A
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                      POTANKOS Ukuran A
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tipe Kecil (Bibit & Tanaman Meja)
                    </p>
                  </div>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-800 dark:text-emerald-300">
                    Rp 5.000 <span className="text-[10px] font-normal text-slate-400">/pcs</span>
                  </span>
                </div>

                {/* Touch Stepper */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-emerald-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Jumlah:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQtyA(prev => Math.max(0, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-[#0c1813] border border-slate-300 dark:border-emerald-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 active:scale-95 font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qtyA}
                        onChange={(e) => setQtyA(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-14 h-8 text-center font-mono font-extrabold text-sm rounded-lg bg-white dark:bg-[#0c1813] border border-slate-300 dark:border-emerald-800 text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setQtyA(prev => prev + 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-900 active:scale-95 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Badges */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {[+1, +5, +10, +20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQtyA(prev => prev + num)}
                        className="flex-1 py-1 rounded bg-slate-200/70 dark:bg-emerald-900/40 hover:bg-emerald-200 text-[11px] font-bold text-slate-700 dark:text-emerald-200 transition-colors"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>

                  {/* Subtotal preview for A */}
                  <div className="mt-2.5 text-right font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {qtyA > 0 ? `${qtyA} pcs = ${formatRupiah(totalRpA)}` : '0 pcs = Rp 0'}
                  </div>
                </div>
              </div>

              {/* Ukuran B - Rp 10.000 */}
              <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all relative ${
                qtyB > 0 
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/60 shadow-md ring-2 ring-emerald-500/20' 
                  : 'border-slate-200 dark:border-emerald-800/40 bg-slate-50/50 dark:bg-[#162a22]/40 hover:border-emerald-400'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-700 text-white">
                      Ukuran B
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                      POTANKOS Ukuran B
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tipe Sedang (Tanaman Hias & Sayuran)
                    </p>
                  </div>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-800 dark:text-emerald-300">
                    Rp 10.000 <span className="text-[10px] font-normal text-slate-400">/pcs</span>
                  </span>
                </div>

                {/* Touch Stepper */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-emerald-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Jumlah:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQtyB(prev => Math.max(0, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-[#0c1813] border border-slate-300 dark:border-emerald-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 active:scale-95 font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qtyB}
                        onChange={(e) => setQtyB(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-14 h-8 text-center font-mono font-extrabold text-sm rounded-lg bg-white dark:bg-[#0c1813] border border-slate-300 dark:border-emerald-800 text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setQtyB(prev => prev + 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-900 active:scale-95 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Badges */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {[+1, +5, +10, +20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQtyB(prev => prev + num)}
                        className="flex-1 py-1 rounded bg-slate-200/70 dark:bg-emerald-900/40 hover:bg-emerald-200 text-[11px] font-bold text-slate-700 dark:text-emerald-200 transition-colors"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>

                  {/* Subtotal preview for B */}
                  <div className="mt-2.5 text-right font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {qtyB > 0 ? `${qtyB} pcs = ${formatRupiah(totalRpB)}` : '0 pcs = Rp 0'}
                  </div>
                </div>
              </div>

              {/* Ukuran C - Rp 15.000 */}
              <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all relative ${
                qtyC > 0 
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/60 shadow-md ring-2 ring-emerald-500/20' 
                  : 'border-slate-200 dark:border-emerald-800/40 bg-slate-50/50 dark:bg-[#162a22]/40 hover:border-emerald-400'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-900 text-white">
                      Ukuran C
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                      POTANKOS Ukuran C
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tipe Besar (Pohon & Buah Tabulampot)
                    </p>
                  </div>
                  <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-800 dark:text-emerald-300">
                    Rp 15.000 <span className="text-[10px] font-normal text-slate-400">/pcs</span>
                  </span>
                </div>

                {/* Touch Stepper */}
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-emerald-800/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Jumlah:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQtyC(prev => Math.max(0, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-white dark:bg-[#0c1813] border border-slate-300 dark:border-emerald-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 active:scale-95 font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={qtyC}
                        onChange={(e) => setQtyC(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-14 h-8 text-center font-mono font-extrabold text-sm rounded-lg bg-white dark:bg-[#0c1813] border border-slate-300 dark:border-emerald-800 text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => setQtyC(prev => prev + 1)}
                        className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center hover:bg-emerald-900 active:scale-95 font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Badges */}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    {[+1, +5, +10, +20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQtyC(prev => prev + num)}
                        className="flex-1 py-1 rounded bg-slate-200/70 dark:bg-emerald-900/40 hover:bg-emerald-200 text-[11px] font-bold text-slate-700 dark:text-emerald-200 transition-colors"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>

                  {/* Subtotal preview for C */}
                  <div className="mt-2.5 text-right font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    {qtyC > 0 ? `${qtyC} pcs = ${formatRupiah(totalRpC)}` : '0 pcs = Rp 0'}
                  </div>
                </div>
              </div>

            </div>

            {/* CUSTOMER & PAYMENT ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pelanggan / Pembeli (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Pelanggan Umum / Ibu Siti"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {[
                    { id: 'cash', label: 'Tunai Kasir', icon: Banknote },
                    { id: 'qris', label: 'QRIS Instan', icon: QrCode },
                    { id: 'transfer_bca', label: 'Transfer BCA', icon: Landmark },
                    { id: 'transfer_mandiri', label: 'Transfer Mandiri', icon: Landmark },
                    { id: 'transfer_bri', label: 'Transfer BRI', icon: Landmark },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(m.id as PaymentMethod);
                          if (m.id.startsWith('transfer_')) {
                            setIsPendingBank(true);
                          } else {
                            setIsPendingBank(false);
                          }
                        }}
                        className={`p-2 rounded-xl text-left border text-xs font-bold flex items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'border-emerald-700 bg-emerald-800 text-white shadow-sm'
                            : 'border-slate-200 dark:border-emerald-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* LIVE TOTAL ORDER SUMMARY & ACTION BUTTON */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-[#133525] to-[#0c2017] text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-emerald-300 font-extrabold">
                    Ringkasan Penjualan POTANKOS:
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold font-mono">
                    {totalPcsAll} Unit Pot Terpilih
                  </span>
                </div>
                <div className="text-xs text-emerald-200/80 mt-1 flex flex-wrap gap-2">
                  {qtyA > 0 && <span>• Ukuran A: {qtyA} pcs</span>}
                  {qtyB > 0 && <span>• Ukuran B: {qtyB} pcs</span>}
                  {qtyC > 0 && <span>• Ukuran C: {qtyC} pcs</span>}
                  {totalPcsAll === 0 && <span className="italic text-emerald-300/60">Pilih jumlah pot di kartu atas untuk memulai</span>}
                </div>
                {uniqueCode > 0 && (
                  <p className="text-[11px] text-amber-300 mt-1">
                    *Termasuk kode unik transfer bank: +Rp {uniqueCode}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <span className="text-[10px] uppercase text-emerald-300 font-bold block">Total Tagihan</span>
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono-num text-white">
                    {formatRupiah(grandTotalPotankos)}
                  </span>
                </div>

                <button
                  type="submit"
                  id="btn-save-potankos-sale"
                  disabled={totalPcsAll === 0}
                  className="px-6 py-3.5 rounded-xl font-extrabold text-sm sm:text-base bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none shrink-0"
                >
                  ✓ Simpan Penjualan
                </button>
              </div>
            </div>

          </form>

          {/* POTANKOS SALES VOLUME RECAP CARDS */}
          <div className="pt-2 border-t border-slate-100 dark:border-emerald-900/40">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-emerald-300 mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              Rekapitulasi Volume Penjualan Produk POTANKOS
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-500">Ukuran A (Rp 5.000)</span>
                <p className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono-num mt-0.5">
                  {potankosAnalytics.countA} Pcs
                </p>
                <span className="text-[11px] text-slate-400 font-mono">{formatRupiah(potankosAnalytics.revA)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-500">Ukuran B (Rp 10.000)</span>
                <p className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono-num mt-0.5">
                  {potankosAnalytics.countB} Pcs
                </p>
                <span className="text-[11px] text-slate-400 font-mono">{formatRupiah(potankosAnalytics.revB)}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/40">
                <span className="text-[10px] uppercase font-bold text-slate-500">Ukuran C (Rp 15.000)</span>
                <p className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400 font-mono-num mt-0.5">
                  {potankosAnalytics.countC} Pcs
                </p>
                <span className="text-[11px] text-slate-400 font-mono">{formatRupiah(potankosAnalytics.revC)}</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-800 text-white">
                <span className="text-[10px] uppercase font-bold text-emerald-200">Total Keseluruhan</span>
                <p className="text-base sm:text-lg font-extrabold font-mono-num mt-0.5">
                  {potankosAnalytics.totalUnits} Pcs POTANKOS
                </p>
                <span className="text-[11px] text-emerald-200/90 font-mono">{formatRupiah(potankosAnalytics.totalRev)}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 3. MODE PENGELUARAN: CATAT BIAYA PRODUKSI & OPERASIONAL POTANKOS */}
      {activeMenu === 'pengeluaran' && (
        <div className="bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-rose-900/10 dark:border-rose-800/30 shadow-sm space-y-6">
          
          <div className="border-b border-slate-100 dark:border-emerald-900/40 pb-4">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300">
              Pengeluaran & Beban Usaha
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              Catat Pengeluaran Produksi POTANKOS
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih jenis pengeluaran di bawah untuk mencatat modal bahan baku, upah tenaga kerja, dan biaya operasional.
            </p>
          </div>

          {/* Jenis Pengeluaran Chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Pilih Kategori Beban:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {expenseTypes.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedExpenseType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedExpenseType(item.id);
                      setExpenseTitle(item.label);
                    }}
                    className={`p-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50 dark:bg-rose-950/80 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-emerald-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                      isSelected ? 'bg-rose-700 text-white' : 'bg-slate-100 dark:bg-[#0c1813] text-slate-600 dark:text-slate-400'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold line-clamp-1">{item.label}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{item.sublabel}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expense Input Fields */}
          <form onSubmit={handleSaveExpense} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Uraian / Keterangan Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Pembelian Limbah Tandan Kosong Sawit 1 Truk"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal Pengeluaran (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  placeholder="0"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold bg-white dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Metode Pembayaran
                </label>
                <select
                  value={expenseMethod}
                  onChange={(e) => setExpenseMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
                >
                  <option value="transfer_bca">Transfer Bank BCA</option>
                  <option value="transfer_mandiri">Transfer Bank Mandiri</option>
                  <option value="transfer_bri">Transfer Bank BRI</option>
                  <option value="cash">Tunai (Kas Toko)</option>
                  <option value="ewallet">E-Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="cth: Nota nomor #8821 dari supplier"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-700 hover:bg-rose-800 shadow-md active:scale-95 transition-all"
              >
                + Simpan Pengeluaran
              </button>
            </div>
          </form>

        </div>
      )}

      {/* 4. TABEL REKAP BUKU KAS TRANSAKSI */}
      <div className="bg-white dark:bg-[#11211b] rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Daftar Rekap {activeMenu === 'pemasukan' ? 'Pemasukan (Penjualan POTANKOS)' : 'Pengeluaran (Beban Usaha)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {filteredList.length} transaksi tercatat pada menu ini
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi..."
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/40 text-slate-800 dark:text-slate-100"
              />
            </div>

            <button
              onClick={onNavigateToSpreadsheet}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Buka Spreadsheet</span>
            </button>
          </div>
        </div>

        {/* Table Items */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-[#0c1813] text-slate-500 dark:text-emerald-300/70 uppercase text-[11px] font-bold border-b border-slate-100 dark:border-emerald-900/40">
              <tr>
                <th className="py-3 px-4">Tanggal / No. Faktur</th>
                <th className="py-3 px-4">Uraian / Keterangan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/30">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    Belum ada data transaksi {activeMenu === 'pemasukan' ? 'pemasukan' : 'pengeluaran'}.
                  </td>
                </tr>
              ) : (
                filteredList.map((tx) => {
                  const method = getPaymentMethodLabel(tx.paymentMethod);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-[#162a22]/60 transition-colors">
                      <td className="py-3 px-4 align-top">
                        <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100 block">
                          {tx.invoiceNumber}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDateTimeIndo(tx.date)}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-top max-w-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{tx.title}</p>
                        {tx.customerName && (
                          <span className="text-[11px] text-slate-400 block">Pelanggan: {tx.customerName}</span>
                        )}
                        {tx.items && tx.items.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tx.items.map((it, idx) => (
                              <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-semibold">
                                {it.name.replace('POTANKOS ', '')}: {it.qty}x
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-emerald-950 text-slate-700 dark:text-emerald-300">
                          {tx.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${method.badgeColor}`}>
                          {method.label}
                        </span>
                        {tx.bankRefNumber && (
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            Ref: {tx.bankRefNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top text-right">
                        <span className={`font-mono-num font-extrabold text-sm ${
                          tx.type === 'sale' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {tx.type === 'sale' ? '+' : '-'}{formatRupiah(tx.amount)}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-top text-center">
                        {tx.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="w-3 h-3" /> Lunas
                          </span>
                        ) : (
                          <button
                            onClick={() => onQuickVerifyBank(tx.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 hover:scale-105 transition-transform"
                          >
                            <Clock className="w-3 h-3" /> Verifikasi Bank
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1">
                          {tx.type === 'sale' && (
                            <button
                              onClick={() => onViewReceipt(tx)}
                              title="Cetak Struk"
                              className="p-1 rounded text-slate-500 hover:text-emerald-700"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm(`Hapus ${tx.invoiceNumber}?`)) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            title="Hapus Transaksi"
                            className="p-1 rounded text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
