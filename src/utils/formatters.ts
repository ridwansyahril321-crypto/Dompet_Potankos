import { PaymentMethod, Transaction } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateTimeIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatTimeOnly(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): { label: string; badgeColor: string; iconName: string } {
  switch (method) {
    case 'transfer_bca':
      return { label: 'Transfer BCA', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800', iconName: 'Landmark' };
    case 'transfer_mandiri':
      return { label: 'Transfer Mandiri', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800', iconName: 'Landmark' };
    case 'transfer_bri':
      return { label: 'Transfer BRI', badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800', iconName: 'Landmark' };
    case 'transfer_bni':
      return { label: 'Transfer BNI', badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800', iconName: 'Landmark' };
    case 'qris':
      return { label: 'QRIS Instan', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800', iconName: 'QrCode' };
    case 'cash':
      return { label: 'Tunai (Cash)', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800', iconName: 'Banknote' };
    case 'ewallet':
      return { label: 'E-Wallet', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800', iconName: 'Smartphone' };
    default:
      return { label: method, badgeColor: 'bg-slate-100 text-slate-800', iconName: 'CreditCard' };
  }
}

export function generateInvoiceNumber(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV/DOM-${y}${m}${d}/${rand}`;
}

export function generateWhatsAppReceiptText(tx: Transaction, businessName: string): string {
  const itemsText = tx.items && tx.items.length > 0 
    ? tx.items.map(it => `• ${it.name} (${it.qty}x) = ${formatRupiah(it.subtotal)}`).join('\n')
    : `• ${tx.title} = ${formatRupiah(tx.amount)}`;

  return `*STRUK PENJUALAN DIGITAL*\n` +
    `*${businessName}* (Sistem DOMPETKU by POTANKOS)\n` +
    `--------------------------------\n` +
    `No. Faktur : ${tx.invoiceNumber}\n` +
    `Tanggal    : ${formatDateTimeIndo(tx.date)}\n` +
    `Pelanggan  : ${tx.customerName || 'Pelanggan Umum'}\n` +
    `Metode     : ${getPaymentMethodLabel(tx.paymentMethod).label}\n` +
    `Status     : ${tx.status === 'completed' ? '✅ LUNAS' : '⏳ MENUNGGU VERIFIKASI'}\n` +
    (tx.bankRefNumber ? `Ref Bank   : ${tx.bankRefNumber}\n` : '') +
    `--------------------------------\n` +
    `RINCIAN PESANAN:\n${itemsText}\n` +
    `--------------------------------\n` +
    `*TOTAL TAGIHAN : ${formatRupiah(tx.amount)}*\n` +
    `--------------------------------\n` +
    `Terima kasih telah berbelanja di tempat kami! Simpan bukti transaksi ini.`;
}
