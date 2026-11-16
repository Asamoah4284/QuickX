import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Money rules:
 * - Every price in the database is in Ghana cedis (GH₵), and Paystack always charges cedis.
 * - The admin "display currency" only changes how prices are SHOWN. With USD chosen,
 *   GH₵155 is shown as "$10" using the admin's exchange rate. Nothing is charged in dollars.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STORAGE_KEY_CURRENCY = 'quickx_currency';
const STORAGE_KEY_RATE = 'quickx_exchange_rate';
const DEFAULT_RATE = 15.5;

function readStored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

let currentSettings = {
  currency: readStored(STORAGE_KEY_CURRENCY, 'GHS') === 'USD' ? 'USD' : 'GHS',
  exchangeRateUsdToGhs: Number(readStored(STORAGE_KEY_RATE, DEFAULT_RATE)) || DEFAULT_RATE,
};

const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(currentSettings);
    } catch {
      // a broken listener must not stop the others
    }
  });
}

export function getCurrencySettings() {
  return currentSettings;
}

/** The currency prices are SHOWN in ('GHS' or 'USD'). */
export function getCurrency() {
  return currentSettings.currency;
}

/**
 * Symbol for an amount you print yourself, like `${getCurrencySymbol()}${price}`.
 * Raw amounts are always cedis, so this is always GH₵. Use formatCurrency() to show dollars.
 */
export function getCurrencySymbol() {
  return 'GH₵';
}

/** Symbol of the display currency. */
export function getDisplaySymbol() {
  return currentSettings.currency === 'USD' ? '$' : 'GH₵';
}

export function getExchangeRate() {
  return currentSettings.exchangeRateUsdToGhs;
}

export function setCurrencySettings({ currency, exchangeRateUsdToGhs }) {
  const updatedCurrency = currency === 'USD' ? 'USD' : 'GHS';
  const updatedRate = Number(exchangeRateUsdToGhs) > 0 ? Number(exchangeRateUsdToGhs) : DEFAULT_RATE;
  currentSettings = { currency: updatedCurrency, exchangeRateUsdToGhs: updatedRate };
  try {
    localStorage.setItem(STORAGE_KEY_CURRENCY, updatedCurrency);
    localStorage.setItem(STORAGE_KEY_RATE, String(updatedRate));
  } catch {
    // private browsing: keep the setting in memory only
  }
  notifyListeners();
}

/** Amounts are already cedis; kept so older code that "converts" before charging stays correct. */
export function convertToGhs(ghsAmount) {
  return Math.round(Number(ghsAmount || 0) * 100) / 100;
}

/** Cedis to dollars at the admin's rate. */
export function convertToUsd(ghsAmount) {
  const rate = getExchangeRate() || DEFAULT_RATE;
  return Math.round((Number(ghsAmount || 0) / rate) * 100) / 100;
}

function formatNumber(n, decimals) {
  const max = decimals != null ? decimals : n % 1 === 0 ? 0 : 2;
  const min = decimals != null ? decimals : 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });
}

/** Show a cedi amount in the display currency: "GH₵155" or "$10". */
export function formatCurrency(ghsAmount, options = {}) {
  const ghs = Number(ghsAmount || 0);
  if (currentSettings.currency === 'USD') return `$${formatNumber(convertToUsd(ghs), options.decimals)}`;
  return `GH₵${formatNumber(ghs, options.decimals)}`;
}

/** Display price plus the cedi amount that will actually be charged: "$10 (GH₵155 at checkout)". */
export function formatDualCurrency(ghsAmount) {
  const shown = formatCurrency(ghsAmount);
  if (currentSettings.currency === 'USD') return `${shown} (GH₵${formatNumber(Number(ghsAmount || 0))} at checkout)`;
  return shown;
}

/** Load the admin's display settings from the server. */
export async function fetchPlatformCurrencySettings() {
  try {
    const { data } = await axios.get(`${API_URL}/api/platform/settings`, { timeout: 8000 });
    if (data?.defaultCurrency) {
      setCurrencySettings({ currency: data.defaultCurrency, exchangeRateUsdToGhs: data.exchangeRateUsdToGhs });
    }
  } catch {
    // offline: keep the last known settings
  }
  return currentSettings;
}

/** React hook: re-renders when the display currency changes. */
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
    symbol: settings.currency === 'USD' ? '$' : 'GH₵',
    formatCurrency,
    formatDualCurrency,
    convertToGhs,
    convertToUsd,
  };
}
