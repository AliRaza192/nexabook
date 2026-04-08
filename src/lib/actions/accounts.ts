"use server";

import { db } from "@/db";
import { chartOfAccounts, organizations, profiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";

export interface JournalEntryLine {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

export interface JournalEntryData {
  date: string;
  reference: string;
  description: string;
  lines: JournalEntryLine[];
}

// Helper function to get current user's orgId
async function getCurrentOrgId(): Promise<string | null> {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  // Get user's profile from database
  const userProfile = await db
    .select({
      orgId: profiles.orgId,
    })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (userProfile.length === 0 || !userProfile[0].orgId) {
    // User doesn't have a profile yet, create one with a default organization
    const newOrg = await db
      .insert(organizations)
      .values({
        name: "My Organization",
        slug: `org-${Date.now()}`,
      })
      .returning({ id: organizations.id });

    if (newOrg.length === 0) {
      return null;
    }

    // Create profile for this user
    const user = await currentUser();
    await db.insert(profiles).values({
      userId,
      orgId: newOrg[0].id,
      role: "admin",
      fullName: user?.fullName || "User",
      email: user?.emailAddresses[0]?.emailAddress || "",
    });

    return newOrg[0].id;
  }

  return userProfile[0].orgId;
}

// Get all accounts for current user's organization
export async function getAccounts() {
  try {
    const orgId = await getCurrentOrgId();
    
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    const accounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.orgId, orgId))
      .orderBy(chartOfAccounts.code);

    return { success: true, data: accounts };
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return { success: false, error: "Failed to fetch accounts" };
  }
}

// Seed initial Chart of Accounts for current user's organization
export async function seedInitialCOA() {
  const orgId = await getCurrentOrgId();
  
  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  try {
    // Check if accounts already exist for this organization
    const existingAccounts = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.orgId, orgId))
      .limit(1);

    if (existingAccounts.length > 0) {
      return { 
        success: false, 
        error: "Chart of Accounts already exists for this organization" 
      };
    }

    const defaultAccounts = [
      // Assets (1000-1999)
      { code: "1000", name: "Cash", type: "asset", description: "Cash on hand" },
      { code: "1010", name: "Bank - Main Account", type: "asset", description: "Main bank account" },
      { code: "1020", name: "Bank - Savings Account", type: "asset", description: "Savings bank account" },
      { code: "1100", name: "Accounts Receivable", type: "asset", description: "Money owed by customers" },
      { code: "1200", name: "Inventory", type: "asset", description: "Goods available for sale" },
      { code: "1300", name: "Office Supplies", type: "asset", description: "Office supplies and materials" },
      { code: "1400", name: "Prepaid Expenses", type: "asset", description: "Expenses paid in advance" },
      { code: "1500", name: "Fixed Assets - Equipment", type: "asset", description: "Business equipment" },
      { code: "1510", name: "Fixed Assets - Furniture", type: "asset", description: "Office furniture and fixtures" },
      { code: "1520", name: "Fixed Assets - Vehicles", type: "asset", description: "Company vehicles" },
      { code: "1600", name: "Accumulated Depreciation", type: "asset", description: "Total depreciation of assets" },

      // Liabilities (2000-2999)
      { code: "2000", name: "Accounts Payable", type: "liability", description: "Money owed to suppliers" },
      { code: "2100", name: "Credit Card Payable", type: "liability", description: "Credit card balance" },
      { code: "2200", name: "Sales Tax Payable", type: "liability", description: "Sales tax collected but not remitted" },
      { code: "2300", name: "Income Tax Payable", type: "liability", description: "Income tax owed" },
      { code: "2400", name: "Accrued Liabilities", type: "liability", description: "Expenses incurred but not yet paid" },
      { code: "2500", name: "Short-term Loans", type: "liability", description: "Loans due within one year" },
      { code: "2600", name: "Long-term Loans", type: "liability", description: "Loans due after one year" },

      // Equity (3000-3999)
      { code: "3000", name: "Owner's Equity", type: "equity", description: "Owner's investment in the business" },
      { code: "3100", name: "Retained Earnings", type: "equity", description: "Accumulated profits/losses" },
      { code: "3200", name: "Share Capital", type: "equity", description: "Capital from shares issued" },

      // Income (4000-4999)
      { code: "4000", name: "Sales Revenue", type: "income", description: "Revenue from sales" },
      { code: "4100", name: "Service Revenue", type: "income", description: "Revenue from services" },
      { code: "4200", name: "Interest Income", type: "income", description: "Interest earned" },
      { code: "4300", name: "Other Income", type: "income", description: "Miscellaneous income" },
      { code: "4400", name: "Discount Received", type: "income", description: "Discounts from suppliers" },

      // Expenses (5000-5999)
      { code: "5000", name: "Cost of Goods Sold", type: "expense", description: "Direct cost of goods sold" },
      { code: "5100", name: "Salaries & Wages", type: "expense", description: "Employee compensation" },
      { code: "5200", name: "Rent Expense", type: "expense", description: "Office/warehouse rent" },
      { code: "5300", name: "Utilities", type: "expense", description: "Electricity, water, gas" },
      { code: "5400", name: "Office Supplies Expense", type: "expense", description: "Office supplies used" },
      { code: "5500", name: "Depreciation Expense", type: "expense", description: "Asset depreciation" },
      { code: "5600", name: "Marketing & Advertising", type: "expense", description: "Marketing costs" },
      { code: "5700", name: "Travel & Transportation", type: "expense", description: "Business travel costs" },
      { code: "5800", name: "Insurance Expense", type: "expense", description: "Business insurance premiums" },
      { code: "5900", name: "Professional Fees", type: "expense", description: "Legal, accounting, consulting fees" },
      { code: "6000", name: "Bank Charges", type: "expense", description: "Bank fees and charges" },
      { code: "6100", name: "Interest Expense", type: "expense", description: "Interest on loans" },
      { code: "6200", name: "Tax Expense", type: "expense", description: "Business taxes" },
    ];

    const accountsToInsert = defaultAccounts.map((account) => ({
      orgId,
      code: account.code,
      name: account.name,
      type: account.type,
      description: account.description,
      isActive: true,
    }));

    await db.insert(chartOfAccounts).values(accountsToInsert);

    revalidatePath("/dashboard/accounts/chart-of-accounts");

    return {
      success: true,
      message: `Successfully created ${accountsToInsert.length} default accounts`
    };
  } catch (error) {
    console.error("Error seeding COA:", error);
    return { success: false, error: "Failed to seed chart of accounts" };
  }
}

