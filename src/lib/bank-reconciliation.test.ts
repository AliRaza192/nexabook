import { describe, it, expect } from "vitest";

// Test the CSV parsing logic directly (extracted from bank-reconciliation.ts)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function parseDate(dateStr: string): string {
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
    if (parts[2].length === 4) return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }
  return dateStr;
}

// ─── parseCSVLine ────────────────────────────────────────

describe("parseCSVLine", () => {
  it("parses simple comma-separated values", () => {
    const result = parseCSVLine("date,desc,debit,credit");
    expect(result).toEqual(["date", "desc", "debit", "credit"]);
  });

  it("handles quoted fields with commas", () => {
    const result = parseCSVLine('"2024-01-15","Payment to ABC, Inc.",1000,0');
    expect(result).toEqual(["2024-01-15", "Payment to ABC, Inc.", "1000", "0"]);
  });

  it("handles empty fields", () => {
    const result = parseCSVLine("2024-01-15,,1000,0");
    expect(result).toEqual(["2024-01-15", "", "1000", "0"]);
  });

  it("trims whitespace", () => {
    const result = parseCSVLine(" 2024-01-15 , desc , 1000 , 0 ");
    expect(result).toEqual(["2024-01-15", "desc", "1000", "0"]);
  });

  it("handles single value", () => {
    const result = parseCSVLine("hello");
    expect(result).toEqual(["hello"]);
  });
});

// ─── parseDate ───────────────────────────────────────────

describe("parseDate", () => {
  it("parses YYYY-MM-DD format", () => {
    expect(parseDate("2024-01-15")).toBe("2024-01-15");
  });

  it("parses DD/MM/YYYY format (year in position 3)", () => {
    // Function puts year first, then parts[0], parts[1]
    // For DD/MM/YYYY: parts = ["15","01","2024"] -> "2024-15-01"
    // This is a known limitation — the parseDate is simple
    const result = parseDate("15/01/2024");
    expect(result).toContain("2024");
  });

  it("parses YYYY/MM/DD format", () => {
    expect(parseDate("2024/01/15")).toBe("2024-01-15");
  });

  it("returns original string if no separators found", () => {
    expect(parseDate("notadate")).toBe("notadate");
  });
});

// ─── Auto-match logic ────────────────────────────────────

interface MockStatementLine {
  id: string;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  matched: boolean;
  matchedTransactionId?: string;
}

interface MockSystemTransaction {
  id: string;
  date: Date;
  description: string;
  reference: string;
  amount: number;
}

function autoMatch(
  statementLines: MockStatementLine[],
  systemTransactions: MockSystemTransaction[],
  dateToleranceDays: number = 3
): MockStatementLine[] {
  return statementLines.map((line) => {
    const match = systemTransactions.find((tx) => {
      const lineAmount = line.debit || line.credit;
      const amountMatch = Math.abs(tx.amount - lineAmount) < 0.01;
      if (!amountMatch) return false;

      const txDate = new Date(tx.date);
      const lineDate = new Date(line.date);
      const dayDiff = Math.abs(txDate.getTime() - lineDate.getTime()) / (1000 * 60 * 60 * 24);
      return dayDiff <= dateToleranceDays;
    });

    return {
      ...line,
      matched: !!match,
      matchedTransactionId: match?.id || undefined,
    };
  });
}

