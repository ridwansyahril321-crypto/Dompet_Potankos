import { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Receipt, 
  TrendingDown, 
  Landmark, 
  QrCode, 
  Banknote,
  Smartphone
} from 'lucide-react';
import { Transaction, PaymentMethod, SaleItem, TransactionType } from '../types';
import { sampleProducts } from '../data/initialData';
import { formatRupiah, generateInvoiceNumber } from '../utils/formatters';

interface NewTransactionModalProps {
  initialType: TransactionType;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id'>) => void;
}

export default function NewTransactionModal({
  initialType,
  isOpen,
  onClose,
  onSubmit,
}: NewTransactionModalProps) {
  const [type, setType] = useState<TransactionType>(initialType);
  const [saleMode, setSaleMode] = useState<'catalog' | 'manual'>('catalog');

  // Common fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(type === 'sale' ? 'Produk POTANKOS' : 'Bahan Baku & Limbah TKKS');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [manualAmount, setManualAmount] = useState<number>(0);
  const [useUniqueCode, setUseUniqueCode] = useState(true);
  const [isPendingBank, setIsPendingBank] = useState(false);

  // Cart for catalog mode
  const [cartItems, setCartItems] = useState<SaleItem[]>([
    { id: 'potankos-a', name: sampleProducts[0].name, price: sampleProducts[0].price, qty: 1, subtotal: sampleProducts[0].price }
  ]);

  if (!isOpen) return null;

  // Add product to cart
  const handleAddToCart = (product: typeof sampleProducts[0]) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
            : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, qty: 1, subtotal: product.price }];
    });
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      setCartItems(prev => prev.filter((_, i) => i !== index));
      return;
    }
    setCartItems(prev => prev.map((item, i) => 
      i === index ? { ...item, qty: newQty, subtotal: newQty * item.price } : item
    ));
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate cart total
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const calculatedAmount = type === 'sale' 
    ? (saleMode === 'catalog' ? cartSubtotal : manualAmount)
    : manualAmount;

  // Unique code generation for bank transfers
  const uniqueCode = (useUniqueCode && paymentMethod.startsWith('transfer_')) 
    ? Math.floor(100 + Math.random() * 899)
    : 0;

  const totalPayable = calculatedAmount + uniqueCode;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedAmount <= 0) {
      alert('Mohon masukkan nominal yang valid!');
      return;
    }

    const now = new Date();
    const invoiceNumber = generateInvoiceNumber(now);

    let finalTitle = title;
    if (type === 'sale') {
      if (saleMode === 'catalog' && cartItems.length > 0) {
        finalTitle = cartItems.map(it => `${it.name} (${it.qty}x)`).join(', ');
      } else if (!finalTitle) {
        finalTitle = 'Penjualan Langsung Kasir';
      }
    } else {
      if (!finalTitle) finalTitle = 'Pengeluaran Usaha';
    }

    const isBank = paymentMethod.startsWith('transfer_');

    const newTx: Omit<Transaction, 'id'> = {
      invoiceNumber,
      date: now.toISOString(),
      type,
      title: finalTitle,
      category,
      amount: calculatedAmount,
      uniqueCode: uniqueCode > 0 ? uniqueCode : undefined,
      totalReceived: totalPayable,
      paymentMethod,
      status: (isBank && isPendingBank) ? 'pending_bank' : 'completed',
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      notes: notes || undefined,
      items: (type === 'sale' && saleMode === 'catalog') ? cartItems : undefined,
      verifiedAt: (!isPendingBank) ? now.toISOString() : undefined,
      verifiedBy: (!isPendingBank) ? 'manual' : undefined,
    };

    onSubmit(newTx);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#11211b] w-full max-w-2xl rounded-2xl shadow-2xl border border-emerald-900/20 dark:border-emerald-800/40 overflow-hidden animate-scaleIn my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-emerald-900/40 bg-slate-50 dark:bg-[#0c1813]">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl text-white ${type === 'sale' ? 'bg-emerald-800' : 'bg-rose-700'}`}>
              {type === 'sale' ? <Receipt className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {type === 'sale' ? 'Catat Penjualan Baru' : 'Catat Pengeluaran Beban Usaha'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sistem DOMPETKU terintegrasi otomatis ke Laporan Bulanan & API Bank
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-emerald-950"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle (Sale vs Expense) */}
        <div className="flex border-b border-slate-100 dark:border-emerald-900/40">
          <button
            type="button"
            onClick={() => {
              setType('sale');
              setCategory('Makanan & Minuman');
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              type === 'sale' 
                ? 'border-b-2 border-emerald-700 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/40' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Penjualan (Kas Masuk)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('expense');
              setCategory('Bahan Baku & Persediaan');
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
              type === 'expense' 
                ? 'border-b-2 border-rose-600 text-rose-700 dark:text-rose-300 bg-rose-50/50 dark:bg-rose-950/40' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Pengeluaran (Kas Keluar)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Sale Mode Selector: Catalog Fast POS vs Manual */}
          {type === 'sale' && (
            <div className="flex items-center justify-between bg-slate-100 dark:bg-[#0c1813] p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSaleMode('catalog')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  saleMode === 'catalog' 
                    ? 'bg-white dark:bg-[#162a22] text-emerald-800 dark:text-emerald-300 shadow-xs' 
                    : 'text-slate-500'
                }`}
              >
                Pilih Ukuran POTANKOS (Kasir Cepat)
              </button>
              <button
                type="button"
                onClick={() => setSaleMode('manual')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  saleMode === 'manual' 
                    ? 'bg-white dark:bg-[#162a22] text-emerald-800 dark:text-emerald-300 shadow-xs' 
                    : 'text-slate-500'
                }`}
              >
                Ketik Nominal Langsung (Manual)
              </button>
            </div>
          )}

          {/* Catalog POS Selector */}
          {type === 'sale' && saleMode === 'catalog' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Klik Produk Untuk Menambah ke Keranjang:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
                  {sampleProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddToCart(p)}
                      className="p-2 text-left rounded-xl bg-slate-50 dark:bg-[#162a22] hover:bg-emerald-50 dark:hover:bg-emerald-950 border border-slate-200 dark:border-emerald-800/40 transition-colors"
                    >
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {p.name}
                      </p>
                      <p className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                        {formatRupiah(p.price)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cart List */}
              <div className="bg-slate-50 dark:bg-[#0c1813] p-3 rounded-xl border border-slate-200 dark:border-emerald-900/40">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                  Keranjang Penjualan ({cartItems.length} jenis item):
                </p>
                {cartItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 text-center">Keranjang kosong. Pilih produk di atas.</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                    {cartItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-[#162a22] p-2 rounded-lg border border-slate-100 dark:border-emerald-800/30">
                        <div className="flex-1 mr-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{item.name}</span>
                          <span className="text-[11px] text-slate-400">{formatRupiah(item.price)} / unit</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-slate-200 dark:border-emerald-800/60 rounded">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, item.qty - 1)}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                            >-</button>
                            <span className="px-2 font-mono font-bold">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, item.qty + 1)}
                              className="px-2 py-0.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                            >+</button>
                          </div>
                          <span className="font-mono-num font-bold text-emerald-700 dark:text-emerald-400 min-w-[70px] text-right">
                            {formatRupiah(item.subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Manual Mode or Expense Form Fields */}
          {(type === 'expense' || saleMode === 'manual') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {type === 'sale' ? 'Nama Pesanan / Judul' : 'Keperluan Beban'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={type === 'sale' ? 'cth: Pesanan Khusus Pot Bibit Sawit' : 'cth: Belanja Limbah TKKS 1 Truk'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nominal {type === 'sale' ? 'Tagihan' : 'Pengeluaran'} (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={100}
                  placeholder="0"
                  value={manualAmount || ''}
                  onChange={(e) => setManualAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono font-bold bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            </div>
          )}

          {/* Category & Customer Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                {type === 'sale' ? (
                  <>
                    <option value="Produk POTANKOS">Produk POTANKOS (Limbah TKKS)</option>
                    <option value="Pesanan Grosir POTANKOS">Pesanan Grosir POTANKOS</option>
                    <option value="Souvenir & Event POTANKOS">Souvenir & Event POTANKOS</option>
                  </>
                ) : (
                  <>
                    <option value="Bahan Baku & Limbah TKKS">Limbah Tandan Kosong Sawit & Perekat</option>
                    <option value="Kemasan & Label POTANKOS">Kemasan & Label POTANKOS (Tali Rami)</option>
                    <option value="Upah Pengrajin Cetak & Staf">Upah Pengrajin Cetak & Staf</option>
                    <option value="Listrik Mesin Pres & Workshop">Listrik Mesin Pres & Workshop</option>
                    <option value="Logistik & Pengiriman Pot">Logistik & Pengiriman Pot</option>
                    <option value="Sewa Workshop Produksi">Sewa Workshop Produksi</option>
                    <option value="Pemeliharaan Mesin & Alat Cetak">Pemeliharaan Mesin & Alat Cetak</option>
                  </>
                )}
              </select>
            </div>

            {type === 'sale' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pelanggan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Pelanggan Umum / Ibu Siti"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>
            )}
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'transfer_bca', label: 'Transfer BCA' },
                { id: 'transfer_mandiri', label: 'Transfer Mandiri' },
                { id: 'transfer_bri', label: 'Transfer BRI' },
                { id: 'transfer_bni', label: 'Transfer BNI' },
                { id: 'qris', label: 'QRIS Instan' },
                { id: 'cash', label: 'Tunai (Cash)' },
                { id: 'ewallet', label: 'E-Wallet' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`p-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                    paymentMethod === m.id
                      ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'border-slate-200 dark:border-emerald-800/30 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bank Auto-Verification Options */}
          {type === 'sale' && paymentMethod.startsWith('transfer_') && (
            <div className="bg-emerald-50/70 dark:bg-[#0c1813] p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
                    Fitur Verifikasi API Bank Otomatis
                  </span>
                </div>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useUniqueCode}
                    onChange={(e) => setUseUniqueCode(e.target.checked)}
                    className="rounded text-emerald-700 focus:ring-emerald-700"
                  />
                  <span>Gunakan Kode Unik</span>
                </label>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200/50 dark:border-emerald-900/40">
                <span className="text-slate-600 dark:text-slate-400">Status Awal Transaksi:</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="initStatus"
                      checked={!isPendingBank}
                      onChange={() => setIsPendingBank(false)}
                      className="text-emerald-700"
                    />
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">Langsung Lunas</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="initStatus"
                      checked={isPendingBank}
                      onChange={() => setIsPendingBank(true)}
                      className="text-amber-600"
                    />
                    <span className="font-semibold text-amber-700 dark:text-amber-400">Menunggu Transfer</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catatan Transaksi (Opsional)
            </label>
            <input
              type="text"
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Total Preview */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-[#0c1813] border border-slate-200 dark:border-emerald-900/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Transaksi:</span>
              {uniqueCode > 0 && (
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  Termasuk kode unik bank (+Rp {uniqueCode})
                </span>
              )}
            </div>
            <span className="text-lg sm:text-xl font-extrabold font-mono-num text-slate-900 dark:text-slate-100">
              {formatRupiah(totalPayable)}
            </span>
          </div>

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-emerald-950"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-save-new-transaction"
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md active:scale-95 transition-all ${
                type === 'sale' 
                  ? 'bg-emerald-800 hover:bg-emerald-900' 
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              Simpan & Cetak Faktur
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
