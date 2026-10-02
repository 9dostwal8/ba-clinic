// @ts-nocheck
/**
 * Utility functions for handling datetime without timezone conversions
 *
 * These functions treat database datetime values as "local" times,
 * preventing timezone-related date/time shifts.
 */

/**
 * Parse a datetime string (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss) as local time without timezone conversion
 */
export function parseLocalDateTime(dateTimeStr: string): Date {
  if (!dateTimeStr) return new Date();

  // Remove timezone info if present (e.g., +00, Z, etc.)
  let cleaned = dateTimeStr.replace(/[+-]\d{2}(:\d{2})?$/, '').replace(/Z$/, '');

  // Normalize the datetime string (replace space with T if present)
  const normalized = cleaned.replace(' ', 'T');

  // Split the datetime string
  const [datePart, timePart] = normalized.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds = 0] = (timePart || '00:00:00').split(':').map(Number);

  // Create Date object using local timezone
  return new Date(year, month - 1, day, hours, minutes, seconds);
}

/**
 * Format a datetime string for display
 */
export function formatLocalDate(dateTimeStr: string, locale: string = 'en-US'): string {
  const date = parseLocalDateTime(dateTimeStr);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a datetime string for time display
 */
export function formatLocalTime(dateTimeStr: string, locale: string = 'en-US'): string {
  const date = parseLocalDateTime(dateTimeStr);
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a datetime string for full date and time display
 */
export function formatLocalDateTime(dateTimeStr: string, locale: string = 'en-US'): string {
  const date = parseLocalDateTime(dateTimeStr);
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get date parts from datetime string
 */
export function getLocalDateParts(dateTimeStr: string) {
  const date = parseLocalDateTime(dateTimeStr);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds()
  };
}

/**
 * Format for input[type="date"]
 */
export function getDateInputValue(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  const [datePart] = dateTimeStr.split('T');
  return datePart;
}

/**
 * Format for input[type="time"]
 */
export function getTimeInputValue(dateTimeStr: string): string {
  if (!dateTimeStr) return '';
  const [, timePart] = dateTimeStr.split('T');
  return timePart ? timePart.slice(0, 5) : '';
}

/**
 * Create datetime string for database from date and time inputs
 */
export function createDateTimeString(date: string, time: string): string {
  return `${date}T${time}:00`;
}

/**
 * Compare two datetime strings (returns timestamp for sorting)
 */
export function getLocalTimestamp(dateTimeStr: string): number {
  return parseLocalDateTime(dateTimeStr).getTime();
}
