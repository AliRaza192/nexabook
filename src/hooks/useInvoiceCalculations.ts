import { useState, useCallback, useMemo } from "react";

export interface LineItem {
  productId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  discountPercentage: string;
  discountAmount: string;
  taxRate: string;
  lineTotal: string;
}

export interface CalculationResult {
  grossAmount: number;
  totalDiscountAmount: number;
  totalDiscountPercentage: number;
  taxAmount: number;
  netBeforeShipping: number;
  shippingCharges: number;
  roundOff: number;
  netAmount: number;
  lineTotals: number[];
}

export function useInvoiceCalculations(
  lineItems: LineItem[],
  shippingCharges: string = "0"
): CalculationResult & {
  updateLineItem: (index: number, field: keyof LineItem, value: string) => LineItem[];
} {
  const [items, setItems] = useState<LineItem[]>(lineItems);

  // Calculate line totals
  const lineTotals = useMemo(() => {
    return items.map((item) => {
      const qty = parseFloat(item.quantity || "0");
      const price = parseFloat(item.unitPrice || "0");
      const subtotal = qty * price;
      return subtotal;
    });
  }, [items]);

  // Calculate gross amount
  const grossAmount = useMemo(() => {
    return lineTotals.reduce((sum, total) => sum + total, 0);
  }, [lineTotals]);

  // Calculate discount amounts per line
  const discountAmounts = useMemo(() => {
    return items.map((item, index) => {
      const subtotal = lineTotals[index];
      const discPct = parseFloat(item.discountPercentage || "0");
      return subtotal * (discPct / 100);
    });
  }, [items, lineTotals]);

  const totalDiscountAmount = useMemo(() => {
    return discountAmounts.reduce((sum, amt) => sum + amt, 0);
  }, [discountAmounts]);

  const totalDiscountPercentage = useMemo(() => {
    if (grossAmount === 0) return 0;
    return (totalDiscountAmount / grossAmount) * 100;
  }, [grossAmount, totalDiscountAmount]);

  // Calculate tax amounts per line (on amount after discount)
  const taxAmounts = useMemo(() => {
    return items.map((item, index) => {
      const subtotal = lineTotals[index];
      const discount = discountAmounts[index];
      const afterDiscount = subtotal - discount;
      const taxRate = parseFloat(item.taxRate || "0");
      return afterDiscount * (taxRate / 100);
    });
  }, [items, lineTotals, discountAmounts]);

  const taxAmount = useMemo(() => {
    return taxAmounts.reduce((sum, amt) => sum + amt, 0);
  }, [taxAmounts]);

  // Calculate net amount
  const netBeforeShipping = useMemo(() => {
    return grossAmount - totalDiscountAmount + taxAmount;
  }, [grossAmount, totalDiscountAmount, taxAmount]);

  const shipping = parseFloat(shippingCharges || "0");

  const netBeforeRound = useMemo(() => {
    return netBeforeShipping + shipping;
  }, [netBeforeShipping, shipping]);

  const roundOff = useMemo(() => {
    return Math.round(netBeforeRound) - netBeforeRound;
  }, [netBeforeRound]);

  const netAmount = useMemo(() => {
    return Math.round(netBeforeRound);
  }, [netBeforeRound]);

  // Update line item
  const updateLineItem = useCallback(
    (index: number, field: keyof LineItem, value: string): LineItem[] => {
      const updatedItems = [...items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      setItems(updatedItems);
      return updatedItems;
    },
    [items]
  );

  return {
    grossAmount,
    totalDiscountAmount,
    totalDiscountPercentage,
    taxAmount,
    netBeforeShipping,
    shippingCharges: shipping,
    roundOff,
    netAmount,
    lineTotals,
    updateLineItem,
  };
}
