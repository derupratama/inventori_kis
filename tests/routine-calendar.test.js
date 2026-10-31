import assert from 'node:assert/strict'
import test from 'node:test'
import { diaryCalendarDays, diaryDateKey, diaryIsoWeekday, diaryMonthKey, diaryMonthLabel, monthDateRange, shiftDiaryMonth } from '../src/lib/diary-date.js'
import { createRoutineApi } from '../src/lib/routine-api.js'
import { chooseEveryDay, isRoutineItemScheduledOn, isRoutineScheduledOn, routineFrequencyForProduct, toggleRoutineDay } from '../src/lib/routine-schedule.js'

test('tanggal ledger mengikuti Asia/Jakarta meski instant UTC berada di hari berbeda', () => {
  assert.equal(diaryDateKey(new Date('2026-10-31T17:00:00.000Z')), '2026-11-01')
  assert.equal(diaryDateKey(new Date('2026-11-01T17:00:00.000Z')), '2026-11-02')
  assert.equal(diaryMonthKey(new Date('2026-12-31T18:00:00.000Z')), '2027-01')
})

test('kalender menghasilkan minggu Senin-Minggu, label bulan, dan range bulan yang stabil', () => {
  const days = diaryCalendarDays('2026-11')
  assert.equal(days.length, 42)
  assert.equal(days[0], '2026-10-26')
  assert.equal(days[6], '2026-11-01')
  assert.equal(diaryIsoWeekday('2026-11-01'), 7)
  assert.equal(shiftDiaryMonth('2026-12', 1), '2027-01')
  assert.deepEqual(monthDateRange('2026-02'), { from: '2026-02-01', to: '2026-02-28' })
  assert.equal(diaryMonthLabel('2026-11'), 'November 2026')
})

