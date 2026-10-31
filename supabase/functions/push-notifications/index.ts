import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import webpush from 'npm:web-push@3.6.7'
import { expiryDedupeKey, routineDedupeKey } from './notification-keys.js'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

async function fetchAll(buildQuery: (from: number, to: number) => any) {
  const rows = []
  const pageSize = 500
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < pageSize) return rows
  }
}

function localParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(now)
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]))
}

function addMonths(dateKey: string, months: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const monthIndex = year * 12 + month - 1 + months
  const targetYear = Math.floor(monthIndex / 12)
  const targetMonth = monthIndex % 12 + 1
  const leapYear = targetYear % 4 === 0 && (targetYear % 100 !== 0 || targetYear % 400 === 0)
  const monthLengths = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(Math.min(day, monthLengths[targetMonth - 1])).padStart(2, '0')}`
}

function dayNumber(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)
  return date.getTime() / 86_400_000
}

function dayDifference(from: string, to: string) {
  return dayNumber(to) - dayNumber(from)
}

async function enqueue(log: Record<string, unknown>) {
  const { data: inserted, error } = await supabase.from('notification_logs').upsert(log, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true }).select('id').maybeSingle()
  if (error) throw error
  let data = inserted
  if (!data) {
    const { data: existing, error: existingError } = await supabase.from('notification_logs').select('id,status').eq('user_id', log.user_id).eq('dedupe_key', log.dedupe_key).single()
    if (existingError) throw existingError
    if (existing.status === 'cancelled' || existing.status === 'sent') return existing.id
    data = existing
  }
  const subscriptions = await fetchAll((from, to) => supabase.from('push_subscriptions').select('id').eq('user_id', log.user_id).range(from, to))
  if (!subscriptions?.length) {
    await supabase.from('notification_logs').update({ status: 'cancelled' }).eq('id', data.id)
    return data.id
  }
  const rows = subscriptions.map(({ id }) => ({ notification_id: data.id, subscription_id: id }))
  const { error: deliveryError } = await supabase.from('notification_deliveries').upsert(rows, { onConflict: 'notification_id,subscription_id', ignoreDuplicates: true })
  if (deliveryError) throw deliveryError
  return data.id
}

async function enqueueDueReminders(now: Date) {
  const local = localParts(now)
  const today = `${local.year}-${local.month}-${local.day}`
  const weekday = ({ Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 } as Record<string, number>)[local.weekday]
  const minute = `${local.hour}:${local.minute}`
  const preferences = await fetchAll((from, to) => supabase.from('notification_preferences').select('*').order('user_id').range(from, to))

  for (const pref of preferences ?? []) {
    const [routines, products] = await Promise.all([
      fetchAll((from, to) => supabase.from('routines').select('id,kind,active_days').eq('user_id', pref.user_id).eq('is_active', true).order('id').range(from, to)),
      pref.product_expiry_enabled
        ? fetchAll((from, to) => supabase.from('products').select('id,name,expires_on,opened_on,pao_months').eq('user_id', pref.user_id).order('id').range(from, to))
        : Promise.resolve([]),
    ])

    if (pref.daily_routine_enabled && minute >= String(pref.morning_reminder_time).slice(0, 5)) {
      const hasMorning = routines.some((routine) => routine.kind === 'morning' && routine.active_days.includes(weekday))
      if (hasMorning) await enqueue({ user_id: pref.user_id, notification_type: 'morning_routine', dedupe_key: routineDedupeKey('morning', today), title: 'Rutinitas pagimu', body: 'Waktunya merawat kulit dengan langkah kecil hari ini.', scheduled_at: now.toISOString(), metadata: { url: '/routine', local_date: today, timezone: 'Asia/Jakarta' } })
    }
    if (pref.evening_reminder_enabled && minute >= String(pref.evening_reminder_time).slice(0, 5)) {
      const hasEvening = routines.some((routine) => routine.kind === 'evening' && routine.active_days.includes(weekday))
      if (hasEvening) await enqueue({ user_id: pref.user_id, notification_type: 'evening_routine', dedupe_key: routineDedupeKey('evening', today), title: 'Rutinitas malammu', body: 'Tutup hari dengan rutinitas perawatan kulitmu.', scheduled_at: now.toISOString(), metadata: { url: '/routine', local_date: today, timezone: 'Asia/Jakarta' } })
    }
    if (pref.product_expiry_enabled && minute >= String(pref.product_expiry_reminder_time).slice(0, 5)) {
      for (const product of products) {
        const candidates = [product.expires_on, product.opened_on && product.pao_months ? addMonths(product.opened_on, product.pao_months) : null].filter(Boolean).sort()
        const expiry = candidates[0]
        if (!expiry) continue
        const days = dayDifference(today, expiry)
        const threshold = Number(pref.product_expiry_days_before)
        if (days < 0 || days > threshold) continue
        await enqueue({ user_id: pref.user_id, notification_type: 'product_expiry', dedupe_key: expiryDedupeKey(product.id, expiry), title: days === 0 ? 'Produk kedaluwarsa hari ini' : 'Pengingat masa berlaku produk', body: `${product.name} ${days === 0 ? 'kedaluwarsa hari ini.' : `kedaluwarsa dalam ${days} hari.`}`, scheduled_at: now.toISOString(), metadata: { url: '/collection', product_id: product.id, expiry_date: expiry, days_remaining: days, timezone: 'Asia/Jakarta' } })
      }
    }
  }
}

async function sendPending() {
  const { data: deliveries, error } = await supabase.rpc('claim_notification_deliveries', { p_limit: 100 })
  if (error) throw error
  for (const delivery of deliveries ?? []) {
    const [{ data: subscription }, { data: notification }] = await Promise.all([
      supabase.from('push_subscriptions').select('*').eq('id', delivery.subscription_id).maybeSingle(),
      supabase.from('notification_logs').select('id,user_id,title,body,metadata').eq('id', delivery.notification_id).single(),
    ])
    if (!subscription || !notification) {
      await supabase.from('notification_deliveries').update({ status: 'failed', last_error: 'Missing subscription or notification' }).eq('id', delivery.id)
      await refreshLogStatus(delivery.notification_id)
      continue
    }
    if (subscription.expires_at && new Date(subscription.expires_at).getTime() <= Date.now()) {
      await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
      await supabase.from('notification_deliveries').update({ status: 'failed', last_error: 'Subscription expired' }).eq('id', delivery.id)
      await refreshLogStatus(delivery.notification_id)
      continue
    }
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, expirationTime: subscription.expires_at ? new Date(subscription.expires_at).getTime() : null, keys: { p256dh: subscription.p256dh_key, auth: subscription.auth_secret } }, JSON.stringify({ notificationId: notification.id, title: notification.title, body: notification.body, url: notification.metadata?.url || '/' }), { TTL: 60 * 60, urgency: 'normal', topic: notification.id.replaceAll('-', '').slice(0, 32), vapidDetails: { subject: Deno.env.get('VAPID_SUBJECT')!, publicKey: Deno.env.get('VAPID_PUBLIC_KEY')!, privateKey: Deno.env.get('VAPID_PRIVATE_KEY')! } })
      await supabase.from('notification_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', delivery.id)
      await refreshLogStatus(delivery.notification_id)
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number }).statusCode || 0)
      const message = String((error as Error).message || 'Push delivery failed').slice(0, 1000)
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', subscription.id)
        await supabase.from('notification_deliveries').update({ status: 'failed', last_error: `Invalid subscription (${statusCode})` }).eq('id', delivery.id)
      } else if ((statusCode === 429 || statusCode >= 500 || statusCode === 0) && delivery.attempt_count < 10) {
        const delayMinutes = Math.min(360, 2 ** Math.min(delivery.attempt_count, 8))
        await supabase.from('notification_deliveries').update({ status: 'queued', next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(), last_error: message }).eq('id', delivery.id)
      } else {
        await supabase.from('notification_deliveries').update({ status: 'failed', last_error: message }).eq('id', delivery.id)
      }
      await refreshLogStatus(delivery.notification_id)
    }
  }
}

async function refreshLogStatus(notificationId: string) {
  const { data: deliveries, error } = await supabase.from('notification_deliveries').select('status').eq('notification_id', notificationId)
  if (error || !deliveries?.length) return
  if (deliveries.some(({ status }) => status === 'queued' || status === 'processing')) return
  const sent = deliveries.some(({ status }) => status === 'sent')
  await supabase.from('notification_logs').update({ status: sent ? 'sent' : 'failed', sent_at: sent ? new Date().toISOString() : null }).eq('id', notificationId)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const cronSecret = Deno.env.get('PUSH_CRON_SECRET')
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) return json({ error: 'Unauthorized' }, 401)
  for (const name of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT']) {
    if (!Deno.env.get(name)) return json({ error: `Missing ${name}` }, 500)
  }
  try {
    await enqueueDueReminders(new Date())
    await sendPending()
    return json({ ok: true })
  } catch (error) {
    console.error('Push scheduler failed', error)
    return json({ error: 'Scheduler failed' }, 500)
  }
})
