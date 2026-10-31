import { supabase } from './supabaseClient.js'

function decodeBase64Url(value) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

export function pushSupport() {
  return {
    secure: window.isSecureContext,
    supported: window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
  }
}

export async function getPushSubscription() {
  if (!pushSupport().supported) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(userId) {
  const { supported } = pushSupport()
  if (!supported) throw new Error('Push memerlukan HTTPS dan browser yang mendukung Web Push.')
  if (!supabase) throw new Error('Konfigurasi Supabase belum tersedia.')
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) throw new Error('VITE_VAPID_PUBLIC_KEY belum dikonfigurasi.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Izin notifikasi belum diberikan.')
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeBase64Url(vapidKey) })
  const value = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: value.endpoint,
    p256dh_key: value.keys?.p256dh,
    auth_secret: value.keys?.auth,
    expires_at: value.expirationTime ? new Date(value.expirationTime).toISOString() : null,
  }, { onConflict: 'user_id,endpoint' })
  if (error) {
    await subscription.unsubscribe()
    throw error
  }
  return subscription
}

export async function unsubscribeFromPush(userId) {
  const subscription = await getPushSubscription()
  if (!subscription) return
  if (!supabase) throw new Error('Konfigurasi Supabase belum tersedia.')
  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint)
  if (error) throw error
  await subscription.unsubscribe()
}
