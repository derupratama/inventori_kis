import { diaryDateKey } from './diary-date.js'

export const EXPIRY_WARNING_DAYS = 30

export const expiryStatusLabels = {
  expired: 'Kedaluwarsa',
  expiring_soon: 'Segera kedaluwarsa',
  active: 'Masih aman',
  no_expiry: 'Tanggal belum dicatat',
}

export function parseDateKey(value, field = 'Tanggal') {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError(`${field} harus menggunakan format YYYY-MM-DD.`)
  }
  const [year, month, day] = value.split('-').map(Number)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthLengths[month - 1]) {
    throw new RangeError(`${field} bukan tanggal kalender yang valid.`)
  }
  return { year, month, day }
}

function dayNumber(value) {
  const { year, month, day } = parseDateKey(value)
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getTime() / 86_400_000
}

export function addCalendarMonths(dateKey, months) {
  const { year, month, day } = parseDateKey(dateKey)
  if (!Number.isInteger(months) || months < 1 || months > 60) {
    throw new RangeError('PAO harus berupa bilangan bulat antara 1 dan 60 bulan.')
  }
  const monthIndex = year * 12 + month - 1 + months
  const targetYear = Math.floor(monthIndex / 12)
  const targetMonth = monthIndex % 12 + 1
  if (targetYear > 9999) throw new RangeError('Tanggal PAO melewati batas tahun yang didukung.')
  const leapYear = targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0)
  const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const targetDay = Math.min(day, monthLengths[targetMonth - 1])
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
}

export function getExpiryInfo(product, today = new Date()) {
  const todayKey = typeof today === 'string' ? today : diaryDateKey(today)
  parseDateKey(todayKey, 'Hari ini')
  const packageExpiry = product.expiresOn || null
  const openedOn = product.openedOn || null
  if (packageExpiry) parseDateKey(packageExpiry, 'Tanggal kedaluwarsa kemasan')
  if (openedOn) parseDateKey(openedOn, 'Tanggal dibuka')
  const paoMonths = product.paoMonths == null || product.paoMonths === '' ? null : Number(product.paoMonths)
  if (paoMonths != null && (!Number.isInteger(paoMonths) || paoMonths < 1 || paoMonths > 60)) {
    throw new RangeError('PAO harus berupa bilangan bulat antara 1 dan 60 bulan.')
  }

  // PAO starts only once the product has an opened date.
  const paoExpiry = openedOn && paoMonths ? addCalendarMonths(openedOn, paoMonths) : null
  const expiryCandidates = [
    packageExpiry && { date: packageExpiry, source: 'package' },
    paoExpiry && { date: paoExpiry, source: 'pao' },
  ].filter(Boolean).sort((left, right) => left.date.localeCompare(right.date))
  const effectiveExpiry = expiryCandidates[0] ?? null

  if (!effectiveExpiry) {
    return { effectiveExpiryDate: null, paoExpiryDate: paoExpiry, daysRemaining: null, status: 'no_expiry', source: null }
  }

  const daysRemaining = dayNumber(effectiveExpiry.date) - dayNumber(todayKey)
  const status = daysRemaining < 0 ? 'expired' : daysRemaining <= EXPIRY_WARNING_DAYS ? 'expiring_soon' : 'active'
  return {
    effectiveExpiryDate: effectiveExpiry.date,
    paoExpiryDate: paoExpiry,
    daysRemaining,
    status,
    source: effectiveExpiry.source,
  }
}

export function validateProductDates({ expiresOn = '', openedOn = '', paoMonths = '' } = {}) {
  const normalizedExpiry = expiresOn || null
  const normalizedOpened = openedOn || null
  if (normalizedExpiry) parseDateKey(normalizedExpiry, 'Tanggal kedaluwarsa kemasan')
  if (normalizedOpened) parseDateKey(normalizedOpened, 'Tanggal dibuka')

  const normalizedPao = paoMonths === '' || paoMonths == null ? null : Number(paoMonths)
  if (normalizedPao != null && (!Number.isInteger(normalizedPao) || normalizedPao < 1 || normalizedPao > 60)) {
    throw new RangeError('PAO harus berupa bilangan bulat antara 1 dan 60 bulan.')
  }
  return { expiresOn: normalizedExpiry, openedOn: normalizedOpened, paoMonths: normalizedPao }
}
