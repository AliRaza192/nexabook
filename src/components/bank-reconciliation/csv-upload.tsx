"use client";

import { useCallback, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";

interface CsvUploadProps {
  onUpload: (csvContent: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export default function CsvUpload({ onUpload, isProcessing = false, disabled = false }: CsvUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
        alert("Please upload a CSV file");
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        onUpload(text);
      };
      reader.readAsText(file);
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearFile = useCallback(() => {
    setFileName(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  return (
    <Card
      className={`enterprise-card border-2 border-dashed transition-colors ${
        dragActive ? "border-nexabook-500 bg-nexabook-50" : "border-slate-200"
      } ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer hover:border-nexabook-300"}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <CardContent className="p-6 flex flex-col items-center gap-3">
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin text-nexabook-500" />
        ) : fileName ? (
          <FileSpreadsheet className="h-8 w-8 text-green-600" />
        ) : (
          <Upload className="h-8 w-8 text-nexabook-400" />
        )}
        <div className="text-center">
          {fileName ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-nexabook-900">{fileName}</span>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-nexabook-700">
                Drop bank statement CSV here or click to browse
              </p>
              <p className="text-xs text-nexabook-400 mt-1">
                Supports HBL, Meezan, UBL, MCB, Allied CSV formats
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
