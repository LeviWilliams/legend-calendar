import {
  LegendList as LegendListBase,
  type LegendListProps,
  type LegendListRef,
} from "@legendapp/list/react-native";
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";

import type { CalendarProps } from "@/components/Calendar";
import { Calendar } from "@/components/Calendar";
import { CalendarListConfigProvider } from "@/components/CalendarListConfigContext";
import {
  fromDateId,
  getWeekOfMonth,
  startOfMonth,
  toDateId,
} from "@/helpers/dates";
import type { CalendarMonth } from "@/hooks/useCalendarList";
import { getHeightForMonth, useCalendarList } from "@/hooks/useCalendarList";
import { activeDateRangesStore } from "@/hooks/useOptimizedDayMetadata";

// Type assertion to make LegendList compatible with React 19
const LegendList = LegendListBase as <T>(
  props: LegendListProps<T> & { ref?: React.Ref<LegendListRef> }
) => React.ReactElement;
/**
 * Represents each `CalendarList` item. It's enhanced with the required
 * `Calendar` props to simplify building custom `Calendar` components.
 */
export type CalendarMonthEnhanced = CalendarMonth & {
  /**
   * The calendar configuration props for this item. Available when using a
   * custom `renderItem` for backwards compatibility.
   *
   * @deprecated Prefer reading calendar config from context via
   * `useCalendarListConfig()` instead of spreading `item.calendarProps`.
   * This avoids creating a new data array each render and lets LegendList
   * skip unnecessary item re-renders.
   *
   * **Before (slower):**
   * ```tsx
   * renderItem={({ item }) => (
   *   <MyCalendar calendarMonthId={item.id} {...item.calendarProps} />
   * )}
   * ```
   *
   * **After (faster):**
   * ```tsx
   * // Inside your custom calendar component:
   * const listConfig = useCalendarListConfig();
   * // Merge: { ...listConfig, ...props }
   * ```
   */
  calendarProps: Omit<CalendarProps, "calendarMonthId">;
};

const keyExtractor = (month: CalendarMonth) => month.id;

function buildCalendarConfig(
  calendarColorScheme: CalendarMonthEnhanced["calendarProps"]["calendarColorScheme"],
  calendarDayHeight: number,
  calendarDisabledDateIds: CalendarMonthEnhanced["calendarProps"]["calendarDisabledDateIds"],
  calendarFirstDayOfWeek: CalendarMonthEnhanced["calendarProps"]["calendarFirstDayOfWeek"],
  calendarFormatLocale: CalendarMonthEnhanced["calendarProps"]["calendarFormatLocale"],
  calendarInstanceId: CalendarMonthEnhanced["calendarProps"]["calendarInstanceId"],
  calendarMaxDateId: CalendarMonthEnhanced["calendarProps"]["calendarMaxDateId"],
  calendarMinDateId: CalendarMonthEnhanced["calendarProps"]["calendarMinDateId"],
  calendarMonthHeaderHeight: number,
  calendarRowHorizontalSpacing: CalendarMonthEnhanced["calendarProps"]["calendarRowHorizontalSpacing"],
  calendarRowVerticalSpacing: number,
  calendarWeekHeaderHeightProp: CalendarMonthEnhanced["calendarProps"]["calendarWeekHeaderHeight"],
  getCalendarDayFormat: CalendarMonthEnhanced["calendarProps"]["getCalendarDayFormat"],
  getCalendarMonthFormat: CalendarMonthEnhanced["calendarProps"]["getCalendarMonthFormat"],
  getCalendarWeekDayFormat: CalendarMonthEnhanced["calendarProps"]["getCalendarWeekDayFormat"],
  onCalendarDayPress: CalendarMonthEnhanced["calendarProps"]["onCalendarDayPress"],
  theme: CalendarMonthEnhanced["calendarProps"]["theme"],
  CalendarPressableComponent: CalendarMonthEnhanced["calendarProps"]["CalendarPressableComponent"]
): CalendarMonthEnhanced["calendarProps"] {
  const calendarWeekHeaderHeight =
    calendarWeekHeaderHeightProp ?? calendarDayHeight;
  return {
    calendarColorScheme,
    calendarDayHeight,
    calendarDisabledDateIds,
    calendarFirstDayOfWeek,
    calendarFormatLocale,
    calendarInstanceId,
    calendarMaxDateId,
    calendarMinDateId,
    calendarMonthHeaderHeight,
    calendarRowHorizontalSpacing,
    calendarRowVerticalSpacing,
    calendarWeekHeaderHeight,
    getCalendarDayFormat,
    getCalendarMonthFormat,
    getCalendarWeekDayFormat,
    onCalendarDayPress,
    theme,
    CalendarPressableComponent,
  };
}

