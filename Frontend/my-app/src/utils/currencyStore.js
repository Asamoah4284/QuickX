import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STORAGE_KEY_CURRENCY = 'quickx_currency';
const STORAGE_KEY_RATE = 'quickx_exchange_rate';

// Global cache
let currentSettings = {
  currency: localStorage.getItem(STORAGE_KEY_CURRENCY) || 'USD',
  exchangeRateUsdToGhs: Number(localStorage.getItem(STORAGE_KEY_RATE) || 15.5) || 15.5,
};

const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(currentSettings);
    } catch (e) {
      console.warn('Currency listener error:', e);
    }
  });
}

export function getCurrencySettings() {
  return currentSettings;
}

export function getCurrency() {
  return currentSettings.currency;
}

export function getCurrencySymbol() {
  return currentSettings.currency === 'GHS' ? 'GH₵' : '$';
}

export function getExchangeRate() {
  return currentSettings.exchangeRateUsdToGhs;
}

export function setCurrencySettings({ currency, exchangeRateUsdToGhs }) {
  const updatedCurrency = currency === 'GHS' ? 'GHS' : 'USD';
  const updatedRate = Number(exchangeRateUsdToGhs) > 0 ? Number(exchangeRateUsdToGhs) : 15.5;

  currentSettings = {
    currency: updatedCurrency,
    exchangeRateUsdToGhs: updatedRate,
  };

  try {
    localStorage.setItem(STORAGE_KEY_CURRENCY, updatedCurrency);
    localStorage.setItem(STORAGE_KEY_RATE, String(updatedRate));
  } catch (e) {
    // localStorage might fail in private browsing
  }

  notifyListeners();
}

/**
 * Convert USD to GHS using current platform rate.
 */
export function convertToGhs(usdAmount) {
  const n = Number(usdAmount || 0);
  const rate = getExchangeRate();
  return Math.round(n * rate * 100) / 100;
}

/**
 * Format any amount into the active platform currency ($ or GH₵).
 */
export function formatCurrency(value, options = {}) {
  const n = Number(value || 0);
  const sym = getCurrencySymbol();
  const maxDecimals = options.decimals != null ? options.decimals : n % 1 === 0 ? 0 : 2;
  const minDecimals = options.decimals != null ? options.decimals : 0;

  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });

  return `${sym}${formatted}`;
}

/**
 * Format price with optional dual-currency conversion hint (e.g. "$10 (≈ GH₵155)").
 */
export function formatDualCurrency(usdAmount) {
  const usdFormatted = formatCurrency(usdAmount);
  if (getCurrency() === 'USD') {
    const ghsAmount = convertToGhs(usdAmount);
    return `${usdFormatted} (≈ GH₵${ghsAmount.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })})`;
  }
  return usdFormatted;
}

/**
 * Fetch latest platform currency settings from server and update local cache.
 */
export async function fetchPlatformCurrencySettings() {
  try {
    const { data } = await axios.get(`${API_URL}/api/platform/settings`, { timeout: 8000 });
    if (data?.defaultCurrency) {
      setCurrencySettings({
        currency: data.defaultCurrency,
        exchangeRateUsdToGhs: data.exchangeRateUsdToGhs,
      });
    }
    return currentSettings;
  } catch (error) {
    return currentSettings;
  }
}

/**
 * React hook to subscribe to currency changes.
 */
export function useCurrency() {
  const [settings, setSettings] = useState(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
    listeners.add(setSettings);
    return () => listeners.delete(setSettings);
  }, []);

  return {
    currency: settings.currency,
    exchangeRateUsdToGhs: settings.exchangeRateUsdToGhs,
    symbol: settings.currency === 'GHS' ? 'GH₵' : '$',
    formatCurrency,
    formatDualCurrency,
    convertToGhs,
  };
}
