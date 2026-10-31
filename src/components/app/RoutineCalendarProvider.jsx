import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { diaryDateKey, diaryMonthKey, monthDateRange } from '../../lib/diary-date.js'
import { createRoutineApi, defaultNotificationPreferences } from '../../lib/routine-api.js'
import { supabase } from '../../lib/supabaseClient.js'
import { withTimeout } from '../../lib/async.js'

const RoutineCalendarContext = createContext(null)
const routineApi = supabase ? createRoutineApi(supabase) : null

export function RoutineCalendarProvider({ children }) {
  const { user } = useAuth()
  const [routines, setRoutines] = useState([])
  const [items, setItems] = useState([])
  const [preferences, setPreferences] = useState(defaultNotificationPreferences)
  const [completedItemIds, setCompletedItemIds] = useState([])
  const [activities, setActivities] = useState([])
  const [activityMonth, setActivityMonth] = useState('')
  const [loading, setLoading] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [error, setError] = useState('')
  const requestVersion = useRef(0)
  const loadedUserId = useRef(null)
  const activityRequest = useRef(0)
  const checklistRequest = useRef(0)

  const load = useCallback(async () => {
    const version = ++requestVersion.current
    if (loadedUserId.current !== (user?.id ?? null)) {
      loadedUserId.current = user?.id ?? null
      checklistRequest.current += 1; activityRequest.current += 1
      setRoutines([]); setItems([]); setActivities([]); setCompletedItemIds([]); setPreferences(defaultNotificationPreferences)
    }
    if (!user) {
      setRoutines([]); setItems([]); setCompletedItemIds([]); setActivities([]); setPreferences(defaultNotificationPreferences); setLoading(false); setError('')
      return
    }
    if (!routineApi) { setError('Supabase belum dikonfigurasi.'); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const result = await withTimeout(routineApi.load(user.id), 'Rutinitas memerlukan waktu terlalu lama untuk dimuat. Periksa koneksi lalu coba lagi.')
      if (version !== requestVersion.current) return
      setRoutines(result.routines)
      setItems(result.items)
      setPreferences(result.preferences)
      const today = diaryDateKey()
      const [completed, monthActivities] = await Promise.all([
        withTimeout(routineApi.completionsForDate(user.id, today), 'Checklist memerlukan waktu terlalu lama untuk dimuat.'),
        (async () => {
          const month = diaryMonthKey()
          const range = monthDateRange(month)
          return { month, rows: await withTimeout(routineApi.activitiesForRange(user.id, range.from, range.to), 'Aktivitas kalender memerlukan waktu terlalu lama untuk dimuat.') }
        })(),
      ])
      if (version !== requestVersion.current) return
      setCompletedItemIds(completed.map(({ routine_item_id: id }) => id))
      setActivityMonth(monthActivities.month)
      setActivities(monthActivities.rows)
    } catch (loadError) { if (version === requestVersion.current) setError(loadError.message || 'Data rutinitas belum dapat dimuat.') }
    finally { if (version === requestVersion.current) setLoading(false) }
  }, [user])

  useEffect(() => { void load(); return () => { requestVersion.current += 1 } }, [load])
  useEffect(() => {
    const refreshAfterProductRemoval = () => { void load() }
    window.addEventListener('diary:products-changed', refreshAfterProductRemoval)
    return () => window.removeEventListener('diary:products-changed', refreshAfterProductRemoval)
  }, [load])

  const createRoutine = useCallback(async (kind) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const routine = await withTimeout(routineApi.create(user.id, kind), 'Pembuatan rutinitas terlalu lama. Coba lagi.')
    setRoutines((current) => [...current.filter((item) => item.id !== routine.id && !(item.user_id === user.id && item.kind === routine.kind)), routine].sort((a, b) => a.position - b.position))
    if (routine.__alreadyExisted) await load()
    return routine
  }, [user, load])

  const updateDays = useCallback(async (routineId, days) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const routine = await withTimeout(routineApi.updateDays(user.id, routineId, days), 'Penyimpanan hari aktif terlalu lama. Coba lagi.')
    setRoutines((current) => current.map((item) => item.id === routineId ? routine : item))
  }, [user])

  const updateRoutine = useCallback(async (routineId, changes) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const routine = await withTimeout(routineApi.updateRoutine(user.id, routineId, changes), 'Pembaruan rutinitas terlalu lama. Coba lagi.')
    setRoutines((current) => current.map((item) => item.id === routineId ? routine : item))
    return routine
  }, [user])

  const archiveRoutine = useCallback(async (routineId) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    await withTimeout(routineApi.archiveRoutine(user.id, routineId), 'Pengarsipan rutinitas terlalu lama. Coba lagi.')
    setRoutines((current) => current.filter((item) => item.id !== routineId))
  }, [user])

  const addItem = useCallback(async (routineId, product, activeDays = [1, 2, 3, 4, 5, 6, 7], explicitPosition) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const routinePositions = items.filter((item) => item.routine_id === routineId).map((item) => item.position)
    const position = explicitPosition ?? Math.max(...routinePositions, -1) + 1
    const item = await withTimeout(routineApi.addItem(user.id, routineId, product, position, activeDays), 'Penambahan produk terlalu lama. Coba lagi.')
    setItems((current) => [...current, item].sort((a, b) => a.position - b.position))
    return item
  }, [user, items])

  const updateItemDays = useCallback(async (itemId, days) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const item = await withTimeout(routineApi.updateItemDays(user.id, itemId, days), 'Jadwal produk terlalu lama untuk disimpan. Coba lagi.')
    setItems((current) => current.map((entry) => entry.id === itemId ? item : entry))
    return item
  }, [user])

  const removeItem = useCallback(async (itemId) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    await withTimeout(routineApi.removeItem(user.id, itemId), 'Penghapusan langkah terlalu lama. Coba lagi.')
    setItems((current) => current.filter((item) => item.id !== itemId))
    setCompletedItemIds((current) => current.filter((id) => id !== itemId))
    setActivities((current) => current.filter((activity) => activity.routine_item_id !== itemId))
  }, [user])

  const moveItem = useCallback(async (routineId, itemId, direction) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const ordered = items.filter((item) => item.routine_id === routineId).sort((a, b) => a.position - b.position)
    const next = await withTimeout(routineApi.moveItem(user.id, routineId, ordered, itemId, direction), 'Pengurutan langkah terlalu lama. Coba lagi.')
    setItems((current) => [...current.filter((item) => item.routine_id !== routineId), ...next].sort((a, b) => a.position - b.position))
  }, [user, items])

  const saveReminder = useCallback(async (kind, time, enabled = true) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const field = kind === 'morning' ? 'morning_reminder_time' : 'evening_reminder_time'
    const enabledField = kind === 'morning' ? 'daily_routine_enabled' : 'evening_reminder_enabled'
    const nextPreferences = { ...preferences, [field]: `${time}:00`, [enabledField]: enabled, timezone: 'Asia/Jakarta' }
    const saved = await withTimeout(routineApi.savePreferences(user.id, nextPreferences), 'Penyimpanan pengingat terlalu lama. Coba lagi.')
    setPreferences(saved)
  }, [user, preferences])

  const savePreferences = useCallback(async (patch) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const saved = await withTimeout(routineApi.savePreferences(user.id, { ...preferences, ...patch, timezone: 'Asia/Jakarta' }), 'Penyimpanan preferensi terlalu lama. Coba lagi.')
    setPreferences(saved)
    return saved
  }, [user, preferences])

  const loadChecklist = useCallback(async (date = diaryDateKey()) => {
    if (!user || !routineApi) return
    const request = ++checklistRequest.current
    const rows = await withTimeout(routineApi.completionsForDate(user.id, date), 'Checklist memerlukan waktu terlalu lama untuk dimuat.')
    if (request === checklistRequest.current && loadedUserId.current === user.id) setCompletedItemIds(rows.map(({ routine_item_id: id }) => id))
  }, [user])

  const loadActivities = useCallback(async (month) => {
    if (!user || !routineApi) return
    const request = ++activityRequest.current
    const range = monthDateRange(month)
    setCalendarLoading(true)
    setError('')
    try {
      const rows = await withTimeout(routineApi.activitiesForRange(user.id, range.from, range.to), 'Aktivitas kalender memerlukan waktu terlalu lama untuk dimuat.')
      if (request === activityRequest.current && loadedUserId.current === user.id) { setActivities(rows); setActivityMonth(month) }
    } catch (loadError) { if (request === activityRequest.current) setError(loadError.message || 'Aktivitas kalender belum dapat dimuat.'); throw loadError }
    finally { if (request === activityRequest.current) setCalendarLoading(false) }
  }, [user])

  const loadActivityRange = useCallback(async (from, to) => {
    if (!user || !routineApi) return []
    return withTimeout(routineApi.activitiesForRange(user.id, from, to), 'Riwayat pemakaian memerlukan waktu terlalu lama untuk dimuat.')
  }, [user])

  const setCompletion = useCallback(async (itemId, complete, date = diaryDateKey()) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    await withTimeout(routineApi.setCompletion(user.id, itemId, date, complete), 'Checklist terlalu lama untuk disimpan. Periksa koneksi lalu coba lagi.')
    setCompletedItemIds((current) => complete
      ? (current.includes(itemId) ? current : [...current, itemId])
      : current.filter((id) => id !== itemId))
    await loadActivities(date.slice(0, 7))
  }, [user, loadActivities])

  const addSkinNote = useCallback(async (date, note) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    const row = await withTimeout(routineApi.addSkinNote(user.id, date, note), 'Catatan kulit terlalu lama untuk disimpan. Coba lagi.')
    const month = date.slice(0, 7)
    if (activityMonth === month) setActivities((current) => [...current.filter((item) => item.id !== row.id), row])
    else await loadActivities(month)
    return row
  }, [user, activityMonth, loadActivities])

  const deleteSkinNote = useCallback(async (activityId) => {
    if (!user || !routineApi) throw new Error('Sesi pengguna atau konfigurasi Supabase tidak tersedia.')
    await withTimeout(routineApi.deleteSkinNote(user.id, activityId), 'Penghapusan catatan terlalu lama. Coba lagi.')
    setActivities((current) => current.filter((activity) => activity.id !== activityId))
  }, [user])

  const value = useMemo(() => ({
    routines, items, preferences, completedItemIds, activities, activityMonth, loading, calendarLoading, error,
    reload: load, createRoutine, updateRoutine, archiveRoutine, updateDays, addItem, updateItemDays, removeItem, moveItem, saveReminder, savePreferences,
    loadChecklist, loadActivities, loadActivityRange, setCompletion, addSkinNote, deleteSkinNote,
  }), [routines, items, preferences, completedItemIds, activities, activityMonth, loading, calendarLoading, error, load, createRoutine, updateRoutine, archiveRoutine, updateDays, addItem, updateItemDays, removeItem, moveItem, saveReminder, savePreferences, loadChecklist, loadActivities, loadActivityRange, setCompletion, addSkinNote, deleteSkinNote])
  return <RoutineCalendarContext.Provider value={value}>{children}</RoutineCalendarContext.Provider>
}

export function useRoutineCalendar() {
  const value = useContext(RoutineCalendarContext)
  if (!value) throw new Error('useRoutineCalendar harus digunakan di dalam RoutineCalendarProvider.')
  return value
}
