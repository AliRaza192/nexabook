/**
 * Format number in Pakistani style (Lakhs/Crores)
 * Example: 1000 -> 1,000 | 100000 -> 1,00,000 | 10000000 -> 1,00,00,000
 */
export function formatPakistaniNumber(num: number): string {
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // Convert to string with 2 decimal places
  const numStr = absNum.toFixed(2);
  const [intPart, decPart] = numStr.split('.');

  // Handle Indian/Pakistani numbering system
  let result = '';
  let count = 0;

  // Process from right to left
  for (let i = intPart.length - 1; i >= 0; i--) {
    result = intPart[i] + result;
    count++;

    // Add comma after 3 digits from right, then every 2 digits
    if (count === 3 && i > 0) {
      result = ',' + result;
    } else if (count > 3 && (count - 3) % 2 === 0 && i > 0) {
      result = ',' + result;
    }
  }

  return (isNegative ? '-' : '') + result + '.' + decPart;
}

/**
 * Format number in International style
 * Example: 1000 -> 1,000 | 100000 -> 100,000 | 10000000 -> 10,000,000
 */
export function formatInternationalNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format number in Pakistani or International style based on preference
 * Default is South Asian (Pakistani) format
 */
export function formatPKR(amount: number, format: 'south-asian' | 'international' = 'south-asian'): string {
  const formatted = format === 'south-asian' 
    ? formatPakistaniNumber(amount) 
    : formatInternationalNumber(amount);
  return `Rs. ${formatted}`;
}

/**
 * Format currency in Pakistani style with Rs. prefix (alias for formatPKR)
 */
export function formatPakistaniCurrency(amount: number): string {
  return formatPKR(amount, 'south-asian');
}

/**
 * Format large amounts in short form for dashboard display
 * Examples: 150000 -> 1.5L, 10000000 -> 1Cr, 2500000 -> 25L
 */
export function formatPKRShort(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (absAmount >= 10000000) {
    // Crore
    const crores = (absAmount / 10000000).toFixed(1);
    return `${sign}${parseFloat(crores)}Cr`;
  } else if (absAmount >= 100000) {
    // Lakh
    const lakhs = (absAmount / 100000).toFixed(1);
    return `${sign}${parseFloat(lakhs)}L`;
  } else if (absAmount >= 1000) {
    // Thousand
    const thousands = (absAmount / 1000).toFixed(1);
    return `${sign}${parseFloat(thousands)}K`;
  }
  
  return `${sign}${absAmount.toFixed(0)}`;
}

/**
 * Convert number to words (Pakistani/Indian numbering system)
 * Supports up to Crores (10 million)
 */
export function formatAmountWords(amount: number): string {
  if (amount === 0) return 'Zero';
  
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Split into rupees and paisa
  const rupees = Math.floor(absAmount);
  const paisa = Math.round((absAmount - rupees) * 100);
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertToWords(num: number): string {
    if (num === 0) return '';
    
    let result = '';
    
    // Crores
    if (num >= 10000000) {
      result += convertToWords(Math.floor(num / 10000000)) + ' Crore ';
      num = num % 10000000;
    }
    
    // Lakhs
    if (num >= 100000) {
      result += convertToWords(Math.floor(num / 100000)) + ' Lakh ';
      num = num % 100000;
    }
    
    // Thousands
    if (num >= 1000) {
      result += convertToWords(Math.floor(num / 1000)) + ' Thousand ';
      num = num % 1000;
    }
    
    // Hundreds
    if (num >= 100) {
      result += ones[Math.floor(num / 100)] + ' Hundred ';
      num = num % 100;
      if (num > 0) result += 'and ';
    }
    
    // Tens and Ones
    if (num >= 20) {
      result += tens[Math.floor(num / 10)] + ' ';
      num = num % 10;
    }
    
    if (num >= 10 && num < 20) {
      result += teens[num - 10] + ' ';
      num = 0;
    }
    
    if (num > 0 && num < 10) {
      result += ones[num] + ' ';
    }
    
    return result;
  }
  
  let words = 'Rs. ' + convertToWords(rupees).trim().replace(/\s+/g, ' ');

  if (paisa > 0) {
    words += ' and ' + convertToWords(paisa).trim().replace(/\s+/g, ' ') + ' Paisa';
  }

  words += ' Only';

  if (isNegative) {
    words = 'Negative ' + words;
  }

  return words;
}
