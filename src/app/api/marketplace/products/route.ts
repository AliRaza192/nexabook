import { NextResponse } from "next/server";
import { db } from "@/db";
import { digitalFteProducts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const products = await db
      .select()
      .from(digitalFteProducts)
      .where(eq(digitalFteProducts.isActive, true));

    return NextResponse.json({
      success: true,
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        features: Array.isArray(p.features) ? p.features : JSON.parse(String(p.features)),
        priceMonthly: parseFloat(p.priceMonthly),
        priceYearly: p.priceYearly ? parseFloat(p.priceYearly) : null,
        category: p.category,
      })),
    });
  } catch (error) {
    console.error("[Marketplace Products]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
