import emailjs from '@emailjs/browser'

emailjs.init({ publicKey: '0zmlBqpulcs_JyUk9' })

export function sendNotification(title: string, message: string) {
  emailjs.send('salon_service', 'template_c8qegjm', {
    title,
    message,
    time: new Date().toLocaleString('ja-JP'),
  }).catch((e) => console.error('[EmailJS]', e))
}

type AlertItem = { productName: string; storeName: string; currentStock: number; minStock: number }

let _alertTimer: ReturnType<typeof setTimeout> | null = null
let _alertQueue: AlertItem[] = []

// 複数商品の在庫不足アラートを60秒待ってまとめて1通送信
export function queueLowStockAlert(item: AlertItem, minCount: number) {
  const idx = _alertQueue.findIndex(
    (a) => a.productName === item.productName && a.storeName === item.storeName
  )
  if (idx >= 0) { _alertQueue[idx] = item } else { _alertQueue.push(item) }

  if (_alertTimer) clearTimeout(_alertTimer)
  _alertTimer = setTimeout(() => {
    const items = _alertQueue.splice(0)
    _alertTimer = null
    if (items.length < minCount) return
    const title = `在庫不足アラート${items.length > 1 ? ` (${items.length}商品)` : ''}`
    const body = items
      .map((it) => `・${it.productName}　${it.currentStock}個（下限: ${it.minStock}個）　[${it.storeName}]`)
      .join('\n')
    sendNotification(title, `以下の商品の在庫が下限を下回りました。\n\n${body}`)
  }, 60000)
}
