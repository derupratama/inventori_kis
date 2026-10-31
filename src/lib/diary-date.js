export const DIARY_TIME_ZONE = 'Asia/Jakarta'

export function diaryDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DIARY_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]))
  return `${value.year}-${value.month}-${value.day}`
}

export function diaryDateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12))
}

export function diaryDateLabel(key, options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) {
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: DIARY_TIME_ZONE }).format(diaryDateFromKey(key))
}

export function diaryMonthLabel(monthKey) {
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: DIARY_TIME_ZONE }).format(diaryDateFromKey(`${monthKey}-01`))
}

export function diaryTimeLabel(instant) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: DIARY_TIME_ZONE }).format(new Date(instant))
}

export function diaryMonthKey(date = new Date()) {
  return diaryDateKey(date).slice(0, 7)
}

export function shiftDiaryMonth(monthKey, amount) {
  const [year, month] = monthKey.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1 + amount, 1, 12))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

export function diaryCalendarDays(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const first = new Date(Date.UTC(year, month - 1, 1, 12))
  const mondayOffset = (first.getUTCDay() + 6) % 7
  const start = new Date(Date.UTC(year, month - 1, 1 - mondayOffset, 12))
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setUTCDate(start.getUTCDate() + index)
    return day.toISOString().slice(0, 10)
  })
}

export function diaryIsoWeekday(key) {
  const day = diaryDateFromKey(key).getUTCDay()
  return day === 0 ? 7 : day
}

export function monthDateRange(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  const last = new Date(Date.UTC(year, month, 0, 12)).toISOString().slice(0, 10)
  return { from: `${monthKey}-01`, to: last }
}

export function formatDiaryDateTime(instant) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: DIARY_TIME_ZONE,
  }).format(new Date(instant))
}
