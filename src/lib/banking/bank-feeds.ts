// Bank Feed Provider Interface & Implementations

export interface BankTransaction {
  externalId: string;
  date: Date;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  category?: string;
}

export interface BankFeedProvider {
  name: string;
  connect(config: Record<string, string>): Promise<{ success: boolean; accountId?: string; error?: string }>;
  disconnect(): Promise<void>;
  syncTransactions(fromDate: Date, toDate: Date): Promise<{ success: boolean; transactions: BankTransaction[]; error?: string }>;
  getBalance(): Promise<{ success: boolean; balance?: number; error?: string }>;
}

// Mock provider for development/testing
export class MockBankProvider implements BankFeedProvider {
  name = "Mock Bank";
  private config: Record<string, string> = {};

  async connect(config: Record<string, string>) {
    this.config = config;
    return { success: true, accountId: "mock-acc-001" };
  }

  async disconnect() {}

  async syncTransactions(fromDate: Date, toDate: Date) {
    const transactions: BankTransaction[] = [];
    const current = new Date(fromDate);
    let balance = 50000;

    while (current <= toDate) {
      if (current.getDay() !== 0 && current.getDay() !== 6) {
        const isDeposit = Math.random() > 0.4;
        const amount = Math.round(Math.random() * 50000 * 100) / 100;
        if (isDeposit) {
          balance += amount;
          transactions.push({
            externalId: `mock-txn-${current.toISOString().split("T")[0]}-${transactions.length}`,
            date: new Date(current),
            description: ["Payment received", "Sales deposit", "Fund transfer in", "Online sale"][Math.floor(Math.random() * 4)],
            reference: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            debit: 0,
            credit: amount,
            balance: Math.round(balance * 100) / 100,
            category: "deposit",
          });
        } else {
          balance -= amount;
          transactions.push({
            externalId: `mock-txn-${current.toISOString().split("T")[0]}-${transactions.length}`,
            date: new Date(current),
            description: ["Vendor payment", "Utility bill", "Rent payment", "Office supplies"][Math.floor(Math.random() * 4)],
            reference: `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            debit: amount,
            credit: 0,
            balance: Math.round(balance * 100) / 100,
            category: "withdrawal",
          });
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return { success: true, transactions };
  }

  async getBalance() {
    return { success: true, balance: 50000 };
  }
}

// Provider factory
const providers: Record<string, new () => BankFeedProvider> = {
  mock: MockBankProvider,
};

export function getBankFeedProvider(providerName: string): BankFeedProvider | null {
  const Provider = providers[providerName];
  if (!Provider) return null;
  return new Provider();
}

export function registerProvider(name: string, provider: new () => BankFeedProvider) {
  providers[name] = provider;
}

export function mapTransactionsToStatementLines(transactions: BankTransaction[]) {
  return transactions.map((t) => ({
    id: t.externalId,
    date: t.date.toISOString().split("T")[0],
    description: t.description,
    reference: t.reference,
    debit: t.debit,
    credit: t.credit,
    balance: t.balance,
    matched: false,
  }));
}