test('pemilihan hari mendukung beberapa hari, setiap hari, dan pembatalan yang menyesuaikan pilihan', () => {
  assert.deepEqual(toggleRoutineDay([1, 3], 2), [1, 2, 3])
  assert.deepEqual(toggleRoutineDay([1, 2, 3], 2), [1, 3])
  assert.deepEqual(chooseEveryDay(true), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(toggleRoutineDay(chooseEveryDay(true), 5), [1, 2, 3, 4, 6, 7])
  assert.deepEqual(chooseEveryDay(false), [])
  assert.throws(() => toggleRoutineDay([], 8), /1 sampai 7/)
})

test('frekuensi produk mengikuti jadwal routine aktif dan checklist hanya berlaku pada hari terjadwal', () => {
  const routines = [
    { id: 'morning', name: 'Rutinitas Pagi', kind: 'morning', is_active: true, active_days: [1, 3, 5], position: 0 },
    { id: 'evening', name: 'Rutinitas Malam', kind: 'evening', is_active: true, active_days: [1, 2, 3, 4, 5, 6, 7], position: 1 },
    { id: 'inactive', name: 'Rutinitas Lama', is_active: false, active_days: [1, 2], position: 2 },
  ]
  const items = [{ product_id: 'product-1', routine_id: 'morning' }, { product_id: 'product-1', routine_id: 'evening' }, { product_id: 'product-1', routine_id: 'inactive' }]
  assert.equal(routineFrequencyForProduct('product-1', routines, items), 'Rutinitas Pagi: Sen, Rab, Jum · Rutinitas Malam: setiap hari')
  assert.equal(routineFrequencyForProduct('product-other', routines, items), '')
  assert.equal(isRoutineScheduledOn(routines[0], 3), true)
  assert.equal(isRoutineScheduledOn(routines[0], 2), false)
  assert.equal(isRoutineScheduledOn(routines[2], 1), false)
})

test('produk routine dapat dijadwalkan berbeda per hari dan per sesi', () => {
  const morning = { id: 'morning', kind: 'morning', name: 'Rutinitas pagi', is_active: true, active_days: [1, 2, 3, 4, 5, 6, 7] }
  const item = { id: 'serum', routine_id: 'morning', product_id: 'product-1', active_days: [1, 3, 5] }
  assert.equal(isRoutineItemScheduledOn(item, morning, 1), true)
  assert.equal(isRoutineItemScheduledOn(item, morning, 2), false)
  assert.equal(routineFrequencyForProduct('product-1', [morning], [item]), 'Rutinitas pagi: Sen, Rab, Jum')
})

test('checklist memanggil RPC idempotent memakai tanggal DATE Jakarta dan status terbaru', async () => {
  const calls = []
  const api = createRoutineApi({ rpc: async (fn, args) => { calls.push([fn, args]); return { data: { completed: true, completion_id: 'completion-1' }, error: null } } })
  const result = await api.setCompletion('user-1', 'item-1', '2026-11-01', true)
  assert.equal(result.completed, true)
  assert.deepEqual(calls, [['set_routine_item_completion', { p_routine_item_id: 'item-1', p_completed_on: '2026-11-01', p_complete: true }]])
})

test('membuka ulang rutinitas standar yang sudah ada ketika insert bersamaan terkena unique index', async () => {
  const existing = { id: 'routine-existing', user_id: 'user-1', kind: 'morning', name: 'Rutinitas Pagi', position: 0 }
  let lookupHadArchivedAt = false
  const client = { from(table) {
    assert.equal(table, 'routines')
    const query = { filters: [] }
    const builder = {
      insert() { query.insert = true; return builder },
      select() { return builder },
      eq(key, value) { query.filters.push([key, value]); return builder },
      is(key) { lookupHadArchivedAt = key === 'archived_at'; query.archived = true; return builder },
      single() { return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "routines_unique_standard_kind_idx"' } }) },
      maybeSingle() {
        if (query.archived) return Promise.resolve({ data: null, error: { code: 'PGRST204', message: "Could not find the 'archived_at' column in the schema cache" } })
        return Promise.resolve({ data: existing, error: null })
      },
    }
    return builder
  } }
  const result = await createRoutineApi(client).create('user-1', 'morning')
  assert.equal(lookupHadArchivedAt, true)
  assert.equal(result.id, 'routine-existing')
  assert.equal(result.__alreadyExisted, true)
})

test('routine order uses one atomic RPC and swaps persisted order for the UI', async () => {
  const calls = []
  const api = createRoutineApi({ rpc: async (fn, args) => { calls.push([fn, args]); return { data: null, error: null } } })
  const rows = [{ id: 'first', position: 0 }, { id: 'second', position: 1 }, { id: 'third', position: 2 }]
  const moved = await api.moveItem('user-1', 'routine-1', rows, 'second', -1)
  assert.deepEqual(calls, [['move_routine_item', { p_routine_id: 'routine-1', p_item_id: 'second', p_direction: -1 }]])
  assert.deepEqual(moved.map(({ id, position }) => [id, position]), [['second', 0], ['first', 1], ['third', 2]])
  await api.moveItem('user-1', 'routine-1', rows, 'first', -1)
  assert.equal(calls.length, 1, 'moving beyond the first item performs no write')
})

test('kalender membatasi usage logs pada rentang DATE yang diminta dan catatan disimpan pada tanggal terpilih', async () => {
  const queries = []
  const client = {
    from(table) {
      const record = { table, filters: [] }; queries.push(record)
      const builder = {
        select(value) { record.select = value; return builder },
        eq(column, value) { record.filters.push([column, value]); return builder },
        gte(column, value) { record.filters.push([column, value]); return builder },
        lte(column, value) { record.filters.push([column, value]); return builder },
        order(column) { record.order = column; return Promise.resolve({ data: [{ id: 'log-1' }], error: null }) },
        insert(value) { record.insert = value; return builder },
        single() { return Promise.resolve({ data: { id: 'note-1', ...record.insert }, error: null }) },
      }
      return builder
    },
  }
  const api = createRoutineApi(client)
  assert.equal((await api.activitiesForRange('user-1', '2026-11-01', '2026-11-30')).length, 1)
  await api.addSkinNote('user-1', '2026-11-03', 'Kulit terasa tenang')
  assert.deepEqual(queries[0].filters, [['user_id', 'user-1'], ['activity_date', '2026-11-01'], ['activity_date', '2026-11-30']])
  assert.equal(queries[1].insert.activity_date, '2026-11-03')
  assert.equal(queries[1].insert.activity_type, 'skin_note')
})
