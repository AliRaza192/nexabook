"use server";

import { db } from "@/db";
import { products, productCategories } from "@/db/schema";
import { eq, and, ilike, or } from "drizzle-orm";
import { getCurrentOrgId } from "./shared";
import * as XLSX from 'xlsx';

// ─── Types ───────────────────────────────────────────────────

export interface ProductExportRow {
  name: string;
  sku: string;
  barcode: string;
  category: string;
  type: string;
  unit: string;
  salePrice: string;
  costPrice: string;
  currentStock: string;
  minStockLevel: string;
  taxRate: string;
  description: string;
  isBatchTracked: string;
  isSerialTracked: string;
}

export interface ImportRow {
  name?: string;
  sku?: string;
  barcode?: string;
  category?: string;
  type?: string;
  unit?: string;
  salePrice?: string;
  costPrice?: string;
  currentStock?: string;
  minStockLevel?: string;
  taxRate?: string;
  description?: string;
  isBatchTracked?: string;
  isSerialTracked?: string;
  _errors?: string[];
  _rowNumber?: number;
}

// ─── Export Products ─────────────────────────────────────────

export async function exportProductsToExcel() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        type: products.type,
        unit: products.unit,
        salePrice: products.salePrice,
        costPrice: products.costPrice,
        currentStock: products.currentStock,
        minStockLevel: products.minStockLevel,
        taxRate: products.taxRate,
        description: products.description,
        isBatchTracked: products.isBatchTracked,
        isSerialTracked: products.isSerialTracked,
        categoryName: productCategories.name,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);

    const wb = XLSX.utils.book_new();

    const headers = [
      "Name", "SKU", "Barcode", "Category", "Type", "Unit",
      "Sale Price", "Cost Price", "Current Stock", "Min Stock Level",
      "Tax Rate (%)", "Description", "Batch Tracked", "Serial Tracked",
    ];

    const data = allProducts.map((p) => [
      p.name,
      p.sku,
      p.barcode || "",
      p.categoryName || "",
      p.type || "product",
      p.unit || "Pcs",
      p.salePrice || "0",
      p.costPrice || "0",
      p.currentStock || "0",
      p.minStockLevel || "0",
      p.taxRate || "0",
      p.description || "",
      p.isBatchTracked ? "Yes" : "No",
      p.isSerialTracked ? "Yes" : "No",
    ]);

    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map((_, i) => ({
      wch: i < 4 ? 20 : i < 8 ? 15 : 12,
    }));
    XLSX.utils.book_append_sheet(wb, ws, "Products");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const base64 = Buffer.from(buffer).toString("base64");

    return { success: true, data: base64, fileName: `products_${new Date().toISOString().split("T")[0]}.xlsx` };
  } catch (error) {
    return { success: false, error: "Failed to export products" };
  }
}

export async function exportProductsToCSV() {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const allProducts = await db
      .select({
        name: products.name,
        sku: products.sku,
        barcode: products.barcode,
        type: products.type,
        unit: products.unit,
        salePrice: products.salePrice,
        costPrice: products.costPrice,
        currentStock: products.currentStock,
        minStockLevel: products.minStockLevel,
        taxRate: products.taxRate,
        description: products.description,
        isBatchTracked: products.isBatchTracked,
        isSerialTracked: products.isSerialTracked,
        categoryName: productCategories.name,
      })
      .from(products)
      .leftJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(eq(products.orgId, orgId), eq(products.isActive, true)))
      .orderBy(products.name);

    const headers = [
      "Name", "SKU", "Barcode", "Category", "Type", "Unit",
      "Sale Price", "Cost Price", "Current Stock", "Min Stock Level",
      "Tax Rate (%)", "Description", "Batch Tracked", "Serial Tracked",
    ];

    const csvRows = [headers.join(",")];
    for (const p of allProducts) {
      const row = [
        escapeCSV(p.name),
        escapeCSV(p.sku),
        escapeCSV(p.barcode || ""),
        escapeCSV(p.categoryName || ""),
        escapeCSV(p.type || "product"),
        escapeCSV(p.unit || "Pcs"),
        p.salePrice || "0",
        p.costPrice || "0",
        p.currentStock || "0",
        p.minStockLevel || "0",
        p.taxRate || "0",
        escapeCSV(p.description || ""),
        p.isBatchTracked ? "Yes" : "No",
        p.isSerialTracked ? "Yes" : "No",
      ];
      csvRows.push(row.join(","));
    }

    return { success: true, data: csvRows.join("\n"), fileName: `products_${new Date().toISOString().split("T")[0]}.csv` };
  } catch (error) {
    return { success: false, error: "Failed to export products" };
  }
}

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// ─── Import Template ─────────────────────────────────────────

