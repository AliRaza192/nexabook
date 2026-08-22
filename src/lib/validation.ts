export function validateNTN(ntn: string): { valid: boolean; error?: string } {
  const cleaned = ntn.replace(/[-\s]/g, "");
  if (!/^\d{5,7}$/.test(cleaned)) {
    return {
      valid: false,
      error: `NTN must be 5-7 digits. Got: "${ntn}". Example: 1234567`,
    };
  }
  return { valid: true };
}

export function validateSTRN(strn: string): { valid: boolean; error?: string } {
  const cleaned = strn.replace(/[-\s]/g, "");
  if (!/^[A-Za-z0-9]{13}$/.test(cleaned)) {
    return {
      valid: false,
      error: `STRN must be 13 characters. Got: "${strn}". Example: 1700123456789`,
    };
  }
  return { valid: true };
}