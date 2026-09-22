export type TransactionType = 'sale' | 'expense';

export type PaymentMethod = 
  | 'transfer_bca' 
  | 'transfer_mandiri' 
  | 'transfer_bri' 
  | 'transfer_bni' 
  | 'qris' 
  | 'cash' 
  | 'ewallet';

export type TransactionStatus = 
  | 'completed' 
  | 'pending_bank' 
  | 'failed';

export interface SaleItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  date: string; // ISO string YYYY-MM-DDTHH:mm:ss
  type: TransactionType;
  title: string;
  category: string;
  amount: number;
  uniqueCode?: number; // Kode unik nominal (misal 150.245)
  totalReceived?: number;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  items?: SaleItem[];
  bankRefNumber?: string;
  verifiedAt?: string;
  verifiedBy?: 'system_api' | 'manual';
  matchedMutationId?: string;
}

export interface BankMutation {
  id: string;
  bankCode: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI';
  accountNo: string;
  type: 'CR' | 'DB'; // CR: Credit (Uang Masuk), DB: Debit (Uang Keluar)
  amount: number;
  description: string;
  timestamp: string;
  refNumber: string;
  matched: boolean;
  matchedInvoiceNumber?: string;
}

export interface BankConfig {
  bankCode: 'BCA' | 'MANDIRI' | 'BRI' | 'BNI';
  bankName: string;
  accountNo: string;
  accountHolder: string;
  status: 'connected' | 'sandbox' | 'disconnected';
  lastSyncTime: string;
  apiKeyMasked: string;
  webhookEnabled: boolean;
  color: string;
}

export interface BusinessProfile {
  businessName: string;
  parentBusiness: string;
  tagline: string;
  ownerName: string;
  category: string;
  address: string;
  phone: string;
  email: string;
  primaryBank: string;
  accountNo: string;
}

export interface MonthlyReportData {
  monthKey: string; // '2026-09'
  monthLabel: string; // 'September 2026'
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
  transactionCount: number;
  pendingCount: number;
  averageTransactionValue: number;
  revenueByPaymentMethod: Record<PaymentMethod, number>;
  expenseByCategory: Record<string, number>;
  dailyTrend: { date: string; day: string; revenue: number; expense: number }[];
}

export interface GoogleSheetsConfig {
  webhookUrl: string;
  spreadsheetId: string;
  sheetName: string;
  autoSync: boolean;
  lastSyncTime?: string;
  totalSyncedCount: number;
}


