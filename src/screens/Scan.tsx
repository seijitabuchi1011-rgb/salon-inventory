import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Btn } from '../components/Btn'

type ScanMode = '入荷' | '販売' | '検索' | '棚卸'

type ScanResult = {
  barcode: string
  name: string
  flagStock: number
  lienStock: number
}

const PRODUCT_DB: Record<string, Omit<ScanResult, 'barcode'>> = {
  '4901234567890': { name: 'ミルボン ジェミールフラン シャンプー 500ml', flagStock: 8, lienStock: 3 },
  '4989316012345': { name: 'ナプラ ケアテクトHB カラーシャンプー 300ml', flagStock: 0, lienStock: 4 },
  '4901862012345': { name: 'ケラスターゼ フォンダン トリートメント', flagStock: 12, lienStock: 6 },
}

const SCANNER_ID = 'html5-qrcode-scanner'

export function Scan() {
  const [mode, setMode] = useState<ScanMode>('入荷')
  const [qty, setQty] = useState(1)
  const [showQty, setShowQty] = useState(false)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const scannerRef = useRef<Html5Qrcode | null>(null)
  const cooldownRef = useRef(false)

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ID)
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' }, // 背面カメラを優先
      { fps: 10, qrbox: { width: 280, height: 180 } },
      (decodedText) => {
        if (cooldownRef.current) return
        cooldownRef.current = true

        const product = PRODUCT_DB[decodedText]
        setLastScan({
          barcode: decodedText,
          name: product?.name ?? `不明な商品 (${decodedText})`,
          flagStock: product?.flagStock ?? 0,
          lienStock: product?.lienStock ?? 0,
        })
        setQty(1)
        setShowQty(true)
        setTimeout(() => { cooldownRef.current = false }, 2000)
      },
      () => { /* スキャン試行中のエラーは無視 */ }
    ).catch(() => {
      setCameraError('カメラにアクセスできませんでした。\nブラウザの設定でカメラを許可してください。')
    })

    return () => {
      scanner.stop().catch(() => {})
    }
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="バーコード読み取り" back />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />

        <div className="flex-1 relative bg-[#1A1A1A] overflow-hidden">

          {/* html5-qrcode がカメラ映像を描画するコンテナ */}
          <div
            id={SCANNER_ID}
            className="absolute inset-0"
            style={{ width: '100%', height: '100%' }}
          />

          {/* カメラエラー */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 bg-[#1A1A1A]">
              <div className="text-white text-center">
                <div className="text-4xl mb-3">📷</div>
                <p className="text-base font-semibold whitespace-pre-line">{cameraError}</p>
              </div>
              <Btn variant="ghost" className="bg-white" onClick={() => window.location.reload()}>
                再試行
              </Btn>
            </div>
          )}

          {/* 上部モード切替 */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
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
              <div
                className="absolute left-5 right-5 top-1/2 h-0.5 bg-accent"
                style={{ boxShadow: '0 0 12px #4F4CE8' }}
              />
              <div className="absolute -bottom-10 left-0 right-0 text-center text-white text-sm font-semibold tracking-wide">
                枠内にバーコードを合わせてください
              </div>
            </div>
          </div>

          {/* 直近のスキャン結果 */}
          {lastScan && (
            <div className="absolute left-5 bottom-5 right-60 bg-white rounded-xl p-3.5 flex items-center gap-3.5 z-10">
              <div
                className="w-14 h-14 rounded-lg flex-shrink-0"
                style={{ background: 'repeating-linear-gradient(45deg, #F1F1EE 0 6px, #E8E8E4 6px 12px)' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-2xs text-faint font-semibold">直前のスキャン</p>
                <p className="text-md font-bold text-text truncate">{lastScan.name}</p>
                <p className="text-xs text-muted">
                  {lastScan.barcode} · flag {lastScan.flagStock} / Lien {lastScan.lienStock}
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
                <p className="text-base font-bold mb-4 truncate">{lastScan.name}</p>
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