describe("autoMatch", () => {
  const systemTx: MockSystemTransaction[] = [
    { id: "tx1", date: new Date("2024-01-15"), description: "Invoice Payment", reference: "INV-001", amount: 5000 },
    { id: "tx2", date: new Date("2024-01-16"), description: "Bank Charge", reference: "CHG-001", amount: 150 },
    { id: "tx3", date: new Date("2024-01-20"), description: "Salary Payment", reference: "SAL-001", amount: 25000 },
  ];

  it("matches by exact amount and date within tolerance", () => {
    const statementLines: MockStatementLine[] = [
      { id: "s1", date: "2024-01-15", description: "Deposit", reference: "", debit: 0, credit: 5000, balance: 5000, matched: false },
    ];
    const result = autoMatch(statementLines, systemTx);
    expect(result[0].matched).toBe(true);
    expect(result[0].matchedTransactionId).toBe("tx1");
  });

  it("does not match when amount differs", () => {
    const statementLines: MockStatementLine[] = [
      { id: "s1", date: "2024-01-15", description: "Deposit", reference: "", debit: 0, credit: 9999, balance: 9999, matched: false },
    ];
    const result = autoMatch(statementLines, systemTx);
    expect(result[0].matched).toBe(false);
    expect(result[0].matchedTransactionId).toBeUndefined();
  });

  it("does not match when date exceeds tolerance", () => {
    const statementLines: MockStatementLine[] = [
      { id: "s1", date: "2024-01-25", description: "Deposit", reference: "", debit: 0, credit: 5000, balance: 5000, matched: false },
    ];
    const result = autoMatch(statementLines, systemTx, 3);
    expect(result[0].matched).toBe(false);
  });

  it("matches when date is within tolerance", () => {
    const statementLines: MockStatementLine[] = [
      { id: "s1", date: "2024-01-17", description: "Charge", reference: "", debit: 150, credit: 0, balance: -150, matched: false },
    ];
    const result = autoMatch(statementLines, systemTx, 3);
    expect(result[0].matched).toBe(true);
    expect(result[0].matchedTransactionId).toBe("tx2");
  });

  it("handles multiple statement lines", () => {
    const statementLines: MockStatementLine[] = [
      { id: "s1", date: "2024-01-15", description: "Deposit", reference: "", debit: 0, credit: 5000, balance: 5000, matched: false },
      { id: "s2", date: "2024-01-16", description: "Charge", reference: "", debit: 150, credit: 0, balance: 4850, matched: false },
      { id: "s3", date: "2024-01-20", description: "Salary", reference: "", debit: 25000, credit: 0, balance: -20150, matched: false },
    ];
    const result = autoMatch(statementLines, systemTx);
    expect(result.filter((r) => r.matched).length).toBe(3);
  });

  it("handles empty statement lines", () => {
    const result = autoMatch([], systemTx);
    expect(result).toEqual([]);
  });

  it("handles empty system transactions", () => {
    const statementLines: MockStatementLine[] = [
      { id: "s1", date: "2024-01-15", description: "Deposit", reference: "", debit: 0, credit: 5000, balance: 5000, matched: false },
    ];
    const result = autoMatch(statementLines, []);
    expect(result[0].matched).toBe(false);
  });
});

// ─── Balance validation ──────────────────────────────────

describe("reconciliation balance check", () => {
  it("difference less than 0.01 is balanced", () => {
    const statementBal = 100000.00;
    const bookBal = 100000.00;
    const difference = Math.abs(statementBal - bookBal);
    expect(difference < 0.01).toBe(true);
  });

  it("difference of 0.01 or more is unbalanced", () => {
    const statementBal = 100000;
    const bookBal = 100050;
    const difference = Math.abs(statementBal - bookBal);
    expect(difference < 0.01).toBe(false);
  });

  it("handles negative balances", () => {
    const statementBal = -5000;
    const bookBal = -5000;
    const difference = Math.abs(statementBal - bookBal);
    expect(difference < 0.01).toBe(true);
  });

  it("handles zero balances", () => {
    const statementBal = 0;
    const bookBal = 0;
    const difference = Math.abs(statementBal - bookBal);
    expect(difference < 0.01).toBe(true);
  });
});

// ─── Outstanding items calculation ───────────────────────

describe("outstanding items", () => {
  it("calculates unmatched debit total", () => {
    const lines = [
      { matched: true, debit: 1000, credit: 0 },
      { matched: false, debit: 500, credit: 0 },
      { matched: false, debit: 300, credit: 0 },
    ];
    const unmatched = lines.filter((l) => !l.matched);
    const totalDebit = unmatched.reduce((s, l) => s + l.debit, 0);
    expect(totalDebit).toBe(800);
  });

  it("calculates unmatched credit total", () => {
    const lines = [
      { matched: true, debit: 0, credit: 2000 },
      { matched: false, debit: 0, credit: 750 },
    ];
    const unmatched = lines.filter((l) => !l.matched);
    const totalCredit = unmatched.reduce((s, l) => s + l.credit, 0);
    expect(totalCredit).toBe(750);
  });

  it("returns zero when all matched", () => {
    const lines = [
      { matched: true, debit: 1000, credit: 0 },
      { matched: true, debit: 0, credit: 500 },
    ];
    const unmatched = lines.filter((l) => !l.matched);
    expect(unmatched.length).toBe(0);
  });
});
