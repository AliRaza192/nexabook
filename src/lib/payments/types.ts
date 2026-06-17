"use server";

export interface CustomerInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionRef: string;
  gatewayRef: string;
  amount: number;
  status: string;
  redirectUrl?: string;
  message?: string;
  rawResponse?: unknown;
}

export interface PaymentGateway {
  initiatePayment(
    amount: number,
    orderRef: string,
    customerInfo: CustomerInfo
  ): Promise<TransactionResult>;

  verifyPayment(transactionRef: string): Promise<TransactionResult>;
}
