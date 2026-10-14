import { describe, expect, it, mock } from "bun:test";
import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

import type * as CalendarModule from "@/components/Calendar";
import type * as CalendarListModule from "@/components/CalendarList";

interface TestNode {
  type: unknown;
  props: { testID?: string };
}

interface TestRenderer {
  root: { findAll: (predicate: (node: TestNode) => boolean) => TestNode[] };
}

// react-test-renderer ships without types
const { act, create } = require("react-test-renderer") as {
  act: (callback: () => void) => void;
  create: (element: ReactNode) => TestRenderer;
};

// react-native ships Flow sources that bun can't parse, so render the calendar
// against plain host elements instead.
mock.module("react-native", () => {
  const host =
    (type: string) =>
    ({ children, ...props }: { children?: ReactNode }) =>
      createElement(type, props, children);
  return {
    Pressable: ({
      children,
      style: _style,
      ...props
    }: {
      children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
      style?: unknown;
    }) =>
      createElement(
        "Pressable",
        props,
        typeof children === "function" ? children({ pressed: false }) : children
      ),
    StyleSheet: { create: <T,>(styles: T) => styles },
    Text: host("Text"),
    View: host("View"),
    useColorScheme: () => "light",
  };
});

mock.module("@legendapp/list/react-native", () => ({
  LegendList: <T,>({
    data,
    renderItem,
  }: {
    data: T[];
    renderItem: (info: { item: T; index: number }) => ReactNode;
  }) =>
    createElement(
      "LegendList",
      null,
      data.map((item, index) =>
        createElement(Fragment, { key: index }, renderItem({ item, index }))
      )
    ),
}));

// Loaded after the mocks above are registered.
const { Calendar } = require("@/components/Calendar") as typeof CalendarModule;
const { CalendarList } =
  require("@/components/CalendarList") as typeof CalendarListModule;

const noop = () => {};
const getCalendarDayTestID = (dateId: string) => `calendar-day-${dateId}`;

const render = (element: ReactNode) => {
  let renderer: TestRenderer | undefined;
  act(() => {
    renderer = create(element);
  });
  return renderer!;
};

const getDayTestIDs = (renderer: TestRenderer) =>
  renderer.root
    .findAll((node) => node.type === "Pressable")
    .map((node) => node.props.testID);

describe("Calendar day testIDs", () => {
  it("doesn't set a default testID", () => {
    const renderer = render(
      <Calendar calendarMonthId="2024-02-01" onCalendarDayPress={noop} />
    );

    const testIDs = getDayTestIDs(renderer);
    expect(testIDs).toHaveLength(29);
    expect(testIDs.every((testID) => testID === undefined)).toBe(true);
  });

  it("uses getCalendarDayTestID for each day", () => {
    const renderer = render(
      <Calendar
        calendarMonthId="2024-02-01"
        getCalendarDayTestID={getCalendarDayTestID}
        onCalendarDayPress={noop}
      />
    );

    const testIDs = getDayTestIDs(renderer);
    expect(testIDs).toHaveLength(29);
    expect(testIDs[0]).toBe("calendar-day-2024-02-01");
    expect(testIDs).toContain("calendar-day-2024-02-14");
    expect(testIDs[28]).toBe("calendar-day-2024-02-29");
  });

  it("forwards the testID to a custom CalendarPressableComponent", () => {
    const CustomPressable = ({
      testID,
      children,
    }: {
      testID?: string;
      children?: ReactNode | ((state: { pressed: boolean }) => ReactNode);
    }) =>
      createElement(
        "CustomPressable",
        { testID },
        typeof children === "function" ? children({ pressed: false }) : children
      );

    const renderer = render(
      <Calendar
        CalendarPressableComponent={CustomPressable}
        calendarMonthId="2024-02-01"
        getCalendarDayTestID={getCalendarDayTestID}
        onCalendarDayPress={noop}
      />
    );

    const testIDs = renderer.root
      .findAll((node) => node.type === "CustomPressable")
      .map((node) => node.props.testID);
    expect(testIDs).toContain("calendar-day-2024-02-14");
  });

  it("passes getCalendarDayTestID through Calendar.List", () => {
    const renderer = render(
      <CalendarList
        calendarFutureScrollRangeInMonths={0}
        calendarInitialMonthId="2024-02-01"
        calendarPastScrollRangeInMonths={0}
        getCalendarDayTestID={getCalendarDayTestID}
        onCalendarDayPress={noop}
      />
    );

    expect(getDayTestIDs(renderer)).toContain("calendar-day-2024-02-14");
  });
});