export interface CalendarListProps
  extends Omit<CalendarProps, "calendarMonthId">,
    Omit<
      LegendListProps<CalendarMonthEnhanced>,
      "renderItem" | "data" | "children"
    > {
  /**
   * How many months to show before the current month. Once the user scrolls
   * past this range and if they haven't exceeded the `calendarMinDateId`, new
   * months are prepended in this increment.
   * @defaultValue 12
   */
  calendarPastScrollRangeInMonths?: number;
  /**
   * How many months to show after the current month. Once the user scrolls
   * past this range and if they haven't exceeded the `calendarMaxDateId`, new
   * months are appended in this increment.
   * @defaultValue 12
   */
  calendarFutureScrollRangeInMonths?: number;

  /**
   * An additional height to use in the month's height calculation. Useful when
   * providing a custom `Calendar` component with extra content such as a
   * footer.
   */
  calendarAdditionalHeight?: number;

  /**
   * The vertical spacing between each `<Calendar />` component.
   * @defaultValue 20
   */
  calendarSpacing?: number;

  /**
   * The initial month to open the calendar to, as a `YYYY-MM-DD` string.
   * Defaults to the current month.
   *
   * **Tip**: To convert to date ID, use `toDateId(date)`.
   */
  calendarInitialMonthId?: string;

  /**
   * When enabled, automatically scrolls to the month containing the start date
   * of the first active range on mount. Only applies when
   * `calendarActiveDateRanges` has at least one range with a `startId`.
   *
   * Takes precedence over `calendarInitialMonthId` when enabled and a valid
   * range exists.
   *
   * Uses `initialScrollIndex` internally, so scrolling only happens on mount.
   *
   * @defaultValue true
   */
  calendarInitialScrollToActiveRange?: boolean;

  /**
   * Overwrites the default `Calendar` component.
   *
   * **Important**: when providing a custom implementation, make sure to
   * manually set all the spacing and height props to ensure the list scrolls
   * to the right offset:
   * - calendarDayHeight
   * - calendarMonthHeaderHeight
   * - calendarWeekHeaderHeight
   * - calendarAdditionalHeight
   * - calendarRowVerticalSpacing
   * - calendarSpacing
   *
   * **Performance tip**: Using `item.calendarProps` is provided for
   * backwards compatibility but creates a new data array each render.
   * For better performance, have your custom component call
   * `useCalendarListConfig()` to read the shared config from context
   * and only use `item.id` as `calendarMonthId`.
   */
  renderItem?: LegendListProps<CalendarMonthEnhanced>["renderItem"];
}

interface ImperativeScrollParams {
  /**
   * An additional offset to add to the final scroll position. Useful when
   * you need to slightly change the final scroll position.
   */
  additionalOffset?: number;
}
export interface CalendarListRef {
  scrollToMonth: (
    date: Date,
    animated: boolean,
    params?: ImperativeScrollParams
  ) => void;
  scrollToDate: (
    date: Date,
    animated: boolean,
    params?: ImperativeScrollParams
  ) => void;
  scrollToOffset: (offset: number, animated: boolean) => void;
}

type CalendarListInnerProps = CalendarListProps & {
  ref?: React.Ref<CalendarListRef>;
} & {
  flatListProps: Omit<
    LegendListProps<CalendarMonthEnhanced>,
    "renderItem" | "data" | "children"
  >;
};

