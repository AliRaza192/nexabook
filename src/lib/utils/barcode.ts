/**
 * Barcode formatting and validation utilities
 * Supports: CODE128 (default), EAN13, UPC-A, CODE39, QR
 */

export type BarcodeFormat = "CODE128" | "CODE39" | "EAN13" | "UPC-A" | "二维码";

export interface BarcodeLabelConfig {
  width: number;           // label width in mm
  height: number;          // label height in mm
  fields: {
    productName: boolean;
    sku: boolean;
    price: boolean;
    barcode: boolean;
    serialNumber: boolean;
  };
  copies: number;
  format: BarcodeFormat;
}

export const DEFAULT_LABEL_CONFIG: BarcodeLabelConfig = {
  width: 50,
  height: 30,
  fields: { productName: true, sku: true, price: false, barcode: true, serialNumber: false },
  copies: 1,
  format: "CODE128",
};

export function generateSerialBarcode(productSku: string, serialNumber: string): string {
  const clean = serialNumber.replace(/[^A-Za-z0-9\-]/g, "");
  return `${productSku}-${clean}`;
}

export function generateProductBarcode(productSku: string, productId: string): string {
  return productSku || productId.slice(0, 12).toUpperCase();
}

export function validateBarcode(value: string): boolean {
  return /^[A-Za-z0-9\-]+$/.test(value) && value.length >= 3 && value.length <= 50;
}

export interface LabelItem {
  id: string;
  productName: string;
  sku: string;
  barcodeValue: string;
  serialNumber?: string;
  price?: string;
  quantity: number;
}
