"use server";

import type { CustomerInfo, TransactionResult } from "./types";

function getConfig() {
  return {
    accountNumber: process.env.EASYPAISA_ACCOUNT_NUMBER || "",
    storeName: process.env.EASYPAISA_STORE_NAME || "",
    apiKey: process.env.EASYPAISA_API_KEY || "",
    returnUrl: process.env.EASYPAISA_RETURN_URL || "",
    apiUrl:
      process.env.EASYPAISA_API_URL ||
      "https://sandbox.easypaisa.com.pk/easypay/Integration.js/GenerateHash",
    statusUrl:
      process.env.EASYPAISA_STATUS_URL ||
      "https://sandbox.easypaisa.com.pk/easypay/Integration.js/GetTransactionStatus",
  };
}

function generateTxnRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `EP${ts}${rand}`;
}

export async function initiatePayment(
  amount: number,
  orderRef: string,
  customerInfo: CustomerInfo,
): Promise<TransactionResult> {
  const config = getConfig();
  const transactionRef = generateTxnRef();

  const payload = {
    amount: amount.toString(),
    orderRef,
    transactionRef,
    storeName: config.storeName,
    accountNumber: config.accountNumber,
    returnUrl: config.returnUrl,
    customerName: customerInfo.name,
    customerEmail: customerInfo.email || "",
    customerPhone: customerInfo.phone || "",
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      return {
        success: false,
        transactionRef,
        gatewayRef: "",
        amount,
        status: "failed",
        message: `Easypaisa API error: ${response.status}`,
        rawResponse: rawText,
      };
    }

    const redirectUrl =
      data.redirectUrl ||
      data.paymentUrl ||
      data.url ||
      "";

    return {
      success: true,
      transactionRef,
      gatewayRef: data.transactionRef || data.transactionId || transactionRef,
      amount,
      status: "pending",
      redirectUrl,
      message: "Payment initiated. Redirecting to Easypaisa.",
      rawResponse: rawText,
    };
  } catch (error: any) {
    return {
      success: false,
      transactionRef,
      gatewayRef: "",
      amount,
      status: "error",
      message: `Easypaisa connection failed: ${error.message}`,
    };
  }
}

export async function verifyPayment(transactionRef: string): Promise<TransactionResult> {
  const config = getConfig();

  const payload = {
    transactionRef,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  try {
    const response = await fetch(config.statusUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      return {
        success: false,
        transactionRef,
        gatewayRef: "",
        amount: 0,
        status: "failed",
        message: `Easypaisa status check failed: ${response.status}`,
        rawResponse: rawText,
      };
    }

    const statusStr = (data.status || "").toLowerCase();
    const succeeded = statusStr === "completed" || statusStr === "success";

    return {
      success: succeeded,
      transactionRef,
      gatewayRef: data.gatewayRef || data.transactionId || "",
      amount: Number(data.amount || 0),
      status: statusStr || "unknown",
      message: data.message || data.responseMessage,
      rawResponse: rawText,
    };
  } catch (error: any) {
    return {
      success: false,
      transactionRef,
      gatewayRef: "",
      amount: 0,
      status: "error",
      message: `Easypaisa verification failed: ${error.message}`,
    };
  }
}
