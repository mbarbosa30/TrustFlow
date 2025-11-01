import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format currency amount based on currency code
 * @param amount - The numeric amount to format
 * @param currencyCode - Currency code (USD, ARS, MXN, etc.)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatCurrency(amount: number, currencyCode: string = 'USD', decimals: number = 2): string {
  const formatted = amount.toFixed(decimals);
  
  switch (currencyCode.toUpperCase()) {
    case 'ARS':
      return `ARS $${formatted}`;
    case 'USD':
    case 'USDC':
      return `$${formatted}`;
    case 'MXN':
      return `MXN $${formatted}`;
    case 'EUR':
      return `€${formatted}`;
    case 'GBP':
      return `£${formatted}`;
    default:
      return `${currencyCode} ${formatted}`;
  }
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  switch (currencyCode.toUpperCase()) {
    case 'ARS':
      return 'ARS $';
    case 'USD':
    case 'USDC':
      return '$';
    case 'MXN':
      return 'MXN $';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return currencyCode;
  }
}
