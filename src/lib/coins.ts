export const SUPPORTED_COINS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'BNB', name: 'BNB' },
] as const;

export const PAYMENT_METHODS = [
  'Bank Transfer',
  'PayPal',
  'Wise',
  'Revolut',
  'SEPA',
  'Cash in Person',
  'Zelle',
  'Apple Pay',
  'Google Pay',
  'Other',
] as const;

export const COUNTRIES = [
  'Worldwide', 'United States', 'United Kingdom', 'Canada', 'Germany',
  'France', 'Nigeria', 'Kenya', 'South Africa', 'Uganda', 'India',
  'Brazil', 'Mexico', 'Australia', 'UAE', 'Singapore',
] as const;

export type Coin = (typeof SUPPORTED_COINS)[number]['symbol'];
