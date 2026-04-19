"use server";

import { db } from "@/db";
import { 
  organizations, 
  profiles, 
  chartOfAccounts, 
  invoices, 
  saleOrders, 
  quotations, 
  purchaseOrders, 
  purchaseInvoices, 
  goodReceivingNotes 
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

// Seed default Chart of Accounts for a new organization
async function seedDefaultChartOfAccounts(orgId: string): Promise<void> {
  const defaultAccounts = [
    // Assets
    { code: "1010", name: "Cash", type: "asset", description: "Cash on hand" },
    { code: "1020", name: "Bank", type: "asset", description: "Bank account" },
    { code: "1100", name: "Accounts Receivable", type: "asset", description: "Money owed by customers" },
    { code: "1200", name: "Inventory", type: "asset", description: "Goods available for sale" },
    { code: "1210", name: "Input Tax", type: "asset", description: "Recoverable input tax" },
    { code: "1300", name: "Prepaid Expenses", type: "asset", description: "Expenses paid in advance" },

    // Liabilities
    { code: "2100", name: "Accounts Payable", type: "liability", description: "Money owed to suppliers" },
    { code: "2200", name: "Sales Tax Payable", type: "liability", description: "Sales tax collected but not remitted" },
    { code: "2210", name: "Income Tax Payable", type: "liability", description: "Income tax owed" },
    { code: "2300", name: "Salaries Payable", type: "liability", description: "Salaries owed to employees" },
    { code: "2310", name: "EOBI Payable", type: "liability", description: "EOBI contributions payable" },

    // Equity
    { code: "3000", name: "Owner's Equity", type: "equity", description: "Owner's investment in the business" },
    { code: "3100", name: "Retained Earnings", type: "equity", description: "Accumulated profits/losses" },

    // Income
    { code: "4000", name: "Sales Revenue", type: "income", description: "Revenue from sales" },
    { code: "4100", name: "Other Income", type: "income", description: "Miscellaneous income" },
    { code: "4200", name: "Shipping Revenue", type: "income", description: "Revenue from shipping charges" },

    // Expense
    { code: "5000", name: "Cost of Goods Sold", type: "expense", description: "Direct cost of goods sold" },
    { code: "6100", name: "Salaries & Wages Expense", type: "expense", description: "Employee compensation" },
    { code: "6200", name: "Rent Expense", type: "expense", description: "Office/warehouse rent" },
    { code: "6300", name: "Utilities Expense", type: "expense", description: "Electricity, water, gas" },
    { code: "6400", name: "Depreciation Expense", type: "expense", description: "Asset depreciation" },
    { code: "6500", name: "Discount Allowed", type: "expense", description: "Discounts given to customers" },
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
}

// Get the current user's organization ID, creating one with seeded COA if needed
export async function getCurrentOrgId(): Promise<string | null> {
  try {
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

    // If profile exists, return orgId
    if (userProfile.length > 0 && userProfile[0].orgId) {
      return userProfile[0].orgId;
    }

    // Auto-onboarding: User doesn't have a profile yet, create one automatically
    const user = await currentUser();
    if (!user) {
      return null;
    }

    // Create a default organization for the user
    const timestamp = Date.now();
    const orgSlug = `my-business-${timestamp}`;

    const newOrg = await db
      .insert(organizations)
      .values({
        name: "My Business",
        slug: orgSlug,
        currency: "PKR",
        fiscalYearStart: "07-01",
        country: "Pakistan",
      })
      .returning({ id: organizations.id });

    if (!newOrg || newOrg.length === 0) {
      return null;
    }

    const newOrgId = newOrg[0].id;

    // Create profile for this user linking to the new organization
    const userEmail = user.emailAddresses[0]?.emailAddress || "";
    const userFullName = user.fullName || user.username || "User";

    await db.insert(profiles).values({
      userId,
      orgId: newOrgId,
      role: "admin",
      fullName: userFullName,
      email: userEmail,
    });

    // Seed default Chart of Accounts for the new organization
    await seedDefaultChartOfAccounts(newOrgId);

    return newOrgId;
  } catch (error) {
    return null;
  }
}

// Helper to pad numbers with leading zeros
function padNumber(num: number, padding: number): string {
  return String(num).padStart(padding, '0');
}

// Centralized function to generate document numbers
export async function generateDocumentNumber(
  type: 'invoice' | 'order' | 'quotation' | 'purchase' | 'bill' | 'grn', 
  orgId: string
): Promise<string | null> {
  try {
    const orgSettings = await db
      .select({
        invoicePrefix: organizations.invoicePrefix,
        orderPrefix: organizations.orderPrefix,
        quotationPrefix: organizations.quotationPrefix,
        purchasePrefix: organizations.purchasePrefix,
        billPrefix: organizations.billPrefix,
        grnPrefix: organizations.grnPrefix,
        numberingPadding: organizations.numberingPadding,
        numberingIncludeYear: organizations.numberingIncludeYear,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (!orgSettings || orgSettings.length === 0) {
      console.error(`Organization settings not found for orgId: ${orgId}`);
      return null;
    }

    const settings = orgSettings[0];
    let prefix = '';
    let count = 0;

    switch (type) {
      case 'invoice':
        prefix = settings.invoicePrefix || 'INV';
        const [invoiceCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(eq(invoices.orgId, orgId));
        count = Number(invoiceCount.count);
        break;
      case 'order':
        prefix = settings.orderPrefix || 'SO';
        const [orderCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(saleOrders)
          .where(eq(saleOrders.orgId, orgId));
        count = Number(orderCount.count);
        break;
      case 'quotation':
        prefix = settings.quotationPrefix || 'QT';
        const [quotationCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(quotations)
          .where(eq(quotations.orgId, orgId));
        count = Number(quotationCount.count);
        break;
      case 'purchase':
        prefix = settings.purchasePrefix || 'PO';
        const [purchaseCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(purchaseOrders)
          .where(eq(purchaseOrders.orgId, orgId));
        count = Number(purchaseCount.count);
        break;
      case 'bill':
        prefix = settings.billPrefix || 'PI';
        const [billCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(purchaseInvoices)
          .where(eq(purchaseInvoices.orgId, orgId));
        count = Number(billCount.count);
        break;
      case 'grn':
        prefix = settings.grnPrefix || 'GRN';
        const [grnCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(goodReceivingNotes)
          .where(eq(goodReceivingNotes.orgId, orgId));
        count = Number(grnCount.count);
        break;
      default:
        console.error(`Unknown document type: ${type}`);
        return null;
    }

    const nextNumber = count + 1;
    const currentYear = new Date().getFullYear();
    const paddedNumber = padNumber(nextNumber, settings.numberingPadding || 5);

    let documentNumber = prefix;
    if (settings.numberingIncludeYear) {
      documentNumber += `-${currentYear}`;
    }
    documentNumber += `-${paddedNumber}`;

    return documentNumber;
  } catch (error) {
    console.error(`Error generating document number for type ${type} and orgId ${orgId}:`, error);
    return null;
  }
}
