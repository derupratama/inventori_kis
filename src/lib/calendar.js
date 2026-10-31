import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  startOfMonth, startOfWeek, subMonths,
} from 'date-fns'

export function getCalendarDays(month) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  })
}

export function shiftCalendarMonth(month, direction) {
  return startOfMonth(direction >= 0 ? addMonths(month, 1) : subMonths(month, 1))
}

export function getDiaryDateKey(date) {
  return format(date, 'yyyy-MM-dd')
}

export function countEntriesInMonth(entries, month) {
  const monthPrefix = format(month, 'yyyy-MM')
  return Object.keys(entries).filter((key) => key.startsWith(monthPrefix)).length
}
