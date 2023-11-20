/**
 * Transforms a given date (or now) into UTC data.
 * @param {Date} date The date. Uses a new date if not given.
 * @returns {Date} The given date transformed to UTC.
 */
export const getDateInUtc = (date = new Date()): Date => {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60000);
};
