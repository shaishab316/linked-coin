import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";
import "dayjs/locale/bn";
import "dayjs/locale/en";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export function formatFromNow(date: string | Date, locale: string = "en"): string {
  return dayjs(date).locale(locale === "bn" ? "bn" : "en").fromNow();
}

export function formatDate(date: string | Date, formatStr: string = "MMM D, YYYY", locale: string = "en"): string {
  return dayjs(date).locale(locale === "bn" ? "bn" : "en").format(formatStr);
}

export { dayjs };
export default dayjs;
