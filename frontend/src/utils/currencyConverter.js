// Currency conversion utility for printing cost calculator
// Exchange rates updated as of 2025 (approximate rates) - Converting TO EUR
const EXCHANGE_RATES = {
  'EUR': 1.0,      // Base currency (target)
  'USD': 0.95,     // 1 USD = 0.95 EUR
  'TRY': 0.028     // 1 TRY = 0.028 EUR
};

/**
 * Convert price from one currency to EUR
 * @param {number} price - The price to convert
 * @param {string} fromCurrency - The source currency (USD, EUR, TRY)
 * @returns {number} - Price converted to EUR
 */
export const convertToEUR = (price, fromCurrency) => {
  if (!price || !fromCurrency) return 0;
  
  const rate = EXCHANGE_RATES[fromCurrency.toUpperCase()];
  if (!rate) {
    console.warn(`Unknown currency: ${fromCurrency}, defaulting to EUR`);
    return price; // Default to no conversion if currency unknown
  }
  
  return price * rate;
};

/**
 * Convert multiple prices to EUR and return total
 * @param {Array} priceData - Array of {price, currency} objects
 * @returns {number} - Total price in EUR
 */
export const convertPricesToEURTotal = (priceData) => {
  return priceData.reduce((total, item) => {
    return total + convertToEUR(item.price, item.currency);
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
 * Convert paper type cost to EUR
 * @param {object} paperType - Paper type object with pricePerTon and currency
 * @param {number} tons - Amount in tons
 * @returns {number} - Cost in EUR
 */
export const convertPaperCostToEUR = (paperType, tons) => {
  if (!paperType || !paperType.pricePerTon) return 0;
  const eurPrice = convertToEUR(paperType.pricePerTon, paperType.currency || 'EUR');
  return eurPrice * tons;
};

/**
 * Convert machine cost to EUR
 * @param {number} cost - Machine cost 
 * @param {string} currency - Machine currency
 * @returns {number} - Cost in EUR
 */
export const convertMachineCostToEUR = (cost, currency) => {
  return convertToEUR(cost, currency || 'EUR');
};

/**
 * Convert extra cost to EUR
 * @param {object} extra - Extra object with price and currency
 * @returns {number} - Cost in EUR
 */
export const convertExtraCostToEUR = (extra) => {
  if (!extra || !extra.pricePerUnit) return 0;
  
  // Get currency from originalPrice if available, otherwise default to EUR
  const currency = extra.originalPrice?.currency || 'EUR';
  const basePrice = convertToEUR(extra.pricePerUnit, currency);
  
  // Apply the same calculation logic as the original
  return basePrice * (extra.units || 0) * (extra.edgeLength || 1);
};

export default {
  convertToEUR,
  convertPricesToEURTotal,
  formatEURPrice,
  convertPaperCostToEUR,
  convertMachineCostToEUR,
  convertExtraCostToEUR,
  EXCHANGE_RATES
};