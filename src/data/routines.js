export const routinePlans = {
  morning: {
    label: 'Pagi', subtitle: 'Mulai hari dengan lembut', estimatedTime: '5 menit',
    steps: [
      { id: 'am-cleanser', productId: 'cloud-cleanser', name: 'Cloud Cleanser', detail: 'Bersihkan dengan air hangat' },
      { id: 'am-toner', productId: 'milky-toner', name: 'Milky Hydrating Toner', detail: 'Tepuk lembut hingga meresap' },
      { id: 'am-serum', productId: 'calm-serum', name: 'Calm & Collect Serum', detail: '2–3 tetes untuk seluruh wajah' },
      { id: 'am-sunscreen', productId: 'daily-veil', name: 'Daily Veil SPF 50', detail: 'Langkah terakhir sebelum beraktivitas' },
    ],
  },
  evening: {
    label: 'Malam', subtitle: 'Waktu untuk memulihkan kulit', estimatedTime: '7 menit',
    steps: [
      { id: 'pm-balm', productId: 'soft-balm', name: 'Soft Reset Cleansing Balm', detail: 'Pijat pada kulit kering lalu bilas' },
      { id: 'pm-cleanser', productId: 'cloud-cleanser', name: 'Cloud Cleanser', detail: 'Bersihkan sisa kotoran dengan lembut' },
      { id: 'pm-toner', productId: 'milky-toner', name: 'Milky Hydrating Toner', detail: 'Lapiskan hidrasi pada kulit' },
      { id: 'pm-serum', productId: 'calm-serum', name: 'Calm & Collect Serum', detail: 'Beri waktu untuk meresap' },
      { id: 'pm-mask', productId: 'sleeping-mask', name: 'Petal Sleep Mask', detail: 'Gunakan 2–3 kali dalam seminggu' },
    ],
  },
}

export const weeklySummary = { completed: 11, total: 14, streak: 5 }

export const initialCompletedSteps = { 'am-cleanser': true, 'am-toner': true }
