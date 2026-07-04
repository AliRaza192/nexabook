"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import type { BarcodeFormat } from "@/lib/utils/barcode";

interface BarcodeProps {
  value: string;
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  margin?: number;
  className?: string;
}

export function Barcode({
  value,
  format = "CODE128",
  width = 2,
  height = 60,
  fontSize = 16,
  displayValue = true,
  margin = 10,
  className,
}: BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          fontSize,
          displayValue,
          margin,
          background: "#ffffff",
          lineColor: "#000000",
          font: "monospace",
          textMargin: 2,
        });
      } catch {
        // invalid barcode value
      }
    }
  }, [value, format, width, height, fontSize, displayValue, margin]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{ display: "block", maxWidth: "100%" }}
    />
  );
}