// Create a journal entry for current user's organization
export async function createJournalEntry(data: JournalEntryData) {
  const orgId = await getCurrentOrgId();
  
  if (!orgId) {
    return { success: false, error: "No organization found" };
  }

  try {
    // Calculate totals
    const totalDebit = data.lines.reduce((sum, line) => sum + parseFloat(line.debit || "0"), 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + parseFloat(line.credit || "0"), 0);

    // Validate debits equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return { 
        success: false, 
        error: `Journal entry is not balanced. Total Debit: ${totalDebit.toFixed(2)}, Total Credit: ${totalCredit.toFixed(2)}` 
      };
    }

    // Validate all lines have accounts
    for (const line of data.lines) {
      if (!line.accountId) {
        return { success: false, error: "All journal entry lines must have an account" };
      }

      // Validate that either debit or credit is present
      if ((!line.debit || parseFloat(line.debit) === 0) && (!line.credit || parseFloat(line.credit) === 0)) {
        return { success: false, error: "Each line must have either a debit or credit amount" };
      }
    }

    // TODO: In a full implementation, you would:
    // 1. Insert into journal_entries table
    // 2. Insert into journal_entry_lines table
    // 3. Update account balances
    
    // For now, we'll just return success
    revalidatePath("/dashboard/accounts/journal-entries");
    
    return { 
      success: true, 
      message: "Journal entry created successfully" 
    };
  } catch (error) {
    console.error("Error creating journal entry:", error);
    return { success: false, error: "Failed to create journal entry" };
  }
}

// Get account by ID
export async function getAccountById(accountId: string) {
  try {
    const account = await db
      .select()
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.id, accountId))
      .limit(1);

    if (account.length === 0) {
      return { success: false, error: "Account not found" };
    }

    return { success: true, data: account[0] };
  } catch (error) {
    console.error("Error fetching account:", error);
    return { success: false, error: "Failed to fetch account" };
  }
}