export function CalendarList(
  props: CalendarListProps & { ref?: React.Ref<CalendarListRef> }
) {
  const {
    ref,
    calendarInitialMonthId,
    calendarInitialScrollToActiveRange,
    calendarPastScrollRangeInMonths,
    calendarFutureScrollRangeInMonths,
    calendarFirstDayOfWeek,
    calendarFormatLocale,
    calendarSpacing,
    calendarRowHorizontalSpacing,
    calendarRowVerticalSpacing,
    calendarMonthHeaderHeight,
    calendarDayHeight,
    calendarWeekHeaderHeight,
    calendarAdditionalHeight,
    calendarColorScheme,
    theme,
    onEndReached,
    onStartReached,
    calendarActiveDateRanges,
    calendarDisabledDateIds,
    calendarInstanceId,
    calendarMaxDateId,
    calendarMinDateId,
    getCalendarDayFormat,
    getCalendarMonthFormat,
    getCalendarWeekDayFormat,
    onCalendarDayPress,
    CalendarPressableComponent,
    renderItem,
    ...flatListProps
  } = props;
  return (
    <CalendarListInner
      CalendarPressableComponent={CalendarPressableComponent}
      calendarActiveDateRanges={calendarActiveDateRanges}
      calendarAdditionalHeight={calendarAdditionalHeight}
      calendarColorScheme={calendarColorScheme}
      calendarDayHeight={calendarDayHeight}
      calendarDisabledDateIds={calendarDisabledDateIds}
      calendarFirstDayOfWeek={calendarFirstDayOfWeek}
      calendarFormatLocale={calendarFormatLocale}
      calendarFutureScrollRangeInMonths={calendarFutureScrollRangeInMonths}
      calendarInitialMonthId={calendarInitialMonthId}
      calendarInitialScrollToActiveRange={calendarInitialScrollToActiveRange}
      calendarInstanceId={calendarInstanceId}
      calendarMaxDateId={calendarMaxDateId}
      calendarMinDateId={calendarMinDateId}
      calendarMonthHeaderHeight={calendarMonthHeaderHeight}
      calendarPastScrollRangeInMonths={calendarPastScrollRangeInMonths}
      calendarRowHorizontalSpacing={calendarRowHorizontalSpacing}
      calendarRowVerticalSpacing={calendarRowVerticalSpacing}
      calendarSpacing={calendarSpacing}
      calendarWeekHeaderHeight={calendarWeekHeaderHeight}
      flatListProps={flatListProps}
      getCalendarDayFormat={getCalendarDayFormat}
      getCalendarMonthFormat={getCalendarMonthFormat}
      getCalendarWeekDayFormat={getCalendarWeekDayFormat}
      onCalendarDayPress={onCalendarDayPress}
      onEndReached={onEndReached}
      onStartReached={onStartReached}
      ref={ref}
      renderItem={renderItem}
      theme={theme}
    />
  );
}

