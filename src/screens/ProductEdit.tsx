import { useState, useEffect, useRef, forwardRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Btn } from '../components/Btn'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import { writeProductImage, deleteProductImage } from '../lib/firestore'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted">
        {label}{required && <span className="text-danger ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const TextInput = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string }>(
  function TextInput({ value, onChange, placeholder, prefix }, ref) {
    return (
      <div className="flex items-center h-btn-md border border-border-strong rounded-md px-4 gap-2 bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
        {prefix && <span className="text-faint">{prefix}</span>}
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none text-text placeholder:text-faint"
        />
      </div>
    )
  }
)

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center h-10 border border-border-strong rounded-md overflow-hidden">
      <button onClick={() => onChange(Math.max(0, value - 1))} className="w-9 flex items-center justify-center text-muted hover:bg-bg transition-colors">−</button>
      <span className="flex-1 text-center text-sm font-bold tabular-nums">{value}</span>
      <button onClick={() => onChange(value + 1)} className="w-9 flex items-center justify-center text-muted hover:bg-bg transition-colors">＋</button>
    </div>
  )
}

export function ProductEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const backCategory = (location.state as { category?: string } | null)?.category
  const { products, stocks, upsertProduct, upsertStock, categories, makers, dealers, dealerReps, storeInfo, storeOrder } = useAppStore()

  const goBack = () => navigate('/products', { state: { category: backCategory } })
  const existing = id && id !== 'new' ? products.find((p) => p.id === id) : undefined

  type StockState = { currentStock: number; minStock: number; active: boolean }
  const [storeStocks, setStoreStocks] = useState<Record<string, StockState>>(() => {
    const result: Record<string, StockState> = {}
    storeOrder.forEach((sid) => {
      const s = existing ? stocks.find((st) => st.productId === existing.id && st.storeId === sid) : undefined
      result[sid] = { currentStock: s?.currentStock ?? 0, minStock: s?.minStock ?? 3, active: s?.active ?? true }
    })
    return result
  })

  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [maker, setMaker] = useState(existing?.maker ?? '')
  const [barcode, setBarcode] = useState(existing?.barcode ?? '')
  const [purchasePrice, setPurchasePrice] = useState(existing?.purchasePrice?.toString() ?? '')
  const [sellPrice, setSellPrice] = useState(existing?.sellPrice?.toString() ?? '')
  const [memo, setMemo] = useState(existing?.memo ?? '')
  const [taxRate, setTaxRate] = useState<8 | 10>(existing?.taxRate ?? 10)
  const [dealer, setDealer] = useState(existing?.dealer ?? '')
  const [dealerRep, setDealerRep] = useState(existing?.dealerRep ?? '')
  const [image, setImage] = useState(existing?.image ?? '')
  const [savedToast, setSavedToast] = useState(false)
  const [pendingNav, setPendingNav] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // doSave 後のレンダリング完了を待ってから遷移する
  useEffect(() => {
    if (pendingNav) {
      navigate('/products', { state: { category: backCategory }, replace: true })
    }
  }, [pendingNav]) // eslint-disable-line react-hooks/exhaustive-deps

  // useState の初期値は初回レンダリング時のみ評価されるため、
  // zustand の localStorage 復元後に確実に同期する
  useEffect(() => {
    if (!existing) return
    setName(existing.name)
    setCategory(existing.category)
    setMaker(existing.maker)
    setBarcode(existing.barcode)
    setPurchasePrice(existing.purchasePrice?.toString() ?? '')
    setSellPrice(existing.sellPrice?.toString() ?? '')
    setMemo(existing.memo ?? '')
    setTaxRate(existing.taxRate ?? 10)
    setImage(existing.image ?? '')
    setDealer(existing.dealer ?? '')
    setDealerRep(existing.dealerRep ?? '')

    const updated: Record<string, StockState> = {}
    storeOrder.forEach((sid) => {
      const s = stocks.find((st) => st.productId === existing.id && st.storeId === sid)
      updated[sid] = { currentStock: s?.currentStock ?? 0, minStock: s?.minStock ?? 3, active: s?.active ?? true }
    })
    setStoreStocks(updated)
  }, [existing?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const title = existing ? '商品登録・編集' : '商品登録・編集'

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new window.Image()
      img.onload = () => {
        const MAX = 600
        const side = Math.min(img.width, img.height)
        const size = Math.min(side, MAX) // 引き伸ばさない・大きければ縮小
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
        setImage(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function doSave(productId: string) {
    upsertProduct({
      id: productId, name, category, maker, barcode,
      purchasePrice: Number(purchasePrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      taxRate,
      image: image || undefined,
      memo,
      dealer: dealer || undefined,
      dealerRep: dealerRep || undefined,
    })
    storeOrder.forEach((sid) => {
      const ss = storeStocks[sid] ?? { currentStock: 0, minStock: 3, active: true }
      upsertStock({ productId, storeId: sid, currentStock: ss.currentStock, minStock: ss.minStock, active: ss.active })
    })
    // 画像は非同期でバックグラウンド同期（失敗しても商品データは保存済み）
    if (image?.startsWith('data:')) {
      writeProductImage(productId, image).catch((e) => console.warn('[画像同期失敗]', e))
    } else if (!image && existing) {
      deleteProductImage(productId).catch(() => {})
    }
  }

  const handleSave = () => {
    doSave(existing?.id ?? String(Date.now()))
    setPendingNav(true)
  }

  const handleSaveAndNext = () => {
    if (!name.trim()) { nameInputRef.current?.focus(); return }
    doSave(String(Date.now()))
    setName(''); setBarcode(''); setPurchasePrice(''); setSellPrice('')
    setMemo(''); setImage('')
    setStoreStocks((prev) =>
      Object.fromEntries(Object.entries(prev).map(([sid, ss]) => [sid, { ...ss, currentStock: 0 }]))
    )
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 1800)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar
        title={title}
        back
        onBack={goBack}
        showStoreSwitch={false}
        right={
          <div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={goBack}>キャンセル</Btn>
            {!existing && (
              <Btn variant="ghost" size="sm" onClick={handleSaveAndNext}>＋ 次へ</Btn>
            )}
            <Btn variant="primary" size="sm" onClick={handleSave}>✓ 保存</Btn>
          </div>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-bg">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-5">
            {/* 左カラム: 画像＋バーコード */}
            <div className="flex flex-col gap-3">
              {/* 商品画像 */}
              <div className="bg-surface border border-border rounded-lg p-5">
                <Field label="商品画像">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFile}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative h-48 rounded-md border border-dashed border-border-strong flex flex-col items-center justify-center gap-2 cursor-pointer active:opacity-70 overflow-hidden"
                    style={image ? {} : { background: 'repeating-linear-gradient(45deg, #F1F1EE 0 8px, #E8E8E4 8px 16px)' }}
                  >
                    {image ? (
                      <img src={image} alt="商品画像" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <span className="text-2xl text-muted">＋</span>
                        <span className="text-sm text-muted">タップして画像を追加</span>
                      </>
                    )}
                  </div>
                  {image && (
                    <button
                      onClick={() => setImage('')}
                      className="mt-2 text-xs text-danger underline"
                    >
                      画像を削除
                    </button>
                  )}
                </Field>
              </div>

              {/* バーコード */}
              <div className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-3">
                <Field label="バーコード" required>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center h-btn-md border border-border-strong rounded-md px-4 bg-surface">
                      <input
                        value={barcode}
                        onChange={(e) => setBarcode(e.target.value)}
                        placeholder="スキャンするか手入力"
                        className="flex-1 text-sm font-mono outline-none text-text placeholder:text-faint bg-transparent"
                      />
                    </div>
                    <Btn variant="ghost" size="sm">▦ スキャン</Btn>
                  </div>
                </Field>
                {barcode && (
                  <>
                    <div
                      className="h-14 rounded-md opacity-85"
                      style={{ background: 'repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 6px, #000 6px 8px, transparent 8px 14px)' }}
                    />
                    <p className="text-2xs text-center text-faint font-mono tracking-widest">{barcode}</p>
                  </>
                )}
              </div>
            </div>

            {/* 右カラム: フォーム */}
            <div className="bg-surface border border-border rounded-lg p-4 md:p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="商品名" required>
                    <TextInput ref={nameInputRef} value={name} onChange={setName} placeholder="商品名を入力" />
                  </Field>
                </div>

                <Field label="カテゴリ" required>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-btn-md border border-border-strong rounded-md px-4 text-sm bg-surface text-text outline-none focus:border-accent"
                  >
                    <option value="">選択してください</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>

                <Field label="メーカー">
                  <select
                    value={maker}
                    onChange={(e) => setMaker(e.target.value)}
                    className="h-btn-md border border-border-strong rounded-md px-4 text-sm bg-surface text-text outline-none focus:border-accent"
                  >
                    <option value="">選択してください</option>
                    {makers.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>

                <Field label="仕入価格 (税抜)">
                  <TextInput value={purchasePrice} onChange={setPurchasePrice} prefix="¥" placeholder="0" />
                </Field>

                <Field label="販売価格 (税抜)">
                  <TextInput value={sellPrice} onChange={setSellPrice} prefix="¥" placeholder="0" />
                </Field>

                {/* 税率設定 */}
                <div className="col-span-2">
                  <Field label="税率">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setTaxRate(10)}
                        className={`flex-1 h-10 rounded-md text-sm font-bold border-2 transition-colors ${
                          taxRate === 10
                            ? 'bg-accent text-white border-accent'
                            : 'bg-surface text-muted border-border'
                        }`}
                      >
                        10% 標準税率
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxRate(8)}
                        className={`flex-1 h-10 rounded-md text-sm font-bold border-2 transition-colors ${
                          taxRate === 8
                            ? 'bg-ok text-white border-ok'
                            : 'bg-surface text-muted border-border'
                        }`}
                      >
                        8% 軽減税率
                      </button>
                    </div>
                  </Field>
                </div>

                {/* 税込プレビュー */}
                {(Number(purchasePrice) > 0 || Number(sellPrice) > 0) && (
                  <div className="col-span-2 rounded-lg bg-bg border border-border p-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xs text-faint mb-0.5">仕入 税込 ({taxRate}%)</p>
                      <p className="text-base font-bold tabular-nums">
                        ¥{Math.round(Number(purchasePrice) * (taxRate === 10 ? 1.1 : 1.08)).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xs text-faint mb-0.5">販売 税込 ({taxRate}%)</p>
                      <p className="text-base font-bold tabular-nums text-accent">
                        ¥{Math.round(Number(sellPrice) * (taxRate === 10 ? 1.1 : 1.08)).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* 店舗別在庫設定 */}
                <div className="col-span-2 pt-3 border-t border-border">
                  <p className="text-sm font-bold mb-3">店舗別の在庫設定</p>
                  <div className="grid grid-cols-2 gap-3">
                    {storeOrder.map((sid) => {
                      const info = storeInfo[sid]
                      const ss = storeStocks[sid] ?? { currentStock: 0, minStock: 3, active: true }
                      const hex = info?.color ?? '#888888'
                      const bg = hex + '22'
                      const border = hex + '55'
                      return (
                        <div key={sid} className={`rounded-lg p-3.5 border transition-opacity ${ss.active ? '' : 'opacity-50'}`} style={{ background: bg, borderColor: border }}>
                          <div className="flex items-center gap-1.5 mb-3">
                            <StoreDot store={sid} />
                            <span className="text-xs font-bold" style={{ color: hex }}>{info?.name ?? sid}</span>
                          </div>
                          <div className={`grid grid-cols-2 gap-2 mb-2 ${!ss.active ? 'pointer-events-none' : ''}`}>
                            <Field label="現在庫">
                              <NumberInput value={ss.currentStock} onChange={(v) => setStoreStocks((prev) => ({ ...prev, [sid]: { ...ss, currentStock: v } }))} />
                            </Field>
                            <Field label="下限">
                              <NumberInput value={ss.minStock} onChange={(v) => setStoreStocks((prev) => ({ ...prev, [sid]: { ...ss, minStock: v } }))} />
                            </Field>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStoreStocks((prev) => ({ ...prev, [sid]: { ...ss, active: !ss.active } }))}
                            className="flex items-center gap-2 text-xs text-muted cursor-pointer"
                          >
                            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors ${ss.active ? 'text-white' : 'border-border-strong bg-surface text-transparent'}`} style={ss.active ? { borderColor: hex, background: hex } : {}}>✓</span>
                            この店舗で取り扱う
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* ディーラー */}
                <Field label="ディーラー">
                  <select
                    value={dealer}
                    onChange={(e) => setDealer(e.target.value)}
                    className="h-btn-md border border-border-strong rounded-md px-4 text-sm bg-surface text-text outline-none focus:border-accent"
                  >
                    <option value="">選択してください</option>
                    {dealers.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>

                <Field label="ディーラー担当">
                  <select
                    value={dealerRep}
                    onChange={(e) => setDealerRep(e.target.value)}
                    className="h-btn-md border border-border-strong rounded-md px-4 text-sm bg-surface text-text outline-none focus:border-accent"
                  >
                    <option value="">選択してください</option>
                    {dealerReps.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>

                {/* メモ */}
                <div className="col-span-2">
                  <Field label="メモ (任意)">
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="備考を入力"
                      className="min-h-[72px] border border-border-strong rounded-md p-3.5 text-sm bg-surface text-text outline-none resize-none focus:border-accent placeholder:text-faint"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-text text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg pointer-events-none">
          登録しました ✓
        </div>
      )}
    </div>
  )
}
