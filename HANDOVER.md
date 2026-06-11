# Handover: Calendar Viewport Issue

## Problem
Calendar hours (time slots like 09:00, 10:00, etc.) are NOT visible on screen. The calendar content is either:
- Scrolled too far down, OR
- The calendar grid doesn't fit within the visible viewport

## Root Cause
The issue is NOT about padding. It's about how the calendar grid calculates its height/position relative to the viewport. The calendar component likely uses `position: absolute` or `overflow: hidden` in a way that clips the top time slots.

## Files to Investigate

### Primary: Calendar Grid Component
```
/Users/admin/Desktop/bapita-dashboard/src/components/calendar/
```
Look for:
- `CalendarGrid.tsx` or similar
- Files that render time slots (09:00, 10:00, etc.)
- CSS/positioning that controls where the grid starts

### Secondary: AppShell Layout
```
/Users/admin/Desktop/bapita-dashboard/src/components/AppShell.tsx
```
This controls the main layout wrapper. Line ~546 has:
```tsx
<main className={`pt-4 pb-16 md:pt-12 md:pb-0 h-full ${onCalendar ? "md:ps-56" : ""}`}>{children}</main>
```

## What to Check

1. **Calendar grid container**: Does it have `height: 100%` or `height: 100vh`? If parent has `overflow: hidden`, child absolute elements get clipped.

2. **Time slot positioning**: Are time slots rendered with `position: absolute; top: Xpx`? If so, the `top` value might be negative or too large.

3. **Scroll container**: Is the calendar inside a scrollable container? If so, the scroll position might default to showing later hours.

4. **CSS `inset` or `top` values**: Search for `top-0`, `top-12`, `top-16` in calendar files - these control vertical positioning.

## Quick Debug
Add this to the calendar container temporarily:
```css
border: 2px solid red;
overflow: visible;
```
This will show if the grid extends beyond its container (clipped) or if scroll position is wrong.

## GitHub Repo
https://github.com/ramikan96-collab/bapita-dashboard

Branch: `main`
Last commit: `f73843a` - "Fix content padding - reduce top padding, hours visible on calendar"