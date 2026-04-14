import QRCode from 'qrcode';

export interface FBRQRData {
  ntn: string;
  strn: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  taxAmount: number;
}

/**
 * Format FBR QR data string
 * Standard FBR format: NTN:STRN:InvoiceNo:Date:Amount:Tax
 */
export function formatFBRQRString(data: FBRQRData): string {
  const dateStr = data.invoiceDate instanceof Date 
    ? data.invoiceDate.toISOString().split('T')[0]
    : new Date(data.invoiceDate).toISOString().split('T')[0];
  
  return `${data.ntn}:${data.strn}:${data.invoiceNumber}:${dateStr}:${data.totalAmount.toFixed(2)}:${data.taxAmount.toFixed(2)}`;
}

/**
 * Generate FBR-compliant QR code as data URL
 * Returns a base64-encoded PNG image
 */
export async function generateFBRQRCode(
  data: FBRQRData,
  options?: {
    size?: number;
    margin?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
): Promise<string> {
  const qrString = formatFBRQRString(data);
  
  const qrOptions = {
    errorCorrectionLevel: 'M' as const,
    type: 'image/png' as const,
    width: options?.size || 150,
    margin: options?.margin ?? 2,
    color: {
      dark: options?.color?.dark || '#000000',
      light: options?.color?.light || '#FFFFFF',
    },
  };

  try {
    const dataUrl = await QRCode.toDataURL(qrString, qrOptions);
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate FBR QR code:', error);
    throw new Error('Failed to generate FBR QR code');
  }
}

/**
 * Generate QR code buffer for PDF embedding
 * Returns a PNG buffer that can be directly embedded in jsPDF
 */
export async function generateFBRQRCodeBuffer(
  data: FBRQRData,
  options?: {
    size?: number;
    margin?: number;
  }
): Promise<Buffer> {
  const qrString = formatFBRQRString(data);
  
  const qrOptions = {
    errorCorrectionLevel: 'M' as const,
    width: options?.size || 100,
    margin: options?.margin ?? 1,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  };

  try {
    const buffer = await QRCode.toBuffer(qrString, qrOptions);
    return buffer;
  } catch (error) {
    console.error('Failed to generate FBR QR code buffer:', error);
    throw new Error('Failed to generate FBR QR code buffer');
  }
}

/**
 * Check if organization has required tax registration for FBR QR
 */
export function isFBREligible(orgData: { ntn?: string | null; strn?: string | null }): boolean {
  return !!(orgData.ntn && orgData.ntn.trim() && orgData.strn && orgData.strn.trim());
}
