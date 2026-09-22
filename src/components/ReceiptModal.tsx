import { useState } from 'react';
import { 
  X, 
  Printer, 
  Share2, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Wallet,
  ShieldCheck
} from 'lucide-react';
import { Transaction, BusinessProfile } from '../types';
import { formatRupiah, formatDateTimeIndo, getPaymentMethodLabel, generateWhatsAppReceiptText } from '../utils/formatters';

interface ReceiptModalProps {
  transaction: Transaction | null;
  business: BusinessProfile;
  onClose: () => void;
}

export default function ReceiptModal({
  transaction,
  business,
  onClose,
}: ReceiptModalProps) {
  const [copiedWA, setCopiedWA] = useState(false);

  if (!transaction) return null;

  const isSale = transaction.type === 'sale';
  const method = getPaymentMethodLabel(transaction.paymentMethod);
  const isPending = transaction.status === 'pending_bank';

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppReceiptText(transaction, business.businessName);
    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#11211b] w-full max-w-md rounded-2xl shadow-2xl border border-emerald-900/20 dark:border-emerald-800/40 overflow-hidden animate-scaleIn">
        
        {/* Modal Top Actions */}
        <div className="no-print flex items-center justify-between p-4 border-b border-slate-100 dark:border-emerald-900/40 bg-slate-50 dark:bg-[#0c1813]">
          <span className="text-xs font-bold text-slate-500 dark:text-emerald-300 uppercase tracking-wider">
            Struk Transaksi Digital
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-emerald-950"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Body */}
        <div id="receipt-paper" className="p-6 sm:p-7 text-slate-800 dark:text-slate-100">
          
          {/* Header Store Info */}
          <div className="text-center border-b border-dashed border-slate-300 dark:border-emerald-800/60 pb-5">
            <div className="inline-flex items-center gap-1.5 justify-center mb-1">
              <span className="font-black text-xl tracking-tight text-emerald-900 dark:text-emerald-400">
                DOMPETKU
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                POTANKOS
              </span>
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              {business.businessName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {business.address}
            </p>
            <p className="text-xs text-slate-400">
              Telp / WA: {business.phone}
            </p>
          </div>

          {/* Transaction Metadata */}
          <div className="py-4 border-b border-dashed border-slate-300 dark:border-emerald-800/60 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">No. Faktur:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{transaction.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Tanggal:</span>
              <span>{formatDateTimeIndo(transaction.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Pelanggan:</span>
              <span className="font-semibold">{transaction.customerName || 'Pelanggan Umum'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Metode Bayar:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${method.badgeColor}`}>
                {method.label}
              </span>
            </div>
            {transaction.bankRefNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Ref Bank API:</span>
                <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400">{transaction.bankRefNumber}</span>
              </div>
            )}
          </div>

          {/* Items Purchased List */}
          <div className="py-4 border-b border-dashed border-slate-300 dark:border-emerald-800/60">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
              Rincian Item
            </span>
            <div className="space-y-2 text-xs">
              {transaction.items && transaction.items.length > 0 ? (
                transaction.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</p>
                      <p className="text-[11px] text-slate-400">{item.qty} x {formatRupiah(item.price)}</p>
                    </div>
                    <span className="font-mono-num font-bold text-slate-900 dark:text-slate-100">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span className="font-semibold">{transaction.title}</span>
                  <span className="font-mono-num font-bold">{formatRupiah(transaction.amount)}</span>
                </div>
              )}

              {transaction.uniqueCode ? (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                  <span>Kode Unik Verifikasi Otomatis</span>
                  <span className="font-mono-num">+Rp {transaction.uniqueCode}</span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Total & Status */}
          <div className="py-4 border-b border-slate-200 dark:border-emerald-800/60 space-y-2">
            <div className="flex justify-between items-center text-sm sm:text-base font-extrabold">
              <span>TOTAL DIBAYAR:</span>
              <span className="font-mono-num text-emerald-800 dark:text-emerald-400 text-lg">
                {formatRupiah(transaction.totalReceived || transaction.amount)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">Status Pembayaran:</span>
              {transaction.status === 'completed' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> LUNAS TERVERIFIKASI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 animate-pulse">
                  <Clock className="w-4 h-4" /> MENUNGGU VERIFIKASI BANK
                </span>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-4 text-center text-[11px] text-slate-400 space-y-1">
            <p className="font-medium text-slate-600 dark:text-slate-300">
              Terima kasih telah berbelanja di {business.businessName}!
            </p>
            <p>
              Struk sah terintegrasi sistem keuangan UMKM POTANKOS.
            </p>
          </div>

        </div>

        {/* Modal Bottom Actions (Buttons for Share & Print) */}
        <div className="no-print p-4 bg-slate-50 dark:bg-[#0c1813] border-t border-slate-100 dark:border-emerald-900/40 flex items-center justify-end gap-2">
          <button
            onClick={handleCopyWhatsApp}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-xs font-bold border border-emerald-300 dark:border-emerald-800"
          >
            {copiedWA ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedWA ? 'Tersalin!' : 'Bagikan ke WhatsApp'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk</span>
          </button>
        </div>

      </div>
    </div>
  );
}
