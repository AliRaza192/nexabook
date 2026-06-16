"use server";

export interface FBRSubmissionPayload {
  ntn: string;
  strn: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerNtn?: string;
  customerStrn?: string;
  customerAddress?: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxType: string;
    lineTotal: number;
  }>;
}

export interface FBRSubmissionResponse {
  success: boolean;
  fbrInvoiceNumber?: string;
  submissionId?: string;
  error?: string;
  rawResponse?: string;
}

function getFBRConfig() {
  return {
    apiUrl: process.env.FBR_API_URL || "https://api.fbr.gov.pk/api/invoices",
    apiKey: process.env.FBR_API_KEY || "",
    sandbox: process.env.FBR_SANDBOX !== "false",
  };
}

export async function submitInvoiceToFBR(
  payload: FBRSubmissionPayload,
): Promise<FBRSubmissionResponse> {
  const config = getFBRConfig();

  if (!payload.ntn || !payload.strn) {
    return { success: false, error: "Organization NTN and STRN are required for FBR submission" };
  }

  const requestBody = {
    RegistrationNumber: payload.ntn,
    STRN: payload.strn,
    InvoiceNumber: payload.invoiceNumber,
    InvoiceDate: payload.invoiceDate,
    BuyerName: payload.customerName,
    BuyerNTN: payload.customerNtn || "",
    BuyerSTRN: payload.customerStrn || "",
    BuyerAddress: payload.customerAddress || "",
    TotalAmount: payload.totalAmount.toFixed(2),
    TaxAmount: payload.taxAmount.toFixed(2),
    NetAmount: payload.netAmount.toFixed(2),
    Items: payload.items.map((item) => ({
      Description: item.description,
      Quantity: item.quantity,
      UnitPrice: item.unitPrice.toFixed(2),
      TaxRate: item.taxRate,
      TaxType: item.taxType,
      LineTotal: item.lineTotal.toFixed(2),
    })),
  };

  // Simulated submission when no API key configured
  if (!config.apiKey) {
    const simulatedId = `FBR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    return {
      success: true,
      fbrInvoiceNumber: `FBR-${payload.invoiceNumber}`,
      submissionId: simulatedId,
      rawResponse: JSON.stringify({
        message: "Simulated FBR submission (no API key configured)",
        invoiceNumber: payload.invoiceNumber,
        submissionId: simulatedId,
        timestamp: new Date().toISOString(),
      }),
    };
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Sandbox": String(config.sandbox),
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.message || data.error || `FBR API returned status ${response.status}`,
        rawResponse: responseText,
      };
    }

    return {
      success: true,
      fbrInvoiceNumber: data.InvoiceNumber || data.fbrInvoiceNumber,
      submissionId: data.SubmissionId || data.submissionId,
      rawResponse: responseText,
    };
  } catch (error: any) {
    return {
      success: false,
      error: `FBR API connection failed: ${error.message}`,
    };
  }
}
