"use client";

import { Barcode } from "./Barcode";
import type { LabelItem, BarcodeLabelConfig, DEFAULT_LABEL_CONFIG } from "@/lib/utils/barcode";

interface LabelPreviewProps {
  items: LabelItem[];
  config?: BarcodeLabelConfig;
  onConfigChange?: (config: BarcodeLabelConfig) => void;
}

export function LabelPreview({ items, config }: LabelPreviewProps) {
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-nexabook-400 text-sm">
        Select products to preview labels
      </div>
    );
  }

  const expanded = items.flatMap(item =>
    Array.from({ length: item.quantity }, (_, i) => ({
      ...item,
      instanceId: `${item.id}-${i}`,
    }))
  );

  return (
    <div
      className="grid gap-2 p-4 bg-white rounded-lg border"
      style={{
        gridTemplateColumns: `repeat(auto-fill, minmax(${config?.width ?? 50}mm, 1fr))`,
      }}
    >
      {expanded.map((item) => (
        <div
          key={item.instanceId}
          className="border border-gray-200 rounded p-2 text-center"
          style={{ width: `${config?.width ?? 50}mm`, height: `${config?.height ?? 30}mm` }}
        >
          {config?.fields.productName && (
            <div className="text-[8px] font-medium truncate leading-tight">{item.productName}</div>
          )}
          {config?.fields.sku && (
            <div className="text-[6px] text-gray-500 truncate">{item.sku}</div>
          )}
          {config?.fields.barcode && (
            <Barcode
              value={item.barcodeValue}
              format={config?.format}
              width={1.5}
              height={28}
              fontSize={9}
              margin={2}
            />
          )}
          {config?.fields.serialNumber && item.serialNumber && (
            <div className="text-[7px] font-mono truncate">S/N: {item.serialNumber}</div>
          )}
          {config?.fields.price && item.price && (
            <div className="text-[9px] font-bold text-green-700">{item.price}</div>
          )}
        </div>
      ))}
    </div>
  );
}
