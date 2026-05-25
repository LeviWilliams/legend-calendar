import { createContext, useContext } from "react";

import type { CalendarProps } from "@/components/Calendar";

/**
 * The calendar configuration props shared across all items in a
 * `CalendarList`. When `Calendar` is rendered inside `CalendarList`, it reads
 * these values from context instead of receiving them through the list item's
 * data, which keeps the `data` array identity stable and allows LegendList to
 * skip unnecessary re-renders.
 *
 * When `Calendar` is used standalone (outside a list), the context is `null`
 * and all props are passed directly.
 */
export type CalendarListConfig = Omit<CalendarProps, "calendarMonthId">;

const CalendarListConfigContext = createContext<CalendarListConfig | null>(
  null
);

export const CalendarListConfigProvider = CalendarListConfigContext.Provider;

/**
 * Returns the shared calendar configuration from the nearest
 * `CalendarListConfigProvider`, or `null` when used outside a `CalendarList`.
 */
export const useCalendarListConfig = (): CalendarListConfig | null => {
  return useContext(CalendarListConfigContext);
};
