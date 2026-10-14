# @lazerlen/legend-calendar

## 1.7.0

### Minor Changes

- 7757c3a: Add `getCalendarDayTestID` to `Calendar` and `Calendar.List`, and a `testID` prop to `Calendar.Item.Day`, so day cells can be targeted by UI automation. The testID is forwarded to `CalendarPressableComponent`. Days have no testID unless one is provided.

## 1.6.1

### Patch Changes

- bd96ee2: Update development and example usage to `@legendapp/list` v3.4.0 while retaining compatibility with earlier v3 releases.
