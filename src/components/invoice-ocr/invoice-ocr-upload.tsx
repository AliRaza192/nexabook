"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, FileImage, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

interface ExtractedItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface ExtractedData {
  vendorName: string | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  lineItems: ExtractedItem[];
  subtotal: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  confidence: number;
}

interface OCRResult {
  success: boolean;
  data?: ExtractedData;
  filePath?: string;
}

export function InvoiceOCRUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const processImage = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/invoice-ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "Processing failed");
      }
    } catch {
      setError("Failed to process image");
    } finally {
      setProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Invoice OCR
        </CardTitle>
        <CardDescription>Upload invoice image to extract data automatically</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload */}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Upload invoice image (JPG, PNG, PDF)
          </p>
          <Input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="max-w-xs mx-auto"
          />
        </div>

        {/* Process Button */}
        {selectedFile && (
          <Button onClick={processImage} disabled={processing} className="w-full">
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileImage className="h-4 w-4 mr-2" />
                Extract Data
              </>
            )}
          </Button>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Results */}
        {result?.success && result.data && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">Data Extracted</span>
              <Badge className={getConfidenceColor(result.data.confidence)}>
                {result.data.confidence}% confidence
              </Badge>
              {result.data.confidence < 70 && (
                <Badge variant="outline" className="text-yellow-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Low Confidence
                </Badge>
              )}
            </div>

            {/* Extracted Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Vendor</Label>
                <p className="font-medium">{result.data.vendorName || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Invoice #</Label>
                <p className="font-medium">{result.data.invoiceNumber || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <p className="font-medium">{result.data.invoiceDate || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total</Label>
                <p className="font-medium">
                  {result.data.totalAmount ? `Rs. ${result.data.totalAmount.toLocaleString()}` : "—"}
                </p>
              </div>
            </div>

            {/* Line Items */}
            {result.data.lineItems.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Line Items</Label>
                <div className="border rounded-lg divide-y">
                  {result.data.lineItems.map((item, i) => (
                    <div key={i} className="p-2 flex justify-between text-sm">
                      <span>{item.description}</span>
                      <span>Rs. {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action */}
            <Button className="w-full" variant="outline">
              Review & Save as Draft
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
