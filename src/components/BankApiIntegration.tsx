import { useState } from 'react';
import { 
  Landmark, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft, 
  KeyRound, 
  Send, 
  Layers, 
  Code2,
  Copy,
  Check
} from 'lucide-react';
import { BankConfig, BankMutation, Transaction } from '../types';
import { formatRupiah, formatDateTimeIndo } from '../utils/formatters';

interface BankApiIntegrationProps {
  bankConfigs: BankConfig[];
  mutations: BankMutation[];
  pendingTransactions: Transaction[];
  onTriggerSync: () => void;
  isSyncing: boolean;
  onSimulateWebhook: (data: {
    bankCode: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI';
    amount: number;
    description: string;
    targetInvoiceNumber?: string;
  }) => void;
  onManualMatch: (mutationId: string, invoiceId: string) => void;
}

export default function BankApiIntegration({
  bankConfigs,
  mutations,
  pendingTransactions,
  onTriggerSync,
  isSyncing,
  onSimulateWebhook,
  onManualMatch,
}: BankApiIntegrationProps) {
  // Simulator form state
  const [simBank, setSimBank] = useState<'BCA' | 'MANDIRI' | 'BRI' | 'BNI'>('BCA');
  const [simAmount, setSimAmount] = useState<number>(
    pendingTransactions.length > 0 ? (pendingTransactions[0].totalReceived || pendingTransactions[0].amount) : 150000
  );
  const [simSender, setSimSender] = useState<string>('Pelanggan Setia UMKM');
  const [selectedInvoiceToMatch, setSelectedInvoiceToMatch] = useState<string>(
    pendingTransactions.length > 0 ? pendingTransactions[0].invoiceNumber : ''
  );
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const webhookEndpoint = 'https://api.potankos.id/v1/snap/bank/webhook';

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    const desc = `TRSF OPEN-BANKING CR / ${selectedInvoiceToMatch || 'INV-UMKM'} ${simSender.toUpperCase()}`;
    onSimulateWebhook({
      bankCode: simBank,
      amount: Number(simAmount),
      description: desc,
      targetInvoiceNumber: selectedInvoiceToMatch || undefined,
    });
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(webhookEndpoint);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2500);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-[#102a1f] to-[#0c1d16] text-white p-5 sm:p-7 rounded-2xl border border-emerald-800/40 shadow-lg shadow-emerald-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                SNAP BI Open Banking
              </span>
              <span className="text-xs text-emerald-300/80">
                Standar Nasional Open API Pembayaran
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Integrasi API Bank & Verifikasi Otomatis
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 mt-1 max-w-2xl">
              Hubungkan rekening bank UMKM Anda (BCA, Mandiri, BRI, BNI). Mutasi masuk akan terdeteksi dan mencocokkan nota penjualan secara otomatis tanpa perlu periksa m-banking manual.
            </p>
          </div>

          <button
            id="btn-sync-bank-now"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md transition-all self-start md:self-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Menghubungi Bank...' : 'Sinkronkan Mutasi Sekarang'}</span>
          </button>
        </div>
      </div>

      {/* Connected Banks Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {bankConfigs.map((bank) => {
          const isConnected = bank.status === 'connected';
          return (
            <div
              key={bank.bankCode}
              className="bg-white dark:bg-[#11211b] p-4 sm:p-5 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center font-black text-xs text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                      {bank.bankCode}
                    </div>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {bank.bankCode}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isConnected 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {isConnected ? '● Terhubung' : '● Sandbox Test'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {bank.bankName}
                </p>
                <p className="text-xs font-mono-num font-bold text-slate-800 dark:text-slate-200 mt-1">
                  {bank.accountNo}
                </p>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  A/N: {bank.accountHolder}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-900/40 flex items-center justify-between text-[11px] text-slate-400">
                <span>Webhook Aktif</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
                  {bank.apiKeyMasked}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Simulator Section: Tes Mutasi Bank Masuk Instan */}
      <div className="bg-white dark:bg-[#11211b] p-5 sm:p-6 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Simulator Webhook Bank API Masuk (Uji Verifikasi Instan)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gunakan fitur ini untuk mensimulasikan pelanggan yang mentransfer dana ke rekening Anda secara langsung.
            </p>
          </div>
        </div>

        <form onSubmit={handleSimulate} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-[#0c1813] p-4 rounded-xl border border-slate-200 dark:border-emerald-900/40">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
              Bank Pengirim / Tujuan
            </label>
            <select
              value={simBank}
              onChange={(e) => setSimBank(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
            >
              <option value="BCA">Bank Central Asia (BCA)</option>
              <option value="MANDIRI">Bank Mandiri</option>
              <option value="BRI">Bank Rakyat Indonesia (BRI)</option>
              <option value="BNI">Bank BNI</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
              Cocokkan Faktur Penjualan (Opsional)
            </label>
            <select
              value={selectedInvoiceToMatch}
              onChange={(e) => {
                const inv = e.target.value;
                setSelectedInvoiceToMatch(inv);
                const found = pendingTransactions.find(p => p.invoiceNumber === inv);
                if (found) {
                  setSimAmount(found.totalReceived || found.amount);
                  if (found.customerName) setSimSender(found.customerName);
                }
              }}
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold bg-white dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
            >
              <option value="">-- Pilih Tagihan Pending --</option>
              {pendingTransactions.map(p => (
                <option key={p.id} value={p.invoiceNumber}>
                  {p.invoiceNumber} - {p.customerName || 'Umum'} ({formatRupiah(p.totalReceived || p.amount)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
              Nominal Transfer Masuk (Rp)
            </label>
            <input
              type="number"
              value={simAmount}
              onChange={(e) => setSimAmount(Number(e.target.value))}
              required
              min={1000}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono font-bold bg-white dark:bg-[#162a22] border border-slate-200 dark:border-emerald-800/50 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              id="btn-submit-bank-simulation"
              className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simulasikan Transfer Masuk</span>
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Mutation Ledger Table */}
      <div className="bg-white dark:bg-[#11211b] rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-emerald-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Log Rekonsiliasi & Mutasi Rekening Bank
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Semua mutasi kredit (dana masuk) dan debet (dana keluar) yang terdeteksi via API Bank
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verifikasi Otomatis Aktif</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-[#0c1813] text-slate-500 dark:text-emerald-300/70 uppercase text-[11px] font-bold border-b border-slate-100 dark:border-emerald-900/40">
              <tr>
                <th className="py-3 px-4">Waktu / Bank</th>
                <th className="py-3 px-4">Nomor Referensi</th>
                <th className="py-3 px-4">Keterangan Mutasi</th>
                <th className="py-3 px-4">Tipe</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Status Rekonsiliasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-emerald-900/30">
              {mutations.map((m) => {
                const isCredit = m.type === 'CR';
                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-[#162a22]/60 transition-colors">
                    <td className="py-3 px-4 align-top">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {m.bankCode}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTimeIndo(m.timestamp)}
                      </span>
                    </td>

                    <td className="py-3 px-4 align-top font-mono text-slate-600 dark:text-slate-300">
                      {m.refNumber}
                    </td>

                    <td className="py-3 px-4 align-top max-w-sm">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {m.description}
                      </p>
                    </td>

                    <td className="py-3 px-4 align-top">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        isCredit 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {isCredit ? 'CR (Masuk)' : 'DB (Keluar)'}
                      </span>
                    </td>

                    <td className="py-3 px-4 align-top text-right">
                      <span className={`font-mono-num font-extrabold ${
                        isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {isCredit ? '+' : '-'}{formatRupiah(m.amount)}
                      </span>
                    </td>

                    <td className="py-3 px-4 align-top text-center">
                      {m.matched ? (
                        <div className="inline-flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Cocok & Lunas
                          </span>
                          {m.matchedInvoiceNumber && (
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {m.matchedInvoiceNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-emerald-950 text-slate-600 dark:text-slate-300">
                          Mutasi Terverifikasi
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Endpoint & Integration Specs for Developers / POTANKOS Technical */}
      <div className="bg-white dark:bg-[#11211b] p-5 rounded-2xl border border-emerald-900/10 dark:border-emerald-800/30 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
          <Code2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          Konfigurasi Endpoint Webhook Bank
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Pasang URL webhook ini di dashboard Developer BCA SNAP, Kopra Mandiri, atau BRIAPI Anda untuk menerima notifikasi pembayaran instan.
        </p>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0c1813] p-2.5 rounded-xl border border-slate-200 dark:border-emerald-900/50">
          <code className="text-xs font-mono text-emerald-800 dark:text-emerald-300 flex-1 truncate">
            {webhookEndpoint}
          </code>
          <button
            onClick={handleCopyEndpoint}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1a3328] hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-emerald-800/40"
          >
            {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEndpoint ? 'Disalin' : 'Salin'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
