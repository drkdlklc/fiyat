// Currency conversion utility for printing cost calculator
// Exchange rates updated as of 2025 (approximate rates)

const EXCHANGE_RATES = {
  'USD': 1.0,      // Base currency
  'EUR': 1.05,     // 1 EUR = 1.05 USD
  'TRY': 0.029     // 1 TRY = 0.029 USD  
};

/**
 * Convert price from one currency to USD
 * @param {number} price - The price to convert
 * @param {string} fromCurrency - The source currency (USD, EUR, TRY)
 * @returns {number} - Price converted to USD
 */
export const convertToUSD = (price, fromCurrency) => {
  if (!price || !fromCurrency) return 0;
  
  const rate = EXCHANGE_RATES[fromCurrency.toUpperCase()];
  if (!rate) {
    console.warn(`Unknown currency: ${fromCurrency}, defaulting to USD`);
    return price; // Default to no conversion if currency unknown
  }
  
  return price * rate;
};

/**
 * Convert multiple prices to USD and return total
 * @param {Array} priceData - Array of {price, currency} objects
 * @returns {number} - Total price in USD
 */
export const convertPricesToUSDTotal = (priceData) => {
  return priceData.reduce((total, item) => {
    return total + convertToUSD(item.price, item.currency);
  }, 0);
};

/**
 * Format price with USD symbol
 * @param {number} price - Price in USD
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} - Formatted price string
 */
export const formatUSDPrice = (price, decimals = 2) => {
  return `$${price.toFixed(decimals)}`;
};

/**
 * Convert paper type cost to USD
 * @param {object} paperType - Paper type object with pricePerTon and currency
 * @param {number} tons - Amount in tons
 * @returns {number} - Cost in USD
 */
export const convertPaperCostToUSD = (paperType, tons) => {
  if (!paperType || !paperType.pricePerTon) return 0;
  const usdPrice = convertToUSD(paperType.pricePerTon, paperType.currency || 'USD');
  return usdPrice * tons;
};

/**
 * Convert machine cost to USD
 * @param {number} cost - Machine cost 
 * @param {string} currency - Machine currency
 * @returns {number} - Cost in USD
 */
export const convertMachineCostToUSD = (cost, currency) => {
  return convertToUSD(cost, currency || 'USD');
};

/**
 * Convert extra cost to USD
 * @param {object} extra - Extra object with price and currency
 * @returns {number} - Cost in USD
 */
export const convertExtraCostToUSD = (extra) => {
  if (!extra || !extra.pricePerUnit) return 0;
  
  // Get currency from originalPrice if available, otherwise default to USD
  const currency = extra.originalPrice?.currency || 'USD';
  const basePrice = convertToUSD(extra.pricePerUnit, currency);
  
  // Apply the same calculation logic as the original
  return basePrice * (extra.units || 0) * (extra.edgeLength || 1);
};

export default {
  convertToUSD,
  convertPricesToUSDTotal,
  formatUSDPrice,
  convertPaperCostToUSD,
  convertMachineCostToUSD,
  convertExtraCostToUSD,
  EXCHANGE_RATES
};