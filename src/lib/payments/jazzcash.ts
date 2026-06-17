"use server";

import crypto from "crypto";
import type { CustomerInfo, TransactionResult } from "./types";

function getConfig() {
  return {
    merchantId: process.env.JAZZCASH_MERCHANT_ID || "",
    password: process.env.JAZZCASH_PASSWORD || "",
    integritySalt: process.env.JAZZCASH_INTEGRITY_SALT || "",
    returnUrl: process.env.JAZZCASH_RETURN_URL || "",
    apiUrl:
      process.env.JAZZCASH_API_URL ||
      "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform",
    statusUrl:
      process.env.JAZZCASH_STATUS_URL ||
      "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform",
  };
}

function generateTxnRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `JC${ts}${rand}`;
}

function computeSecureHash(salt: string, params: Record<string, string>): string {
  const orderedKeys = Object.keys(params).sort();
  const concatenated = orderedKeys.map((k) => params[k]).join("&");
  const hashInput = salt + "&" + concatenated;
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

export async function initiatePayment(
  amount: number,
  orderRef: string,
  _customerInfo: CustomerInfo,
): Promise<TransactionResult> {
  const config = getConfig();
  const transactionRef = generateTxnRef();
  const amountInPaisa = Math.round(amount * 100).toString();

  const payload: Record<string, string> = {
    pp_Version: "1.1",
    pp_TxnType: "MWALLET",
    pp_Language: "EN",
    pp_MerchantID: config.merchantId,
    pp_Password: config.password,
    pp_BankID: "",
    pp_ProductID: "",
    pp_Amount: amountInPaisa,
    pp_TxnRefNo: transactionRef,
    pp_Description: `Order ${orderRef}`,
    pp_ReturnURL: config.returnUrl,
    ppmpf_1: orderRef,
    ppmpf_2: _customerInfo.name,
    ppmpf_3: _customerInfo.email || "",
    ppmpf_4: _customerInfo.phone || "",
    ppmpf_5: "",
  };

  payload.pp_SecureHash = computeSecureHash(config.integritySalt, payload);

  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload),
    });

    const rawText = await response.text();

    if (!response.ok) {
      return {
        success: false,
        transactionRef,
        gatewayRef: "",
        amount,
        status: "failed",
        message: `JazzCash API error: ${response.status}`,
        rawResponse: rawText,
      };
    }

    return {
      success: true,
      transactionRef,
      gatewayRef: transactionRef,
      amount,
      status: "pending",
      redirectUrl: config.apiUrl,
      message: "Payment initiated. Redirecting to JazzCash.",
      rawResponse: rawText,
    };
  } catch (error: any) {
    return {
      success: false,
      transactionRef,
      gatewayRef: "",
      amount,
      status: "error",
      message: `JazzCash connection failed: ${error.message}`,
    };
  }
}

export async function verifyPayment(transactionRef: string): Promise<TransactionResult> {
  const config = getConfig();

  const payload: Record<string, string> = {
    pp_MerchantID: config.merchantId,
    pp_Password: config.password,
    pp_TxnRefNo: transactionRef,
  };

  payload.pp_SecureHash = computeSecureHash(config.integritySalt, payload);

  try {
    const response = await fetch(config.statusUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(payload),
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
        message: `JazzCash status check failed: ${response.status}`,
        rawResponse: rawText,
      };
    }

    const ppResponseCode = data.pp_ResponseCode || "";
    const succeeded = ppResponseCode === "000";
    const ppAmount = data.pp_Amount ? (Number(data.pp_Amount) / 100).toString() : "0";

    return {
      success: succeeded,
      transactionRef,
      gatewayRef: data.pp_TxnRefNo || data.pp_RetreivalReferenceNo || "",
      amount: Number(ppAmount),
      status: succeeded ? "completed" : data.pp_ResponseMessage || "failed",
      message: data.pp_ResponseMessage,
      rawResponse: rawText,
    };
  } catch (error: any) {
    return {
      success: false,
      transactionRef,
      gatewayRef: "",
      amount: 0,
      status: "error",
      message: `JazzCash verification failed: ${error.message}`,
    };
  }
}
