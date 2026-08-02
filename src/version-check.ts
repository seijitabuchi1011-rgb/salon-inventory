const VERSION_KEY = 'salon-app-version'
const BASE = import.meta.env.BASE_URL ?? '/'

// URL に _v= パラメータがあれば除去（リロード後のクリーンアップ）
const url = new URL(window.location.href)
if (url.searchParams.has('_v')) {
  url.searchParams.delete('_v')
  window.history.replaceState({}, '', url.toString())
}

export async function checkForUpdate() {
  try {
    const res = await fetch(`${BASE}version.txt?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const serverVer = (await res.text()).trim()
    const localVer = localStorage.getItem(VERSION_KEY)

    if (!localVer) {
      // 初回: バージョンを記録するだけ
      localStorage.setItem(VERSION_KEY, serverVer)
      return
    }

    if (localVer !== serverVer) {
      // 新バージョン検知: バージョンを更新してキャッシュバスト付きでリロード
      localStorage.setItem(VERSION_KEY, serverVer)
      const fresh = new URL(window.location.href)
      fresh.searchParams.set('_v', serverVer)
      window.location.replace(fresh.toString())
    }
  } catch {
    // オフライン時は無視
  }
}
