---
"@lazerlen/legend-calendar": minor
---

Add `getCalendarDayTestID` to `Calendar` and `Calendar.List`, and a `testID` prop to `Calendar.Item.Day`, so day cells can be targeted by UI automation. The testID is forwarded to `CalendarPressableComponent`. Days have no testID unless one is provided.
