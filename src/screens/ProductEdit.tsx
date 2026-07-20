import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Btn } from '../components/Btn'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import { uploadProductImage } from '../lib/storage'

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

function TextInput({ value, onChange, placeholder, prefix }: { value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string }) {
  return (
    <div className="flex items-center h-btn-md border border-border-strong rounded-md px-4 gap-2 bg-surface focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10">
      {prefix && <span className="text-faint">{prefix}</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm bg-transparent outline-none text-text placeholder:text-faint"
      />
    </div>
  )
}

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
  const { products, stocks, upsertProduct, upsertStock } = useAppStore()

  const goBack = () => navigate('/products', { state: { category: backCategory } })
  const existing = id && id !== 'new' ? products.find((p) => p.id === id) : undefined
  const existingFlagStock = existing ? stocks.find((s) => s.productId === existing.id && s.storeId === 'flag') : undefined
  const existingLienStock = existing ? stocks.find((s) => s.productId === existing.id && s.storeId === 'lien') : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [maker, setMaker] = useState(existing?.maker ?? '')
  const [barcode, setBarcode] = useState(existing?.barcode ?? '')
  const [purchasePrice, setPurchasePrice] = useState(existing?.purchasePrice?.toString() ?? '')
  const [sellPrice, setSellPrice] = useState(existing?.sellPrice?.toString() ?? '')
  const [flagStock, setFlagStock] = useState(existingFlagStock?.currentStock ?? 0)
  const [flagMin, setFlagMin] = useState(existingFlagStock?.minStock ?? 3)
  const [flagActive, setFlagActive] = useState(existingFlagStock?.active ?? true)
  const [lienStock, setLienStock] = useState(existingLienStock?.currentStock ?? 0)
  const [lienMin, setLienMin] = useState(existingLienStock?.minStock ?? 3)
  const [lienActive, setLienActive] = useState(existingLienStock?.active ?? true)
  const [memo, setMemo] = useState(existing?.memo ?? '')
  const [taxRate, setTaxRate] = useState<8 | 10>(existing?.taxRate ?? 10)
  const [image, setImage] = useState(existing?.image ?? '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    const fStock = stocks.find((s) => s.productId === existing.id && s.storeId === 'flag')
    const lStock = stocks.find((s) => s.productId === existing.id && s.storeId === 'lien')
    if (fStock) { setFlagStock(fStock.currentStock); setFlagMin(fStock.minStock); setFlagActive(fStock.active) }
    if (lStock) { setLienStock(lStock.currentStock); setLienMin(lStock.minStock); setLienActive(lStock.active) }
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

  const handleSave = async () => {
    setUploading(true)
    const productId = existing?.id ?? String(Date.now())
    try {
      let finalImage = image || undefined
      // base64 画像なら Firebase Storage にアップロードして URL に変換
      if (image?.startsWith('data:')) {
        finalImage = await uploadProductImage(productId, image)
      }
      upsertProduct({
        id: productId,
        name,
        category,
        maker,
        barcode,
        purchasePrice: Number(purchasePrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        taxRate,
        image: finalImage,
        memo,
      })
      upsertStock({ productId, storeId: 'flag', currentStock: flagStock, minStock: flagMin, active: flagActive })
      upsertStock({ productId, storeId: 'lien', currentStock: lienStock, minStock: lienMin, active: lienActive })
      goBack()
    } catch (e) {
      console.error('[画像アップロード失敗]', e)
      alert('画像のアップロードに失敗しました。Firebase Storage のルールを確認してください。')
      setUploading(false)
    }
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
            <Btn variant="ghost" size="sm" onClick={goBack} disabled={uploading}>キャンセル</Btn>
            <Btn variant="primary" size="sm" onClick={handleSave} disabled={uploading}>
              {uploading ? '保存中...' : '✓ 保存'}
            </Btn>
          </div>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto p-6 bg-bg">
          <div className="grid grid-cols-[1fr_1.4fr] gap-5 h-full">
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
                    onClick={() => !uploading && fileInputRef.current?.click()}
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
                    {uploading && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="text-xs text-white font-semibold">アップロード中...</span>
                      </div>
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
            <div className="bg-surface border border-border rounded-lg p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="商品名" required>
                    <TextInput value={name} onChange={setName} placeholder="商品名を入力" />
                  </Field>
                </div>

                <Field label="カテゴリ" required>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-btn-md border border-border-strong rounded-md px-4 text-sm bg-surface text-text outline-none focus:border-accent"
                  >
                    <option value="">選択してください</option>
                    {[
                      'カラー剤', 'ブリーチ剤', 'カラーオキシ',
                      'パーマ剤', 'プレックス剤', '髪ドラ',
                      'oggi otto', 'H2', '処理剤', '小物類',
                      'シャンプー', 'トリートメント', 'アウトバスTR', 'スタイリング', 'オイル',
                    ].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>

                <Field label="メーカー">
                  <select
                    value={maker}
                    onChange={(e) => setMaker(e.target.value)}
                    className="h-btn-md border border-border-strong rounded-md px-4 text-sm bg-surface text-text outline-none focus:border-accent"
                  >
                    <option value="">選択してください</option>
                    {[
                      'ナカノ', 'フィヨーレ', 'テクノエイト', 'ルベル', '資生堂',
                      'シュワルツコフ', 'ウェラ', 'ミルボン', 'アリミノ', 'ロレアル',
                      'ナプラ', '田村治照堂', 'デミコスメティック', 'タマリス', 'b-ex',
                      'ナンバースリー', 'ワイマック', 'ホーユー', 'ピュアセラボ', 'パイモア',
                      'ミアン', 'ハホニコ', 'MADENA', 'アンダー７', 'STRI',
                      'MTG', 'STELLA', 'アマトラ', 'マーキュリー', 'TIME',
                      'サンコール', 'GO-ON', 'LOA', '髪ドラ',
                    ].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
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
                    {/* flag */}
                    <div className={`rounded-lg p-3.5 border transition-opacity ${flagActive ? '' : 'opacity-50'}`} style={{ background: '#E6EEF9', borderColor: '#BFD3EC' }}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <StoreDot store="flag" />
                        <span className="text-xs font-bold text-flag">flag 美容室</span>
                      </div>
                      <div className={`grid grid-cols-2 gap-2 mb-2 ${!flagActive ? 'pointer-events-none' : ''}`}>
                        <Field label="現在庫">
                          <NumberInput value={flagStock} onChange={setFlagStock} />
                        </Field>
                        <Field label="下限">
                          <NumberInput value={flagMin} onChange={setFlagMin} />
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFlagActive((v) => !v)}
                        className="flex items-center gap-2 text-xs text-muted cursor-pointer"
                      >
                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors ${flagActive ? 'border-flag bg-flag text-white' : 'border-border-strong bg-surface text-transparent'}`}>✓</span>
                        この店舗で取り扱う
                      </button>
                    </div>

                    {/* lien */}
                    <div className={`rounded-lg p-3.5 border transition-opacity ${lienActive ? '' : 'opacity-50'}`} style={{ background: '#F1E8F5', borderColor: '#DDC3E6' }}>
                      <div className="flex items-center gap-1.5 mb-3">
                        <StoreDot store="lien" />
                        <span className="text-xs font-bold text-lien">Lien 美容室</span>
                      </div>
                      <div className={`grid grid-cols-2 gap-2 mb-2 ${!lienActive ? 'pointer-events-none' : ''}`}>
                        <Field label="現在庫">
                          <NumberInput value={lienStock} onChange={setLienStock} />
                        </Field>
                        <Field label="下限">
                          <NumberInput value={lienMin} onChange={setLienMin} />
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLienActive((v) => !v)}
                        className="flex items-center gap-2 text-xs text-muted cursor-pointer"
                      >
                        <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs transition-colors ${lienActive ? 'border-lien bg-lien text-white' : 'border-border-strong bg-surface text-transparent'}`}>✓</span>
                        この店舗で取り扱う
                      </button>
                    </div>
                  </div>
                </div>

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
    </div>
  )
}
