export const everyDay = [1, 2, 3, 4, 5, 6, 7]

export function toggleRoutineDay(activeDays = [], day) {
  if (!Number.isInteger(day) || day < 1 || day > 7) throw new RangeError('Hari harus bernilai 1 sampai 7.')
  return activeDays.includes(day)
    ? activeDays.filter((value) => value !== day)
    : [...activeDays, day].sort((left, right) => left - right)
}

export function chooseEveryDay(enabled) {
  return enabled ? [...everyDay] : []
}

export function isRoutineScheduledOn(routine, weekday) {
  return routine?.is_active !== false && (routine?.active_days ?? []).includes(weekday)
}

export function isRoutineItemScheduledOn(item, routine, weekday) {
  return isRoutineScheduledOn(routine, weekday) && (item?.active_days ?? everyDay).includes(weekday)
}

const weekdayShort = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function describeDays(days = []) {
  const unique = [...new Set(days)].sort((left, right) => left - right)
  if (unique.length === 7) return 'setiap hari'
  if (!unique.length) return 'belum ada hari aktif'
  return unique.map((day) => weekdayShort[day - 1]).join(', ')
}

export function routineFrequencyForProduct(productId, routines = [], items = []) {
  const productItems = items.filter((item) => item.product_id === productId)
  const linked = routines.filter((routine) => productItems.some((item) => item.routine_id === routine.id) && routine.is_active !== false)
  if (!linked.length) return ''
  return linked
    .sort((left, right) => left.position - right.position)
    .map((routine) => {
      const itemDays = productItems.filter((item) => item.routine_id === routine.id).flatMap((item) => item.active_days ?? everyDay)
      const days = [...new Set(itemDays)].filter((day) => (routine.active_days ?? []).includes(day))
      return `${routine.name}: ${describeDays(days)}`
    })
    .join(' · ')
}
