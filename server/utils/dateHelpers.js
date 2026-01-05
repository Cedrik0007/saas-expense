/**
 * Calculates a date exactly 1 year after the given date
 * Handles leap years correctly using Date objects
 * @param {Date|string} inputDate - The input date (Date object or ISO string)
 * @returns {Date} - Date object exactly 1 year after input date
 */
export function addOneYear(inputDate) {
  const date = typeof inputDate === 'string' ? new Date(inputDate) : inputDate;
  
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  // Create a new Date object to avoid mutating the original
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + 1);
  
  return result;
}

/**
 * Formats a Date object to YYYY-MM-DD string format
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string (YYYY-MM-DD)
 */
export function formatDateForInput(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string (YYYY-MM-DD) into a Date object
 * @param {string} dateString - The date string to parse
 * @returns {Date|null} - Date object or null if invalid
 */
export function parseDateString(dateString) {
  if (!dateString) {
    return null;
  }
  
  const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
}

