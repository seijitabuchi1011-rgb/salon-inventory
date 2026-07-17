import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { fetchJanProduct } from '../lib/jancode'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Btn } from '../components/Btn'

type ScanMode = '入荷' | '販売' | '検索' | '棚卸'

type ScanResult = {
  barcode: string
  name: string
  brand: string
  category: string
  imageUrl: string | null
  found: boolean
}

const SCANNER_ID = 'html5-qrcode-scanner'

export function Scan() {
  const [mode, setMode] = useState<ScanMode>('入荷')
  const [qty, setQty] = useState(1)
  const [showQty, setShowQty] = useState(false)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const cooldownRef = useRef(false)

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
    })
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: (w, h) => ({ width: Math.floor(w * 0.7), height: Math.floor(h * 0.4) }),
      },
      async (barcode) => {
        if (cooldownRef.current) return
        cooldownRef.current = true
        setLoading(true)

        const product = await fetchJanProduct(barcode)
        setLastScan({
          barcode,
          name: product.found ? product.name : `未登録商品`,
          brand: product.brand,
          category: product.category,
          imageUrl: product.imageUrl,
          found: product.found,
        })
        setLoading(false)
        setQty(1)
        setShowQty(true)

        setTimeout(() => { cooldownRef.current = false }, 2000)
      },
      () => {}
    ).catch(() => {
      setCameraError('カメラにアクセスできませんでした。\nブラウザの設定でカメラを許可してください。')
    })

    return () => { scanner.stop().catch(() => {}) }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="バーコード読み取り" back />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />

        <div className="flex-1 relative bg-[#1A1A1A] overflow-hidden">

          {/* カメラ映像コンテナ */}
          <div id={SCANNER_ID} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />

          {/* カメラエラー */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 bg-[#1A1A1A]">
              <div className="text-white text-center">
                <div className="text-4xl mb-3">📷</div>
                <p className="text-base font-semibold whitespace-pre-line">{cameraError}</p>
              </div>
              <Btn variant="ghost" className="bg-white" onClick={() => window.location.reload()}>再試行</Btn>
            </div>
          )}

          {/* API取得中オーバーレイ */}
          {loading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-30">
              <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white text-sm font-semibold">商品情報を取得中...</p>
            </div>
          )}

          {/* 上部モード切替 */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
            <div className="flex bg-white/95 rounded-xl p-1 gap-1">
              {(['入荷', '販売', '検索', '棚卸'] as ScanMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`h-10 px-5 rounded-lg text-sm font-bold transition-colors ${
                    mode === m ? 'bg-text text-white' : 'text-text hover:bg-bg'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* スキャン枠オーバーレイ */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="relative" style={{ width: 520, height: 320 }}>
              <div
                className="absolute inset-0 border-2 border-white rounded-xl"
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}
              />
              <div className="absolute top-[-3px] left-[-3px] w-10 h-10 border-accent border-t-[6px] border-l-[6px]" />
              <div className="absolute top-[-3px] right-[-3px] w-10 h-10 border-accent border-t-[6px] border-r-[6px]" />
              <div className="absolute bottom-[-3px] left-[-3px] w-10 h-10 border-accent border-b-[6px] border-l-[6px]" />
              <div className="absolute bottom-[-3px] right-[-3px] w-10 h-10 border-accent border-b-[6px] border-r-[6px]" />
              <div className="absolute left-5 right-5 top-1/2 h-0.5 bg-accent" style={{ boxShadow: '0 0 12px #4F4CE8' }} />
              <div className="absolute -bottom-10 left-0 right-0 text-center text-white text-sm font-semibold tracking-wide">
                枠内にバーコードを合わせてください
              </div>
            </div>
          </div>

          {/* 直近のスキャン結果 */}
          {lastScan && (
            <div className="absolute left-5 bottom-5 right-60 bg-white rounded-xl p-3.5 flex items-center gap-3.5 z-10">
              {lastScan.imageUrl ? (
                <img
                  src={lastScan.imageUrl}
                  className="w-14 h-14 rounded-lg flex-shrink-0 object-cover border border-border"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-14 h-14 rounded-lg flex-shrink-0" style={{ background: 'repeating-linear-gradient(45deg,#F1F1EE 0 6px,#E8E8E4 6px 12px)' }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-2xs text-faint font-semibold">直前のスキャン</p>
                <p className={`text-md font-bold truncate ${lastScan.found ? 'text-text' : 'text-muted'}`}>
                  {lastScan.name}
                </p>
                <p className="text-xs text-muted">
                  {lastScan.barcode}
                  {lastScan.brand ? ` · ${lastScan.brand}` : ''}
                  {!lastScan.found && ' · 商品登録が必要です'}
                </p>
              </div>
              <button
                onClick={() => setShowQty(true)}
                className="flex-shrink-0 h-btn-md px-5 bg-accent text-white text-sm font-bold rounded-md"
              >
                数量入力
              </button>
            </div>
          )}

          {/* 右下ボタン */}
          <div className="absolute right-5 bottom-5 flex flex-col gap-3 z-10">
            <Btn variant="ghost" size="lg" className="bg-white">⌨ 手入力で追加</Btn>
            <Btn variant="ghost" size="lg" className="bg-white">⚡ ライト</Btn>
          </div>

          {/* 数量入力モーダル */}
          {showQty && lastScan && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <div className="bg-white rounded-xl p-6 w-80">
                <p className="text-xs text-muted font-semibold mb-1">{mode}モード</p>
                <p className="text-base font-bold mb-1 truncate">{lastScan.name}</p>
                {lastScan.brand && (
                  <p className="text-xs text-muted mb-4">{lastScan.brand}</p>
                )}
                {!lastScan.brand && <div className="mb-4" />}
                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-16 h-16 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg"
                  >−</button>
                  <div className="flex-1 h-16 border border-border-strong rounded-md flex items-center justify-center text-4xl font-bold">
                    {qty}
                  </div>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-16 h-16 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg"
                  >＋</button>
                </div>
                <div className="flex gap-2">
                  <Btn variant="ghost" className="flex-1" onClick={() => setShowQty(false)}>キャンセル</Btn>
                  <Btn variant="primary" className="flex-[2]" onClick={() => setShowQty(false)}>✓ {mode}を確定</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
