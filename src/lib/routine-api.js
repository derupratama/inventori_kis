export const defaultNotificationPreferences = {
  user_id: null,
  daily_routine_enabled: true,
  morning_reminder_time: '08:00:00',
  evening_reminder_enabled: false,
  evening_reminder_time: '20:00:00',
  weekly_summary_enabled: true,
  weekly_summary_iso_day: 1,
  product_expiry_enabled: true,
  product_expiry_days_before: 7,
  product_expiry_reminder_time: '09:00:00',
  timezone: 'Asia/Jakarta',
}

async function unwrap(query) {
  const { data, error } = await query
  if (error) throw error
  return data
}

function isMissingArchivedAt(error) {
  return /archived_at/i.test(error?.message ?? '') && ['42703', 'PGRST204'].includes(error?.code)
}

async function loadRoutines(client, userId) {
  const currentSchema = await client.from('routines').select('*').eq('user_id', userId).is('archived_at', null).order('position')
  if (!currentSchema.error) return currentSchema.data
  // Keep existing routine reads working until the additive product/review migration is applied.
  if (!isMissingArchivedAt(currentSchema.error)) throw currentSchema.error
  return unwrap(client.from('routines').select('*').eq('user_id', userId).order('position'))
}

async function findStandardRoutine(client, userId, kind) {
  const currentSchema = await client.from('routines').select('*').eq('user_id', userId).eq('kind', kind).is('archived_at', null).maybeSingle()
  if (!currentSchema.error) return currentSchema.data
  if (!isMissingArchivedAt(currentSchema.error)) throw currentSchema.error
  return unwrap(client.from('routines').select('*').eq('user_id', userId).eq('kind', kind).maybeSingle())
}

export function createRoutineApi(client) {
  return {
    async load(userId) {
      const [routines, preferences] = await Promise.all([
        loadRoutines(client, userId),
        unwrap(client.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle()),
      ])
      const routineIds = routines.map(({ id }) => id)
      const items = routineIds.length
        ? await unwrap(client.from('routine_items').select('*').eq('user_id', userId).in('routine_id', routineIds).order('position'))
        : []
      return { routines, items, preferences: preferences ?? { ...defaultNotificationPreferences, user_id: userId } }
    },
    async create(userId, kind) {
      try {
        return await unwrap(client.from('routines').insert({
          user_id: userId, kind, name: kind === 'morning' ? 'Rutinitas Pagi' : 'Rutinitas Malam',
          active_days: [1, 2, 3, 4, 5, 6, 7], position: kind === 'morning' ? 0 : 1,
        }).select('*').single())
      } catch (error) {
        if (error?.code !== '23505' || !/routines_unique_standard_kind_idx/.test(error.message ?? '')) throw error
        const existing = await findStandardRoutine(client, userId, kind)
        if (!existing) throw error
        return { ...existing, __alreadyExisted: true }
      }
    },
    async updateDays(userId, routineId, activeDays) {
      return unwrap(client.from('routines').update({ active_days: activeDays }).eq('user_id', userId).eq('id', routineId).select('*').single())
    },
    async updateRoutine(userId, routineId, changes) {
      const payload = {}
      if ('name' in changes) payload.name = changes.name.trim()
      if ('is_active' in changes) payload.is_active = changes.is_active
      return unwrap(client.from('routines').update(payload).eq('user_id', userId).eq('id', routineId).select('*').single())
    },
    async archiveRoutine(userId, routineId) {
      return unwrap(client.from('routines').update({ is_active: false, archived_at: new Date().toISOString() }).eq('user_id', userId).eq('id', routineId).is('archived_at', null).select('*').single())
    },
    async addItem(userId, routineId, product, position, activeDays = [1, 2, 3, 4, 5, 6, 7]) {
      const row = await unwrap(client.from('routine_items').insert({
        user_id: userId, routine_id: routineId, product_id: product.id,
        label: product.name, instructions: product.usage ?? null,
        position, active_days: activeDays,
      }).select('*').single())
      return row
    },
    async updateItemDays(userId, itemId, activeDays) {
      return unwrap(client.from('routine_items').update({ active_days: activeDays }).eq('user_id', userId).eq('id', itemId).select('*').single())
    },
    async removeItem(userId, itemId) {
      await unwrap(client.from('routine_items').delete().eq('user_id', userId).eq('id', itemId))
    },
    async moveItem(userId, routineId, sortedItems, itemId, direction) {
      const index = sortedItems.findIndex(({ id }) => id === itemId)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= sortedItems.length) return sortedItems
      const moving = sortedItems[index]
      const displaced = sortedItems[targetIndex]
      await unwrap(client.rpc('move_routine_item', { p_routine_id: routineId, p_item_id: itemId, p_direction: direction }))
      return sortedItems.map((item) => item.id === moving.id ? { ...item, position: displaced.position } : item.id === displaced.id ? { ...item, position: moving.position } : item)
        .sort((left, right) => left.position - right.position)
    },
    async savePreferences(userId, preferences) {
      const row = await unwrap(client.from('notification_preferences').upsert({ ...preferences, user_id: userId }, { onConflict: 'user_id' }).select('*').single())
      return row
    },
    async completionsForDate(userId, date) {
      return unwrap(client.from('routine_completions').select('routine_item_id').eq('user_id', userId).eq('completed_on', date))
    },
    async setCompletion(userId, itemId, date, complete) {
      return unwrap(client.rpc('set_routine_item_completion', {
        p_routine_item_id: itemId, p_completed_on: date, p_complete: complete,
      }))
    },
    async activitiesForRange(userId, from, to) {
      return unwrap(client.from('usage_logs').select('*').eq('user_id', userId).gte('activity_date', from).lte('activity_date', to).order('occurred_at'))
    },
    async addSkinNote(userId, date, note, id) {
      return unwrap(client.from('usage_logs').insert({
        ...(id ? { id } : {}), user_id: userId, activity_type: 'skin_note', activity_date: date,
        occurred_at: new Date().toISOString(), mood: 'Catatan kulit', notes: note,
      }).select('*').single())
    },
    async deleteSkinNote(userId, activityId) {
      const row = await unwrap(client.from('usage_logs').delete()
        .eq('user_id', userId)
        .eq('id', activityId)
        .eq('activity_type', 'skin_note')
        .is('routine_completion_id', null)
        .is('routine_item_id', null)
        .is('product_id', null)
        .select('id')
        .maybeSingle())
      if (!row) throw new Error('Catatan manual tidak ditemukan atau tidak dapat dihapus.')
      return row.id
    },
  }
}
