export function withTimeout(promise, label = 'Permintaan terlalu lama. Coba lagi.', milliseconds = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), milliseconds)
    Promise.resolve(promise).then(resolve, reject).finally(() => clearTimeout(timer))
  })
}
