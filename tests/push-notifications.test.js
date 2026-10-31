import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'
import { expiryDedupeKey, routineDedupeKey } from '../supabase/functions/push-notifications/notification-keys.js'

test('expiry reminder dedupe stays stable if the configured warning threshold changes', () => {
  assert.equal(expiryDedupeKey('product-a', '2027-02-28'), expiryDedupeKey('product-a', '2027-02-28'))
  assert.notEqual(expiryDedupeKey('product-a', '2027-02-28'), expiryDedupeKey('product-b', '2027-02-28'))
  assert.notEqual(expiryDedupeKey('product-a', '2027-02-28'), expiryDedupeKey('product-a', '2027-03-01'))
  assert.throws(() => expiryDedupeKey('product-a', '2027-02-30'), RangeError)
})

test('routine reminder dedupe is unique by kind and Jakarta local date', () => {
  assert.equal(routineDedupeKey('morning', '2027-01-02'), 'routine:morning:2027-01-02')
  assert.notEqual(routineDedupeKey('morning', '2027-01-02'), routineDedupeKey('evening', '2027-01-02'))
  assert.throws(() => routineDedupeKey('custom', '2027-01-02'), RangeError)
})

async function loadServiceWorker() {
  const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')
  const listeners = new Map()
  const notifications = []
  const self = {
    location: { origin: 'https://diary.example' },
    registration: { showNotification: async (...args) => notifications.push(args) },
    clients: { matchAll: async () => [], openWindow: async (url) => url },
    addEventListener: (type, listener) => listeners.set(type, listener),
    skipWaiting: async () => {},
  }
  const context = {
    self,
    caches: { open: async () => ({ addAll: async () => {} }), keys: async () => [], match: async () => null, delete: async () => true },
    URL,
    fetch: async () => new Response('ok'),
    Promise,
  }
  vm.runInNewContext(source, context)
  return { listeners, notifications, self }
}

test('service worker handles a push payload with a stable replacement tag', async () => {
  const { listeners, notifications } = await loadServiceWorker()
  let completion
  listeners.get('push')({
    data: { json: () => ({ notificationId: 'notice-1', title: 'Routine', body: 'Reminder', url: '/routine' }) },
    waitUntil: (promise) => { completion = promise },
  })
  await completion
  assert.equal(notifications.length, 1)
  assert.equal(notifications[0][0], 'Routine')
  assert.equal(notifications[0][1].tag, 'notice-1')
  assert.equal(notifications[0][1].renotify, false)
})

test('service worker notification click opens only a same-origin app URL', async () => {
  const { listeners, self } = await loadServiceWorker()
  let opened
  self.clients.openWindow = async (url) => { opened = url }
  let completion
  listeners.get('notificationclick')({
    notification: { data: { url: 'https://evil.example/steal' }, close() {} },
    waitUntil: (promise) => { completion = promise },
  })
  await completion
  assert.equal(opened, 'https://diary.example/')
})
