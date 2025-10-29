/**
 * Exchange Rate Service for ARS/USD display
 * All transactions in USDC, display in local currency
 * 
 * Mock implementation initially - ready for real-time API integration later
 */

export interface ExchangeRate {
  currency: string;
  rateToUsd: number; // How many local currency units per 1 USD
  lastUpdated: Date;
}

// Mock exchange rates
const MOCK_RATES: Record<string, number> = {
  ARS: 1000, // 1 USD = 1000 ARS (approximate)
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  BRL: 5.0,
  MXN: 17.0,
};

/**
 * Get exchange rate for a currency
 */
export async function getExchangeRate(currency: string = "ARS"): Promise<ExchangeRate> {
  const rate = MOCK_RATES[currency.toUpperCase()] || 1;

  return {
    currency: currency.toUpperCase(),
    rateToUsd: rate,
    lastUpdated: new Date(),
  };
}

/**
 * Convert USDC to local currency
 */
export async function usdcToLocal(
  amountUsdc: number,
  currency: string = "ARS"
): Promise<{
  amountLocal: number;
  currency: string;
  rate: number;
}> {
  const exchangeRate = await getExchangeRate(currency);

  return {
    amountLocal: amountUsdc * exchangeRate.rateToUsd,
    currency: exchangeRate.currency,
    rate: exchangeRate.rateToUsd,
  };
}

/**
 * Convert local currency to USDC
 */
export async function localToUsdc(
  amountLocal: number,
  currency: string = "ARS"
): Promise<{
  amountUsdc: number;
  currency: string;
  rate: number;
}> {
  const exchangeRate = await getExchangeRate(currency);

  return {
    amountUsdc: amountLocal / exchangeRate.rateToUsd,
    currency: exchangeRate.currency,
    rate: exchangeRate.rateToUsd,
  };
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(
  amount: number,
  currency: string = "ARS"
): string {
  const symbols: Record<string, string> = {
    ARS: "$",
    USD: "$",
    EUR: "€",
    GBP: "£",
    BRL: "R$",
    MXN: "$",
  };

  const symbol = symbols[currency.toUpperCase()] || currency;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol}${formatted} ${currency}`;
}

/**
 * Format USDC amount with ARS equivalent
 */
export async function formatUsdcWithLocal(
  amountUsdc: number,
  currency: string = "ARS"
): Promise<string> {
  const conversion = await usdcToLocal(amountUsdc, currency);
  
  return `$${amountUsdc.toFixed(2)} USDC (${formatCurrency(conversion.amountLocal, currency)})`;
}

// TODO: Integrate with real-time exchange rate API (e.g., CoinGecko, Binance, etc.)
// export async function fetchLiveExchangeRate(currency: string): Promise<number> {
//   const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=${currency}`);
//   const data = await response.json();
//   return data['usd-coin'][currency.toLowerCase()];
// }
