/**
 * Centralized Timezone Management Engine
 * Guarantees uniform time calculations and formatting across server & client
 * according to the user's configured profile timezone (no browser local drift).
 */

export const DEFAULT_APP_TIMEZONE = "Asia/Dhaka";

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: "Asia/Dhaka", label: "Dhaka (Bangladesh)", offset: "UTC+06:00" },
  { value: "Asia/Kolkata", label: "Kolkata, Mumbai, New Delhi (India)", offset: "UTC+05:30" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)", offset: "UTC+00:00" },
  { value: "Asia/Dubai", label: "Dubai, Abu Dhabi (UAE)", offset: "UTC+04:00" },
  { value: "Asia/Singapore", label: "Singapore, Kuala Lumpur", offset: "UTC+08:00" },
  { value: "Asia/Bangkok", label: "Bangkok, Jakarta, Hanoi", offset: "UTC+07:00" },
  { value: "Asia/Tokyo", label: "Tokyo, Seoul", offset: "UTC+09:00" },
  { value: "Europe/London", label: "London, Dublin, Lisbon", offset: "UTC+00:00 / +01:00" },
  { value: "Europe/Berlin", label: "Berlin, Paris, Amsterdam, Rome", offset: "UTC+01:00 / +02:00" },
  { value: "America/New_York", label: "New York, Toronto (Eastern)", offset: "UTC-05:00 / -04:00" },
  { value: "America/Chicago", label: "Chicago, Dallas (Central)", offset: "UTC-06:00 / -05:00" },
  { value: "America/Denver", label: "Denver, Phoenix (Mountain)", offset: "UTC-07:00 / -06:00" },
  { value: "America/Los_Angeles", label: "Los Angeles, Vancouver (Pacific)", offset: "UTC-08:00 / -07:00" },
  { value: "Australia/Sydney", label: "Sydney, Melbourne", offset: "UTC+10:00 / +11:00" },
  { value: "Pacific/Auckland", label: "Auckland, Wellington (NZ)", offset: "UTC+12:00 / +13:00" },
];

/**
 * Validate whether a timezone string is a recognized IANA timezone
 */
export function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract zoned date/time parts strictly in the target timezone
 */
export function getZonedDateParts(
  date: Date | string | number,
  timeZone = DEFAULT_APP_TIMEZONE,
) {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const validTz = isValidTimezone(timeZone) ? timeZone : DEFAULT_APP_TIMEZONE;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: validTz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "";

  const year = parseInt(get("year"), 10) || 1970;
  const month = parseInt(get("month"), 10) || 1;
  const day = parseInt(get("day"), 10) || 1;
  const hour = parseInt(get("hour"), 10) || 0;
  const minute = parseInt(get("minute"), 10) || 0;
  const second = parseInt(get("second"), 10) || 0;

  const yearStr = get("year").padStart(4, "0");
  const monthStr = get("month").padStart(2, "0");
  const dayStr = get("day").padStart(2, "0");
  const hourStr = get("hour").padStart(2, "0");
  const minuteStr = get("minute").padStart(2, "0");

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    yearStr,
    monthStr,
    dayStr,
    hourStr,
    minuteStr,
    dateKey: `${yearStr}-${monthStr}-${dayStr}`,
    hourKey: `${yearStr}-${monthStr}-${dayStr} ${hourStr}:00`,
  };
}

/**
 * Format a 24-hour integer to 12-hour AM/PM label (e.g. 11 -> "11 AM", 0 -> "12 AM")
 */
export function formatZonedHourLabel(hour: number): string {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12} ${ampm}`;
}

/**
 * Formats any date for presentation using user's configured timezone
 */
export function formatZonedDate(
  date: Date | string | number,
  timeZone = DEFAULT_APP_TIMEZONE,
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
  locale = "en-US",
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const validTz = isValidTimezone(timeZone) ? timeZone : DEFAULT_APP_TIMEZONE;
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: validTz }).format(d);
}

/**
 * Returns datetime-local input string ("YYYY-MM-DDTHH:mm") representing the given time in target timezone
 */
export function getZonedDateTimeLocalString(
  date: Date | string | number = new Date(),
  timeZone = DEFAULT_APP_TIMEZONE,
): string {
  const parts = getZonedDateParts(date, timeZone);
  return `${parts.yearStr}-${parts.monthStr}-${parts.dayStr}T${parts.hourStr}:${parts.minuteStr}`;
}

/**
 * Converts a "YYYY-MM-DDTHH:mm" local input string interpreted in target timezone into a UTC Date
 */
export function zonedLocalToUtc(
  dateTimeString: string,
  timeZone = DEFAULT_APP_TIMEZONE,
): Date {
  const validTz = isValidTimezone(timeZone) ? timeZone : DEFAULT_APP_TIMEZONE;
  const [datePart, timePart = "00:00"] = dateTimeString.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);

  // Guess in UTC
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const parts = getZonedDateParts(guess, validTz);
  const guessInTz = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offset = guessInTz - guess.getTime();
  return new Date(guess.getTime() - offset);
}
