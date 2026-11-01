import { createUuid } from './uuid.js'

const DB_NAME = 'my-skin-diary-offline'
const DB_VERSION = 1
let databasePromise

function openDatabase() {
  if (!('indexedDB' in globalThis)) return Promise.reject(new Error('Penyimpanan offline tidak tersedia di browser ini.'))
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots')
      if (!db.objectStoreNames.contains('queue')) db.createObjectStore('queue', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return databasePromise
}

async function requestStore(storeName, mode, action) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode)
    const request = action(tx.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const readSnapshot = (userId, key) => requestStore('snapshots', 'readonly', (store) => store.get(`${userId}:${key}`))
export const writeSnapshot = (userId, key, value) => requestStore('snapshots', 'readwrite', (store) => store.put(value, `${userId}:${key}`))
export const enqueueOfflineChange = (userId, type, payload) => requestStore('queue', 'readwrite', (store) => store.put({ id: createUuid(), userId, type, payload, createdAt: Date.now() }))
export async function pendingOfflineChanges(userId) {
  const all = await requestStore('queue', 'readonly', (store) => store.getAll())
  return all.filter((entry) => entry.userId === userId).sort((a, b) => a.createdAt - b.createdAt)
}
export const removeOfflineChange = (id) => requestStore('queue', 'readwrite', (store) => store.delete(id))