function CalendarListInner({
  ref,
  // List-related props
  calendarInitialMonthId,
  calendarInitialScrollToActiveRange = true,
  calendarPastScrollRangeInMonths = 12,
  calendarFutureScrollRangeInMonths = 12,
  calendarFirstDayOfWeek = "sunday",
  calendarFormatLocale,
  // Spacings
  calendarSpacing = 20,
  calendarRowHorizontalSpacing,
  calendarRowVerticalSpacing = 8,
  // Heights
  calendarMonthHeaderHeight = 20,
  calendarDayHeight = 32,
  calendarWeekHeaderHeight: calendarWeekHeaderHeightProp,
  calendarAdditionalHeight = 0,
  // Other props
  calendarColorScheme,
  theme,
  onEndReached,
  onStartReached,
  // Calendar config props
  calendarActiveDateRanges,
  calendarDisabledDateIds,
  calendarInstanceId,
  calendarMaxDateId,
  calendarMinDateId,
  getCalendarDayFormat,
  getCalendarMonthFormat,
  getCalendarWeekDayFormat,
  onCalendarDayPress,
  CalendarPressableComponent,
  renderItem: customRenderItem,
  flatListProps,
}: CalendarListInnerProps) {
  // Write directly to store to bypass the entire render cascade.
  // This means calendarProps stays stable and monthListWithCalendarProps
  // doesn't recompute on every date tap.
  useEffect(() => {
    activeDateRangesStore.setRanges(
      calendarInstanceId ?? "legend-calendar-default-instance",
      calendarActiveDateRanges ?? []
    );
  }, [calendarActiveDateRanges, calendarInstanceId]);

  // calendarActiveDateRanges intentionally omitted - written to store above.
  // useMemo is required here: the React Compiler cannot cache the result of
  // buildCalendarConfig because all its arguments flow through `tN === undefined
  // ? default : tN` conditional expressions (the compiler's own pattern for
  // defaulted props), which block cache slot generation.
  const calendarProps = useMemo(
    () =>
      buildCalendarConfig(
        calendarColorScheme,
        calendarDayHeight,
        calendarDisabledDateIds,
        calendarFirstDayOfWeek,
        calendarFormatLocale,
        calendarInstanceId,
        calendarMaxDateId,
        calendarMinDateId,
        calendarMonthHeaderHeight,
        calendarRowHorizontalSpacing,
        calendarRowVerticalSpacing,
        calendarWeekHeaderHeightProp,
        getCalendarDayFormat,
        getCalendarMonthFormat,
        getCalendarWeekDayFormat,
        onCalendarDayPress,
        theme,
        CalendarPressableComponent
      ),
    [
      calendarColorScheme,
      calendarDayHeight,
      calendarDisabledDateIds,
      calendarFirstDayOfWeek,
      calendarFormatLocale,
      calendarInstanceId,
      calendarMaxDateId,
      calendarMinDateId,
      calendarMonthHeaderHeight,
      calendarRowHorizontalSpacing,
      calendarRowVerticalSpacing,
      calendarWeekHeaderHeightProp,
      getCalendarDayFormat,
      getCalendarMonthFormat,
      getCalendarWeekDayFormat,
      onCalendarDayPress,
      theme,
      CalendarPressableComponent,
    ]
  );

  const calendarWeekHeaderHeight =
    calendarWeekHeaderHeightProp ?? calendarDayHeight;

  const {
    initialMonthIndex,
    monthList,
    appendMonths,
    prependMonths,
    addMissingMonths,
  } = useCalendarList({
    calendarFirstDayOfWeek,
    calendarFutureScrollRangeInMonths,
    calendarPastScrollRangeInMonths,
    calendarInitialMonthId,
    calendarMaxDateId,
    calendarMinDateId,
  });

  // Frozen after mount — initialScrollIndex must not change after first render
  // or LegendList re-renders its entire inner tree on every update.
  // useState initializer runs exactly once on mount.
  const [computedInitialScrollIndex] = useState(() => {
    if (calendarInitialScrollToActiveRange && calendarActiveDateRanges) {
      const firstRange = calendarActiveDateRanges[0];
      if (firstRange?.startId) {
        const startDate = fromDateId(firstRange.startId);
        const monthId = toDateId(startOfMonth(startDate));
        const monthIndex = monthList.findIndex((month) => month.id === monthId);
        if (monthIndex !== -1) {
          return monthIndex;
        }
      }
    }
    return initialMonthIndex;
  });

  // Only build the enhanced list when user provides a custom renderItem
  // (backwards-compat path). Otherwise use plain monthList so the data
  // identity stays stable and LegendList can skip item re-renders.
  const listData = customRenderItem
    ? monthList.map((month) => ({
        ...month,
        calendarProps,
      }))
    : (monthList as unknown as CalendarMonthEnhanced[]);

  const handleOnEndReached = (info: { distanceFromEnd: number }) => {
    appendMonths(calendarFutureScrollRangeInMonths);
    onEndReached?.(info);
  };

  const handleOnStartReached = (info: { distanceFromStart: number }) => {
    prependMonths(calendarPastScrollRangeInMonths);
    onStartReached?.(info);
  };
  /**
   * Returns the offset for the given month (how much the user needs to
   * scroll to reach the month).
   */
  const getScrollOffsetForMonth = (date: Date) => {
    const monthId = toDateId(startOfMonth(date));

    let baseMonthList = monthList;
    let index = baseMonthList.findIndex((month) => month.id === monthId);

    if (index === -1) {
      baseMonthList = addMissingMonths(monthId);
      index = baseMonthList.findIndex((month) => month.id === monthId);
    }

    return baseMonthList.slice(0, index).reduce((acc, month) => {
      const currentHeight = getHeightForMonth({
        calendarMonth: month,
        calendarSpacing,
        calendarDayHeight,
        calendarMonthHeaderHeight,
        calendarRowVerticalSpacing,
        calendarWeekHeaderHeight,
        calendarAdditionalHeight,
      });

      return acc + currentHeight;
    }, 0);
  };

  const legendListRef = useRef<LegendListRef>(null);

  useImperativeHandle(ref, () => ({
    scrollToMonth(
      date,
      animated,
      { additionalOffset = 0 } = { additionalOffset: 0 }
    ) {
      // Wait for the next render cycle to ensure the list has been
      // updated with the new months.
      setTimeout(() => {
        legendListRef.current?.scrollToOffset({
          offset: getScrollOffsetForMonth(date) + additionalOffset,
          animated,
        });
      }, 0);
    },
    scrollToDate(
      date,
      animated,
      { additionalOffset = 0 } = {
        additionalOffset: 0,
      }
    ) {
      const currentMonthOffset = getScrollOffsetForMonth(date);
      const weekOfMonthIndex = getWeekOfMonth(date, calendarFirstDayOfWeek);
      const rowHeight = calendarDayHeight + calendarRowVerticalSpacing;

      let weekOffset = calendarWeekHeaderHeight + rowHeight * weekOfMonthIndex;

      /**
       * We need to subtract one vertical spacing to avoid cutting off the
       * desired date. A simple way of understanding why is imagining we
       * want to scroll exactly to the given date, but leave a little bit of
       * breathing room (`calendarRowVerticalSpacing`) above it.
       */
      weekOffset = weekOffset - calendarRowVerticalSpacing;

      legendListRef.current?.scrollToOffset({
        offset: currentMonthOffset + weekOffset + additionalOffset,
        animated,
      });
    },
    scrollToOffset(offset, animated) {
      legendListRef.current?.scrollToOffset({ offset, animated });
    },
  }));

  const calendarContainerStyle = { paddingBottom: calendarSpacing };

  const getFixedItemSize = (item: CalendarMonth | CalendarMonthEnhanced) => {
    return getHeightForMonth({
      calendarMonth: item,
      calendarSpacing,
      calendarDayHeight,
      calendarMonthHeaderHeight,
      calendarRowVerticalSpacing,
      calendarWeekHeaderHeight,
      calendarAdditionalHeight,
    });
  };

  // onCalendarDayPress is provided via CalendarListConfigContext at runtime,
  // so we only need to pass calendarMonthId here.
  const handleRenderItem = ({ item }: { item: CalendarMonthEnhanced }) => (
    <View style={calendarContainerStyle}>
      <Calendar
        calendarMonthId={item.id}
        onCalendarDayPress={onCalendarDayPress}
      />
    </View>
  );

  return (
    <CalendarListConfigProvider value={calendarProps}>
      <LegendList
        data={listData}
        drawDistance={560}
        estimatedItemSize={273}
        getFixedItemSize={getFixedItemSize}
        initialScrollIndex={computedInitialScrollIndex}
        keyExtractor={keyExtractor}
        maintainVisibleContentPosition
        onEndReached={handleOnEndReached}
        onStartReached={handleOnStartReached}
        recycleItems
        ref={legendListRef}
        renderItem={customRenderItem ?? handleRenderItem}
        showsVerticalScrollIndicator={false}
        style={styles.container}
        {...flatListProps}
      />
    </CalendarListConfigProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
