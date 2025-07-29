// Currency conversion utility for printing cost calculator
// Fetches live exchange rates from altinkaynak.com via backend API

let EXCHANGE_RATES = {
  'EUR': 1.0,      // Base currency (fallback)
  'USD': 0.95,     // Fallback rate
  'TRY': 0.028     // Fallback rate
};

let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Fetch live exchange rates from backend API
 */
export const fetchExchangeRates = async () => {
  const now = Date.now();
  
  // Use cached rates if still fresh
  if (now - lastFetchTime < CACHE_DURATION) {
    return EXCHANGE_RATES;
  }
  
  try {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL;
    const response = await fetch(`${backendUrl}/api/exchange-rates`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Live exchange rates fetched:', data);
      
      EXCHANGE_RATES = data.rates;
      lastFetchTime = now;
      
      return EXCHANGE_RATES;
    } else {
      console.warn('Failed to fetch exchange rates, using fallback');
      return EXCHANGE_RATES;
    }
  } catch (error) {
    console.warn('Error fetching exchange rates:', error);
    return EXCHANGE_RATES;
  }
};

/**
 * Convert price from one currency to EUR
 * @param {number} price - The price to convert
 * @param {string} fromCurrency - The source currency (USD, EUR, TRY)
 * @param {object} customRates - Optional custom exchange rates
 * @returns {number} - Price converted to EUR
 */
export const convertToEUR = async (price, fromCurrency, customRates = null) => {
  if (!price || !fromCurrency) return 0;
  
  const rates = customRates || await fetchExchangeRates();
  const rate = rates[fromCurrency.toUpperCase()];
  
  if (!rate) {
    console.warn(`Unknown currency: ${fromCurrency}, defaulting to EUR`);
    return price; // Default to no conversion if currency unknown
  }
  
  return price * rate;
};

/**
 * Synchronous version of convertToEUR using cached rates
 * @param {number} price - The price to convert
 * @param {string} fromCurrency - The source currency (USD, EUR, TRY)
 * @returns {number} - Price converted to EUR
 */
export const convertToEURSync = (price, fromCurrency) => {
  if (!price || !fromCurrency) return 0;
  
  const rate = EXCHANGE_RATES[fromCurrency.toUpperCase()];
  if (!rate) {
    console.warn(`Unknown currency: ${fromCurrency}, defaulting to EUR`);
    return price;
  }
  
  return price * rate;
};

/**
 * Convert multiple prices to EUR and return total
 * @param {Array} priceData - Array of {price, currency} objects
 * @param {object} customRates - Optional custom exchange rates
 * @returns {number} - Total price in EUR
 */
export const convertPricesToEURTotal = async (priceData, customRates = null) => {
  const rates = customRates || await fetchExchangeRates();
  
  return priceData.reduce((total, item) => {
    const rate = rates[item.currency?.toUpperCase()] || 1;
    return total + (item.price * rate);
  }, 0);
};

/**
 * Format price with EUR symbol
 * @param {number} price - Price in EUR
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted price string
 */
export const formatEURPrice = (price, decimals = 2) => {
  return `€${price.toFixed(decimals)}`;
};

/**
 * Format price with EUR symbol and dynamic decimal places
 * Automatically adjusts decimal places based on the price magnitude
 * @param {number} price - Price in EUR
 * @param {number} maxDecimals - Maximum decimal places (default: 4)
 * @returns {string} - Formatted price string
 */
export const formatEURPriceDynamic = (price, maxDecimals = 4) => {
  // For very small prices (< 0.01), use up to 4 decimal places
  if (Math.abs(price) < 0.01 && Math.abs(price) > 0) {
    return `€${price.toFixed(maxDecimals)}`;
  }
  // For small prices (< 1), use up to 3 decimal places
  else if (Math.abs(price) < 1) {
    return `€${price.toFixed(3)}`;
  }
  // For normal prices, use 2 decimal places
  else {
    return `€${price.toFixed(2)}`;
  }
};

/**
 * Convert paper type cost to EUR
 * @param {object} paperType - Paper type object with pricePerTon and currency
 * @param {number} tons - Amount in tons
 * @param {object} customRates - Optional custom exchange rates
 * @returns {number} - Cost in EUR
 */
export const convertPaperCostToEUR = async (paperType, tons, customRates = null) => {
  if (!paperType || !paperType.pricePerTon) return 0;
  const eurPrice = await convertToEUR(paperType.pricePerTon, paperType.currency || 'EUR', customRates);
  return eurPrice * tons;
};

/**
 * Convert machine cost to EUR
 * @param {number} cost - Machine cost 
 * @param {string} currency - Machine currency
 * @param {object} customRates - Optional custom exchange rates
 * @returns {number} - Cost in EUR
 */
export const convertMachineCostToEUR = async (cost, currency, customRates = null) => {
  return await convertToEUR(cost, currency || 'EUR', customRates);
};

/**
 * Convert extra cost to EUR
 * @param {object} extra - Extra object with price and currency
 * @param {object} customRates - Optional custom exchange rates
 * @returns {number} - Cost in EUR
 */
export const convertExtraCostToEUR = async (extra, customRates = null) => {
  if (!extra || !extra.pricePerUnit) return 0;
  
  // Get currency from originalPrice if available, otherwise default to EUR
  const currency = extra.originalPrice?.currency || 'EUR';
  const basePrice = await convertToEUR(extra.pricePerUnit, currency, customRates);
  
  // Apply the same calculation logic as the original
  return basePrice * (extra.units || 0) * (extra.edgeLength || 1);
};

// Exchange rates will be initialized by components as needed

export default {
  convertToEUR,
  convertToEURSync,
  convertPricesToEURTotal,
  formatEURPrice,
  convertPaperCostToEUR,
  convertMachineCostToEUR,
  convertExtraCostToEUR,
  fetchExchangeRates,
  EXCHANGE_RATES
};