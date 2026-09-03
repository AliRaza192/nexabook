"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  getSmartDefaults,
  detectDuplicateInvoices,
  getPricingSuggestions,
  detectAnomalies,
  getPaymentPrediction,
  type SmartDefaults,
  type DuplicateInvoice,
  type PricingSuggestion,
  type AnomalyFlag,
  type PaymentPrediction,
} from "@/lib/actions/smart-invoice";
import { getCurrentOrgId } from "@/lib/actions/shared";

interface SmartSuggestionsProps {
  customerId: string | null;
  lineItems: {
    productId?: string;
    unitPrice: string;
    quantity: string;
  }[];
  netAmount: string;
  onApplyPrice: (lineIndex: number, price: string) => void;
  onApplyDefaults: (defaults: SmartDefaults) => void;
}

export default function SmartSuggestions({
  customerId,
  lineItems,
  netAmount,
  onApplyPrice,
  onApplyDefaults,
}: SmartSuggestionsProps) {
  const [smartDefaults, setSmartDefaults] = useState<SmartDefaults | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateInvoice[]>([]);
  const [pricingSuggestions, setPricingSuggestions] = useState<
    Map<number, PricingSuggestion>
  >(new Map());
  const [anomalies, setAnomalies] = useState<AnomalyFlag[]>([]);
  const [paymentPrediction, setPaymentPrediction] =
    useState<PaymentPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const defaultsEffectRan = useRef(false);

  useEffect(() => {
    const getOrg = async () => {
      const id = await getCurrentOrgId();
      setOrgId(id);
    };
    getOrg();
  }, []);

  // Fetch smart defaults when customer changes
  useEffect(() => {
    if (!defaultsEffectRan.current) {
      defaultsEffectRan.current = true;
      return;
    }
    if (!customerId || !orgId) {
      Promise.resolve().then(() => {
        setSmartDefaults(null);
        setPaymentPrediction(null);
      });
      return;
    }

    const fetchDefaults = async () => {
      setLoading(true);
      const [defaults, prediction] = await Promise.all([
        getSmartDefaults(customerId, orgId),
        getPaymentPrediction(customerId, orgId),
      ]);
      if (defaults.success && defaults.data) {
        setSmartDefaults(defaults.data);
        onApplyDefaults(defaults.data);
      }
      if (prediction.success && prediction.data) {
        setPaymentPrediction(prediction.data);
      }
      setLoading(false);
    };
    fetchDefaults();
  }, [customerId, orgId, onApplyDefaults]);

  // Fetch pricing suggestions when products change
  useEffect(() => {
    if (!customerId || !orgId || lineItems.length === 0) return;

    const fetchSuggestions = async () => {
      const newSuggestions = new Map<number, PricingSuggestion>();

      for (let i = 0; i < lineItems.length; i++) {
        const item = lineItems[i];
        if (!item.productId) continue;

        const result = await getPricingSuggestions(
          item.productId,
          customerId,
          orgId
        );
        if (result.success && result.data) {
          newSuggestions.set(i, result.data);
        }
      }

      setPricingSuggestions(newSuggestions);
    };

    fetchSuggestions();
  }, [customerId, orgId, lineItems.map((i) => i.productId).join(",")]);

  // Check for duplicates before save
  const checkDuplicates = useCallback(async () => {
    if (!customerId || !orgId || lineItems.length === 0) return true;

    const result = await detectDuplicateInvoices(
      customerId,
      lineItems,
      netAmount,
      orgId
    );
    if (result.success && result.data && result.data.length > 0) {
      setDuplicates(result.data);
      setShowDuplicateDialog(true);
      return false;
    }
    return true;
  }, [customerId, lineItems, netAmount, orgId]);

  // Detect anomalies when amount changes
  useEffect(() => {
    if (!customerId || !orgId || lineItems.length === 0) return;

    const detect = async () => {
      const result = await detectAnomalies(
        customerId,
        lineItems,
        netAmount,
        orgId
      );
      if (result.success && result.data) {
        setAnomalies(result.data);
      }
    };

    detect();
  }, [customerId, orgId, netAmount, lineItems.length]);

  // Expose checkDuplicates for parent to call before save
  useEffect(() => {
    (window as any).__smartInvoiceCheckDuplicates = checkDuplicates;
    return () => {
      delete (window as any).__smartInvoiceCheckDuplicates;
    };
  }, [checkDuplicates]);

  if (!customerId) return null;

  return (
    <div className="space-y-3">
      {/* Payment Prediction Badge */}
      {paymentPrediction && paymentPrediction.prediction !== "insufficient_data" && (
        <div className="flex items-center gap-2">
          <Badge
            variant={
              paymentPrediction.prediction === "likely_on_time"
                ? "default"
                : "destructive"
            }
          >
            {paymentPrediction.prediction === "likely_on_time" ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : (
              <Clock className="w-3 h-3 mr-1" />
            )}
            {paymentPrediction.onTimeRate}% on-time
            <span className="ml-1 text-xs opacity-70">
              ({paymentPrediction.totalInvoices} invoices, avg{" "}
              {paymentPrediction.averageDaysToPay}d)
            </span>
          </Badge>
        </div>
      )}

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Potential Duplicate Invoices
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {duplicates.map((dup) => (
              <div
                key={dup.invoiceId}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div>
                  <p className="font-medium">{dup.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Rs. {parseFloat(dup.netAmount).toLocaleString("en-PK")} •{" "}
                    {dup.itemCount} items • {dup.overlapPercentage}% overlap
                  </p>
                </div>
                <Badge variant="outline">
                  {new Date(dup.issueDate).toLocaleDateString("en-PK")}
                </Badge>
              </div>
            ))}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDuplicateDialog(false)}
              >
                Proceed Anyway
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowDuplicateDialog(false);
                  setDuplicates([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Anomaly Flags */}
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          className={`flex items-start gap-2 p-3 rounded-lg border ${
            anomaly.severity === "warning"
              ? "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800"
              : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
          }`}
        >
          {anomaly.severity === "warning" ? (
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
          ) : (
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          )}
          <div>
            <p className="text-sm font-medium capitalize">
              {anomaly.type.replace(/_/g, " ")}
            </p>
            <p className="text-sm text-muted-foreground">{anomaly.message}</p>
          </div>
        </div>
      ))}

      {/* Pricing Suggestions */}
      {lineItems.map((item, index) => {
        const suggestion = pricingSuggestions.get(index);
        if (!suggestion) return null;

        const hasSuggestions =
          suggestion.lastSoldPrice ||
          suggestion.averagePrice30d ||
          suggestion.customerPriceRange;

        if (!hasSuggestions) return null;

        return (
          <Card key={index} className="border-dashed">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Pricing suggestions for Line {index + 1}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestion.lastSoldPrice && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      onApplyPrice(index, suggestion.lastSoldPrice!)
                    }
                  >
                    Last: Rs.{" "}
                    {parseFloat(suggestion.lastSoldPrice).toLocaleString("en-PK")}
                  </Button>
                )}
                {suggestion.averagePrice30d && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      onApplyPrice(index, suggestion.averagePrice30d!)
                    }
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Avg: Rs.{" "}
                    {parseFloat(suggestion.averagePrice30d).toLocaleString("en-PK")}
                  </Button>
                )}
                {suggestion.customerPriceRange && (
                  <Badge variant="secondary" className="text-xs">
                    Range: Rs.{" "}
                    {parseFloat(suggestion.customerPriceRange.min).toLocaleString("en-PK")}{" "}
                    — Rs.{" "}
                    {parseFloat(suggestion.customerPriceRange.max).toLocaleString("en-PK")}{" "}
                    ({suggestion.customerPriceRange.count} invoices)
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Smart Defaults Summary */}
      {smartDefaults && smartDefaults.confidence > 0 && (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium">Smart Defaults Applied</span>
              <Badge variant="outline" className="text-xs">
                {Math.round(smartDefaults.confidence * 100)}% confidence
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {smartDefaults.suggestedDueDate && (
                <span>Due: {smartDefaults.suggestedDueDate}</span>
              )}
              {smartDefaults.suggestedOrderBooker && (
                <span>Booker: {smartDefaults.suggestedOrderBooker}</span>
              )}
              {smartDefaults.suggestedWarehouseId && (
                <span>Warehouse auto-selected</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
