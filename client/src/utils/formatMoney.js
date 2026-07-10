/**
 * formatMoney.js
 * Shared currency formatting utility.
 * Replaces the inline formatMoney helpers duplicated across
 * Dashboard, Transactions, Budgets, and Reports pages.
 *
 * Usage:
 *   import { formatMoney, getCurrencySymbol } from '../../utils/formatMoney';
 *   formatMoney(1234.5, 'INR')  →  '₹1,234.50'
 */

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'A$',
};

/**
 * Returns the symbol for a given currency code.
 * Falls back to the code itself if unknown.
 */
export const getCurrencySymbol = (currency = 'INR') =>
  CURRENCY_SYMBOLS[currency] || currency;

/**
 * Formats a numeric amount as a localised currency string.
 *
 * @param {number} amount    - Raw numeric value
 * @param {string} currency  - ISO 4217 code (e.g. 'INR', 'USD')
 * @param {object} options   - Optional overrides for Intl.NumberFormat
 * @returns {string}
 */
export const formatMoney = (amount = 0, currency = 'INR', options = {}) => {
  const symbol = getCurrencySymbol(currency);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';

  const formatted = Math.abs(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });

  return `${symbol}${formatted}`;
};

/**
 * Convenience: formats with sign prefix for income/expense display.
 * '+₹500.00' or '-₹500.00'
 */
export const formatMoneyWithSign = (amount = 0, currency = 'INR') => {
  const sign = amount >= 0 ? '+' : '-';
  return `${sign}${formatMoney(amount, currency)}`;
};