export async function getImportTemplate(): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const categories = await db
      .select({ name: productCategories.name })
      .from(productCategories)
      .where(and(eq(productCategories.orgId, orgId), eq(productCategories.isActive, true)));

    const headers = [
      "Name*", "SKU*", "Barcode", "Category", "Type", "Unit",
      "Sale Price", "Cost Price", "Current Stock", "Min Stock Level",
      "Tax Rate (%)", "Description", "Batch Tracked", "Serial Tracked",
    ];

    const exampleRow = [
      "Sample Product", "SKU-001", "123456789", categories[0]?.name || "General",
      "product", "Pcs", "1000", "800", "50", "10", "17",
      "Product description here", "No", "No",
    ];

    const csvRows = [
      headers.join(","),
      exampleRow.join(","),
    ];

    return { success: true, data: csvRows.join("\n") };
  } catch (error) {
    return { success: false, error: "Failed to generate template" };
  }
}

// ─── Import Products ─────────────────────────────────────────

export async function importProductsFromCSV(
  csvContent: string
): Promise<{ success: boolean; data?: { imported: number; errors: ImportRow[] }; error?: string }> {
  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { success: false, error: "No organization found" };

    const lines = csvContent.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      return { success: false, error: "CSV must have a header row and at least one data row" };
    }

    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine).map((h) => h.trim().toLowerCase().replace("*", ""));
    const dataLines = lines.slice(1);

    const requiredFields = ["name", "sku"];
    for (const field of requiredFields) {
      if (!headers.includes(field)) {
        return { success: false, error: `Missing required column: "${field}"` };
      }
    }

    // Get existing categories and products for validation
    const existingCategories = await db
      .select({ id: productCategories.id, name: productCategories.name })
      .from(productCategories)
      .where(and(eq(productCategories.orgId, orgId), eq(productCategories.isActive, true)));

    const existingProducts = await db
      .select({ sku: products.sku })
      .from(products)
      .where(eq(products.orgId, orgId));

    const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));
    const existingSKUs = new Set(existingProducts.map((p) => p.sku.toLowerCase()));

    const errors: ImportRow[] = [];
    const validRows: ImportRow[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const row: ImportRow & Record<string, any> = { _rowNumber: i + 2 };
      const rowErrors: string[] = [];

      headers.forEach((header, idx) => {
        const val = values[idx]?.trim() || "";
        switch (header) {
          case "name": row.name = val; break;
          case "sku": row.sku = val; break;
          case "barcode": row.barcode = val; break;
          case "category": row.category = val; break;
          case "type": row.type = val || "product"; break;
          case "unit": row.unit = val || "Pcs"; break;
          case "sale price": row.salePrice = val || "0"; break;
          case "cost price": row.costPrice = val || "0"; break;
          case "current stock": row.currentStock = val || "0"; break;
          case "min stock level": row.minStockLevel = val || "0"; break;
          case "tax rate (%)": row.taxRate = val || "0"; break;
          case "description": row.description = val; break;
          case "batch tracked": row.isBatchTracked = val; break;
          case "serial tracked": row.isSerialTracked = val; break;
        }
      });

      if (!row.name) rowErrors.push("Product name is required");
      if (!row.sku) rowErrors.push("SKU is required");

      if (row.sku && existingSKUs.has(row.sku.toLowerCase())) {
        rowErrors.push(`SKU "${row.sku}" already exists`);
      }

      if (row.category && !categoryMap.has(row.category.toLowerCase())) {
        rowErrors.push(`Category "${row.category}" not found`);
      }

      if (rowErrors.length > 0) {
        row._errors = rowErrors;
        errors.push(row as ImportRow);
      } else {
        validRows.push(row as ImportRow);
      }
    }

    // Import valid rows
    let imported = 0;
    for (const row of validRows) {
      const categoryId = row.category ? categoryMap.get(row.category.toLowerCase()) : null;

      await db.insert(products).values({
        orgId,
        name: row.name!,
        sku: row.sku!,
        barcode: row.barcode || null,
        categoryId: categoryId || null,
        type: (row.type as any) || "product",
        unit: row.unit || "Pcs",
        description: row.description || null,
        salePrice: row.salePrice || "0",
        costPrice: row.costPrice || "0",
        currentStock: row.currentStock || "0",
        minStockLevel: row.minStockLevel || "0",
        taxRate: row.taxRate || "0",
        isBatchTracked: row.isBatchTracked?.toLowerCase() === "yes",
        isSerialTracked: row.isSerialTracked?.toLowerCase() === "yes",
      });

      imported++;
    }

    return {
      success: true,
      data: { imported, errors },
    };
  } catch (error) {
    return { success: false, error: "Failed to import products" };
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
