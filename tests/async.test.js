import assert from 'node:assert/strict'
import test from 'node:test'
import { withTimeout } from '../src/lib/async.js'

test('permintaan yang menggantung berakhir dengan error informatif', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}), 'Koleksi timeout.', 5), /Koleksi timeout/)
})
