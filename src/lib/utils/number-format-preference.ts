/**
 * Get the user's preferred number format from localStorage
 * Returns 'south-asian' (default) or 'international'
 */
export function getNumberFormatPreference(): 'south-asian' | 'international' {
  if (typeof window === 'undefined') {
    return 'south-asian'; // Default for SSR
  }
  
  const stored = localStorage.getItem('nexabook-number-format');
  return (stored as 'south-asian' | 'international') || 'south-asian';
}

/**
 * Set the user's preferred number format in localStorage
 */
export function setNumberFormatPreference(format: 'south-asian' | 'international'): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('nexabook-number-format', format);
  }
}
