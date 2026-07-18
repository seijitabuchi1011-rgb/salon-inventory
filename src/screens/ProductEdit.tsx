import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Btn } from '../components/Btn'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'

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
  const { products, upsertProduct, upsertStock } = useAppStore()
  const existing = id && id !== 'new' ? products.find((p) => p.id === id) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [maker, setMaker] = useState(existing?.maker ?? '')
  const [barcode, setBarcode] = useState(existing?.barcode ?? '')
  const [purchasePrice, setPurchasePrice] = useState(existing?.purchasePrice?.toString() ?? '')
  const [sellPrice, setSellPrice] = useState(existing?.sellPrice?.toString() ?? '')
  const [flagStock, setFlagStock] = useState(8)
  const [flagMin, setFlagMin] = useState(5)
  const [flagActive, setFlagActive] = useState(true)
  const [lienStock, setLienStock] = useState(3)
  const [lienMin, setLienMin] = useState(4)
  const [lienActive, setLienActive] = useState(true)
  const [memo, setMemo] = useState(existing?.memo ?? '')

  const title = existing ? '商品登録・編集' : '商品登録・編集'

  const handleSave = () => {
    const productId = existing?.id ?? String(Date.now())
    upsertProduct({
      id: productId,
      name,
      category,
      maker,
      barcode,
      purchasePrice: Number(purchasePrice) || 0,
      sellPrice: Number(sellPrice) || 0,
      memo,
    })
    upsertStock({ productId, storeId: 'flag', currentStock: flagStock, minStock: flagMin, active: flagActive })
    upsertStock({ productId, storeId: 'lien', currentStock: lienStock, minStock: lienMin, active: lienActive })
    navigate(-1)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar
        title={title}
        back
        showStoreSwitch={false}
        right={
          <div className="flex gap-2">
            <Btn variant="ghost" size="sm" onClick={() => navigate(-1)}>キャンセル</Btn>
            <Btn variant="primary" size="sm" onClick={handleSave}>✓ 保存</Btn>
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
                  <div
                    className="h-48 rounded-md border border-dashed border-border-strong flex items-center justify-center text-sm text-muted"
                    style={{ background: 'repeating-linear-gradient(45deg, #F1F1EE 0 8px, #E8E8E4 8px 16px)' }}
                  >
                    タップして画像を追加
                  </div>
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
                      'シャンプー', 'トリートメント', 'スタイリング', 'オイル',
                    ].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>

                <Field label="メーカー">
                  <TextInput value={maker} onChange={setMaker} placeholder="メーカー名" />
                </Field>

                <Field label="仕入価格 (税抜)">
                  <TextInput value={purchasePrice} onChange={setPurchasePrice} prefix="¥" placeholder="0" />
                </Field>

                <Field label="販売価格 (税抜)">
                  <TextInput value={sellPrice} onChange={setSellPrice} prefix="¥" placeholder="0" />
                </Field>

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
