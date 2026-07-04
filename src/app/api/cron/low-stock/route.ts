import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const lowStock = await db
      .select({
        orgId: products.orgId,
        name: products.name,
        sku: products.sku,
        currentStock: products.currentStock,
        minLevel: products.minStockLevel,
      })
      .from(products)
      .where(
        sql`${products.currentStock} <= ${products.minStockLevel} AND ${products.minStockLevel} > '0'`
      )
      .limit(50);

    return NextResponse.json({
      success: true,
      count: lowStock.length,
      products: lowStock,
      summary: lowStock.length > 0
        ? `${lowStock.length} products low across ${[...new Set(lowStock.map((p) => p.orgId))].length} organizations`
        : "All stock levels are healthy",
    });
  } catch (err) {
    console.error("Low stock cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
