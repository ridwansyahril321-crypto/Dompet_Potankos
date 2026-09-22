import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import TransactionCenter from './components/TransactionCenter';
import SpreadsheetSync from './components/SpreadsheetSync';
import MonthlyReport from './components/MonthlyReport';
import BankApiIntegration from './components/BankApiIntegration';
import ReceiptModal from './components/ReceiptModal';
import NewTransactionModal from './components/NewTransactionModal';
import { 
  Transaction, 
  BankMutation, 
  BankConfig, 
  BusinessProfile,
  TransactionType,
  GoogleSheetsConfig
} from './types';
import { 
  initialBusinessProfile, 
  initialBankConfigs, 
  initialTransactions, 
  initialBankMutations 
} from './data/initialData';
import { formatRupiah } from './utils/formatters';
import { CheckCircle2, Bell, X, ShieldAlert } from 'lucide-react';

export default function App() {
  // Theme dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('dompetku_dark_mode');
    return saved ? JSON.parse(saved) : false;
  });

  // Navigation tab - Default directly to 'pemasukan' (Menu Pemasukan & Pengeluaran)
  const [activeTab, setActiveTab] = useState<string>('pemasukan');

  // Business Profile
  const [business, setBusiness] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem('dompetku_business');
    return saved ? JSON.parse(saved) : initialBusinessProfile;
  });

  // Google Sheets configuration state
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() => {
    const saved = localStorage.getItem('dompetku_sheets_config');
    return saved ? JSON.parse(saved) : {
      webhookUrl: '',
      spreadsheetId: '',
      sheetName: 'Buku_Kas_DOMPETKU',
      autoSync: true,
      totalSyncedCount: 0,
    };
  });

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('dompetku_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  });

  // Bank Mutations State
  const [bankMutations, setBankMutations] = useState<BankMutation[]>(() => {
    const saved = localStorage.getItem('dompetku_mutations');
    return saved ? JSON.parse(saved) : initialBankMutations;
  });

  // Bank Configurations
  const [bankConfigs, setBankConfigs] = useState<BankConfig[]>(initialBankConfigs);

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Modal controls
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [newTxInitialType, setNewTxInitialType] = useState<TransactionType>('sale');
  const [activeReceiptTx, setActiveReceiptTx] = useState<Transaction | null>(null);

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; sub?: string } | null>(null);

  // Synchronize Dark Mode to HTML document class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dompetku_dark_mode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Persist Transactions
  useEffect(() => {
    localStorage.setItem('dompetku_transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Persist Mutations
  useEffect(() => {
    localStorage.setItem('dompetku_mutations', JSON.stringify(bankMutations));
  }, [bankMutations]);

  // Notification trigger helper
  const showToast = (message: string, sub?: string) => {
    setToast({ message, sub });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  // Automated Bank Mutation Matching & Verification Engine
  const reconcileBankTransactions = useCallback((currentTxs: Transaction[], currentMuts: BankMutation[]) => {
    let updated = false;
    const newTxs = [...currentTxs];
    const newMuts = [...currentMuts];

    newMuts.forEach((mutation, mutIdx) => {
      if (mutation.type === 'CR' && !mutation.matched) {
        // Find matching pending sale
        const matchIndex = newTxs.findIndex(t => {
          if (t.type !== 'sale' || t.status !== 'pending_bank') return false;

          // 1. Direct invoice number match in mutation description
          if (mutation.description.includes(t.invoiceNumber)) return true;

          // 2. Exact amount matching including unique code
          const expectedAmount = t.totalReceived || t.amount;
          if (Math.abs(expectedAmount - mutation.amount) === 0) return true;

          // 3. Customer name match if available
          if (t.customerName && mutation.description.toLowerCase().includes(t.customerName.toLowerCase())) return true;

          return false;
        });

        if (matchIndex !== -1) {
          const matchedTx = newTxs[matchIndex];
          newTxs[matchIndex] = {
            ...matchedTx,
            status: 'completed',
            verifiedAt: new Date().toISOString(),
            verifiedBy: 'system_api',
            bankRefNumber: mutation.refNumber,
            matchedMutationId: mutation.id,
          };

          newMuts[mutIdx] = {
            ...mutation,
            matched: true,
            matchedInvoiceNumber: matchedTx.invoiceNumber,
          };

          updated = true;

          showToast(
            `Dana Masuk Terverifikasi (${mutation.bankCode})!`,
            `${matchedTx.invoiceNumber} (${formatRupiah(mutation.amount)}) otomatis LUNAS via Bank API SNAP`
          );
        }
      }
    });

    if (updated) {
      setTransactions(newTxs);
      setBankMutations(newMuts);
    }
  }, []);

  // Trigger Sync
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date());
      reconcileBankTransactions(transactions, bankMutations);
    }, 900);
  };

  // Periodic Auto-Sync simulation every 40s
  useEffect(() => {
    const timer = setInterval(() => {
      setLastSyncTime(new Date());
      reconcileBankTransactions(transactions, bankMutations);
    }, 40000);
    return () => clearInterval(timer);
  }, [transactions, bankMutations, reconcileBankTransactions]);

  // Handle Quick Verify from UI (Single Button click)
  const handleQuickVerifyBank = (txId: string) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;

    const bankCode = tx.paymentMethod.replace('transfer_', '').toUpperCase() as 'BCA' | 'MANDIRI' | 'BRI' | 'BNI';
    const amount = tx.totalReceived || tx.amount;
    const refNumber = `${bankCode}-API-${Date.now().toString().slice(-6)}`;

    // Create mutation
    const newMutation: BankMutation = {
      id: `mut-${Date.now()}`,
      bankCode: ['BCA', 'MANDIRI', 'BRI', 'BNI'].includes(bankCode) ? bankCode : 'BCA',
      accountNo: '8820-9431-29',
      type: 'CR',
      amount,
      description: `TRSF SNAP INSTANT CR / ${tx.invoiceNumber} ${tx.customerName || 'PELANGGAN'}`,
      timestamp: new Date().toISOString(),
      refNumber,
      matched: true,
      matchedInvoiceNumber: tx.invoiceNumber,
    };

    setBankMutations(prev => [newMutation, ...prev]);

    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return {
          ...t,
          status: 'completed',
          verifiedAt: new Date().toISOString(),
          verifiedBy: 'system_api',
          bankRefNumber: refNumber,
          matchedMutationId: newMutation.id,
        };
      }
      return t;
    }));

    showToast(
      'Pembayaran Terverifikasi!',
      `${tx.invoiceNumber} berhasil divalidasi lunas melalui ${bankCode} API.`
    );
  };

  // Handle Simulated Webhook Transfer
  const handleSimulateWebhook = (data: {
    bankCode: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI';
    amount: number;
    description: string;
    targetInvoiceNumber?: string;
  }) => {
    setIsSyncing(true);
    const refNumber = `${data.bankCode}-SIM-${Math.floor(100000 + Math.random() * 900000)}`;
    const newMutation: BankMutation = {
      id: `mut-${Date.now()}`,
      bankCode: data.bankCode,
      accountNo: '8820-9431-29',
      type: 'CR',
      amount: data.amount,
      description: data.description,
      timestamp: new Date().toISOString(),
      refNumber,
      matched: false,
    };

    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime(new Date());
      const updatedMuts = [newMutation, ...bankMutations];
      setBankMutations(updatedMuts);
      reconcileBankTransactions(transactions, updatedMuts);
    }, 600);
  };

  // Add new transaction
  const handleAddNewTransaction = (txData: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}`,
    };

    const updatedTxs = [newTx, ...transactions];
    setTransactions(updatedTxs);

    // If it's a pending bank transfer, check if there is an unmatched mutation that already arrived!
    if (newTx.status === 'pending_bank') {
      reconcileBankTransactions(updatedTxs, bankMutations);
    }

    // Auto open receipt for sales
    if (newTx.type === 'sale') {
      setActiveReceiptTx(newTx);
    }

    showToast(
      newTx.type === 'sale' ? 'Penjualan Berhasil Dicatat' : 'Pengeluaran Berhasil Dicatat',
      `Faktur: ${newTx.invoiceNumber} (${formatRupiah(newTx.amount)})`
    );
  };

  // Delete transaction
  const handleDeleteTransaction = (txId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== txId));
    showToast('Transaksi Dihapus');
  };

  // Export CSV for all sales
  const handleExportAllSalesCSV = () => {
    const sales = transactions.filter(t => t.type === 'sale');
    const headers = ['No Faktur', 'Tanggal', 'Pelanggan', 'Metode Bayar', 'Total Tagihan (Rp)', 'Status', 'Ref Bank'];
    const rows = sales.map(s => [
      s.invoiceNumber,
      s.date,
      `"${s.customerName || 'Pelanggan Umum'}"`,
      s.paymentMethod,
      s.amount,
      s.status,
      s.bankRefNumber || '-'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Penjualan_DOMPETKU_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingSalesCount = transactions.filter(t => t.type === 'sale' && t.status === 'pending_bank').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#07110c] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Toast Notification Popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900/95 dark:bg-[#11241c]/95 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/40 backdrop-blur-md flex items-start gap-3 animate-slideUp">
          <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold text-white">
              {toast.message}
            </p>
            {toast.sub && (
              <p className="text-[11px] text-emerald-200/80 mt-0.5">
                {toast.sub}
              </p>
            )}
          </div>
          <button 
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main App Navigation Header */}
      <Header
        business={business}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(prev => !prev)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        isSyncing={isSyncing}
        onTriggerSync={handleTriggerSync}
        lastSyncTime={lastSyncTime}
        onOpenNewSale={() => {
          setNewTxInitialType('sale');
          setIsNewTxModalOpen(true);
        }}
        onOpenNewExpense={() => {
          setNewTxInitialType('expense');
          setIsNewTxModalOpen(true);
        }}
        pendingCount={pendingSalesCount}
      />

      {/* Main App Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Menu Pemasukan & Pengeluaran Langsung */}
        {(activeTab === 'pemasukan' || activeTab === 'pengeluaran' || activeTab === 'sales' || activeTab === 'expenses') && (
          <TransactionCenter
            transactions={transactions}
            initialMode={activeTab === 'pengeluaran' || activeTab === 'expenses' ? 'pengeluaran' : 'pemasukan'}
            onAddTransaction={handleAddNewTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onViewReceipt={(tx) => setActiveReceiptTx(tx)}
            onQuickVerifyBank={handleQuickVerifyBank}
            onNavigateToSpreadsheet={() => setActiveTab('spreadsheet')}
          />
        )}

        {/* Rekap Spreadsheet (Buku Kas & Google Sheets Sync) */}
        {activeTab === 'spreadsheet' && (
          <SpreadsheetSync
            transactions={transactions}
            business={business}
            sheetsConfig={sheetsConfig}
            onUpdateSheetsConfig={setSheetsConfig}
          />
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <Dashboard
            transactions={transactions}
            bankMutations={bankMutations}
            onOpenNewSale={() => {
              setNewTxInitialType('sale');
              setIsNewTxModalOpen(true);
            }}
            onOpenNewExpense={() => {
              setNewTxInitialType('expense');
              setIsNewTxModalOpen(true);
            }}
            onViewReceipt={(tx) => setActiveReceiptTx(tx)}
            onNavigateToTab={setActiveTab}
            onQuickVerifyBank={handleQuickVerifyBank}
            onSimulateIncomingTransfer={() => {
              setActiveTab('bank_api');
            }}
          />
        )}

        {/* Monthly Reports Tab */}
        {activeTab === 'reports' && (
          <MonthlyReport
            transactions={transactions}
            business={business}
          />
        )}

        {/* Bank API Integration Tab */}
        {activeTab === 'bank_api' && (
          <BankApiIntegration
            bankConfigs={bankConfigs}
            mutations={bankMutations}
            pendingTransactions={transactions.filter(t => t.type === 'sale' && t.status === 'pending_bank')}
            onTriggerSync={handleTriggerSync}
            isSyncing={isSyncing}
            onSimulateWebhook={handleSimulateWebhook}
            onManualMatch={(mutId, invId) => {
              // manual match
              handleQuickVerifyBank(invId);
            }}
          />
        )}

      </main>

      {/* Footer UMKM Branding */}
      <footer className="no-print mt-auto border-t border-emerald-900/10 dark:border-emerald-800/20 bg-white/70 dark:bg-[#09150f]/80 py-5 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-emerald-300/60">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-emerald-900 dark:text-emerald-300">DOMPETKU</span>
            <span>•</span>
            <span>Bagian dari Ekosistem Bisnis POTANKOS</span>
            <span>•</span>
            <span className="hidden sm:inline">Pengelolaan Sistem Keuangan Terpadu UMKM</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Standar SNAP Open Banking BI</span>
            <span>•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Real-Time Sync</span>
          </div>
        </div>
      </footer>

      {/* Digital Receipt Modal */}
      {activeReceiptTx && (
        <ReceiptModal
          transaction={activeReceiptTx}
          business={business}
          onClose={() => setActiveReceiptTx(null)}
        />
      )}

      {/* Record New Transaction Modal */}
      {isNewTxModalOpen && (
        <NewTransactionModal
          initialType={newTxInitialType}
          isOpen={isNewTxModalOpen}
          onClose={() => setIsNewTxModalOpen(false)}
          onSubmit={handleAddNewTransaction}
        />
      )}

    </div>
  );
}
