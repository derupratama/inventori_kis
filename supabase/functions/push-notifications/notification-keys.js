function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
}

export function routineDedupeKey(kind, localDate) {
  if (!['morning', 'evening'].includes(kind) || !isCalendarDate(localDate)) {
    throw new RangeError('Invalid routine reminder identity')
  }
  return `routine:${kind}:${localDate}`
}

export function expiryDedupeKey(productId, effectiveExpiryDate) {
  if (!productId || !isCalendarDate(effectiveExpiryDate)) {
    throw new RangeError('Invalid expiry reminder identity')
  }
  return `expiry:${productId}:${effectiveExpiryDate}`
}
