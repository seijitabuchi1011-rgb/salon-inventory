import { useState, useRef } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreId } from '../types'

type Step = 'product' | 'confirm'


export function Wholesale() {
  const { products, stocks, storeOrder, storeInfo, staffMembers, categories, addTransaction, upsertStock, addStaffMember } = useAppStore()

  const [storeId, setStoreId] = useState<StoreId>(storeOrder[0] ?? '')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('すべて')
  const [selected, setSelected] = useState<{ id: string; name: string; sellPrice: number; category: string } | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [staffName, setStaffName] = useState('')
  const [staffInput, setStaffInput] = useState('')
  const [showStaffDrop, setShowStaffDrop] = useState(false)
  const [step, setStep] = useState<Step>('product')
  const [toast, setToast] = useState<string | null>(null)

  const staffRef = useRef<HTMLInputElement>(null)

  const filteredProducts = products
    .filter((p) => {
      const matchCat = categoryFilter === 'すべて' || p.category === categoryFilter
      const matchSearch = search.length === 0 || p.name.toLowerCase().includes(search.toLowerCase())
      return matchCat && matchSearch
    })
    .slice(0, 30)

  const filteredStaff = staffMembers.filter((m) =>
    m.toLowerCase().includes(staffInput.toLowerCase())
  )

  const stock = selected ? (stocks.find((s) => s.productId === selected.id && s.storeId === storeId)?.currentStock ?? 0) : 0

  function selectProduct(p: { id: string; name: string; sellPrice: number; category: string }) {
    setSelected(p)
    setSearch(p.name)
    setQuantity(1)
  }

  function goConfirm() {
    if (!selected) return
    setStep('confirm')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function handleConfirm() {
    if (!selected || !staffName) return
    addTransaction({
      type: 'dispense',
      productId: selected.id,
      storeId,
      quantity,
      dispensedBy: staffName,
    })
    const s = stocks.find((st) => st.productId === selected.id && st.storeId === storeId)
    upsertStock({
      productId: selected.id,
      storeId,
      currentStock: Math.max(0, (s?.currentStock ?? 0) - quantity),
      minStock: s?.minStock ?? 3,
      active: s?.active ?? true,
    })
    if (staffName && !staffMembers.includes(staffName)) {
      addStaffMember(staffName)
    }
    showToast(`✓ ${selected.name} × ${quantity} を ${staffName} さんに卸しました`)
    setSelected(null)
    setSearch('')
    setQuantity(1)
    setStaffName('')
    setStaffInput('')
    setStep('product')
  }

  function handleBack() {
    setStep('product')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="店舗に卸す" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* 店舗選択 */}
          <div className="bg-surface border-b border-border px-4 md:px-6 py-3 flex gap-2 overflow-x-auto flex-shrink-0">
            {storeOrder.map((s) => {
              const active = storeId === s
              const color = storeInfo[s]?.color ?? '#888'
              return (
                <button key={s}
                  onClick={() => setStoreId(s as StoreId)}
                  className="flex-shrink-0 flex items-center gap-2 px-4 h-9 rounded-full text-sm font-bold border-2 transition-all"
                  style={active
                    ? { borderColor: color, backgroundColor: color, color: '#fff' }
                    : { borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--surface)' }}>
                  <StoreDot store={s} size="sm" />
                  {storeInfo[s]?.name ?? s}
                </button>
              )
            })}
          </div>

          {/* ===== STEP 1: 商品選択 ===== */}
          {step === 'product' && (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* 商品検索 */}
              <div className="px-4 md:px-6 pt-4 pb-2 flex-shrink-0">
                <p className="text-xs font-semibold text-muted mb-2">① 商品を選択</p>
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); if (selected && e.target.value !== selected.name) setSelected(null) }}
                  placeholder="商品名で検索..."
                  className="w-full h-11 border-2 border-border-strong rounded-xl px-4 text-sm bg-surface text-text outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* 選択済み商品カード */}
              {selected && (
                <div className="px-4 md:px-6 pb-2 flex-shrink-0">
                  <div className="rounded-xl border-2 border-accent bg-accent-soft p-4 flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-base font-bold text-text">{selected.name}</p>
                      <p className="text-xs text-muted mt-0.5">{selected.category}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted">
                          現在庫: <span className={`font-bold ${stock <= 0 ? 'text-danger' : 'text-text'}`}>{stock}個</span>
                        </span>
                        <span className="text-xs text-muted">
                          売価: <span className="font-bold text-text">¥{selected.sellPrice.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                    <button onClick={() => { setSelected(null); setSearch('') }}
                      className="text-muted hover:text-text text-sm px-2 py-1">✕</button>
                  </div>

                  {/* 数量 */}
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-muted mb-2">② 数量</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-12 h-12 border-2 border-border-strong rounded-xl text-2xl font-bold text-muted hover:bg-surface transition-colors flex items-center justify-center">
                        −
                      </button>
                      <div className="flex-1 h-12 border-2 border-accent rounded-xl flex items-center justify-center text-2xl font-bold text-accent">
                        {quantity}
                      </div>
                      <button
                        onClick={() => setQuantity((q) => q + 1)}
                        className="w-12 h-12 border-2 border-border-strong rounded-xl text-2xl font-bold text-muted hover:bg-surface transition-colors flex items-center justify-center">
                        ＋
                      </button>
                    </div>
                    {quantity > stock && stock > 0 && (
                      <p className="text-xs text-danger mt-1.5">在庫数（{stock}個）を超えています</p>
                    )}
                    {stock <= 0 && (
                      <p className="text-xs text-danger mt-1.5">在庫がありません</p>
                    )}
                  </div>

                  {/* 次へボタン */}
                  <button
                    onClick={goConfirm}
                    disabled={quantity <= 0}
                    className="mt-4 w-full h-12 rounded-xl bg-accent text-white font-bold text-base disabled:opacity-40 transition-opacity">
                    次へ → スタッフ名を入力
                  </button>
                </div>
              )}

              {/* カテゴリタグ */}
              {!selected && (
                <div className="px-4 md:px-6 pb-2 flex gap-1.5 overflow-x-auto flex-shrink-0">
                  {['すべて', ...categories].map((cat) => (
                    <button key={cat} onClick={() => setCategoryFilter(cat)}
                      className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-bold transition-colors ${categoryFilter === cat ? 'bg-accent text-white' : 'bg-surface text-muted border border-border'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* 商品リスト */}
              {!selected && (
                <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-4">
                  <div className="grid grid-cols-1 gap-2">
                    {filteredProducts.map((p) => {
                      const s = stocks.find((st) => st.productId === p.id && st.storeId === storeId)
                      const currentStock = s?.currentStock ?? 0
                      return (
                        <button key={p.id}
                          onClick={() => selectProduct(p)}
                          className="w-full text-left rounded-xl border border-border bg-surface hover:border-accent hover:bg-accent-soft transition-all p-3 flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text truncate">{p.name}</p>
                            <p className="text-xs text-muted mt-0.5">{p.category}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold tabular-nums ${currentStock <= 0 ? 'text-danger' : 'text-text'}`}>
                              {currentStock}個
                            </p>
                            <p className="text-xs text-faint">¥{p.sellPrice.toLocaleString()}</p>
                          </div>
                        </button>
                      )
                    })}
                    {filteredProducts.length === 0 && (
                      <div className="text-center py-12 text-muted">
                        <p className="text-sm">「{search}」に一致する商品が見つかりません</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 2: スタッフ名入力・確認 ===== */}
          {step === 'confirm' && selected && (
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5 flex flex-col gap-5 max-w-lg">

              {/* 卸す内容サマリー */}
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-semibold text-muted mb-3">卸す内容</p>
                <div className="flex items-center gap-3">
                  <StoreDot store={storeId} size="md" />
                  <div className="flex-1">
                    <p className="text-base font-bold text-text">{selected.name}</p>
                    <p className="text-xs text-muted">{selected.category} · {storeInfo[storeId]?.name ?? storeId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-accent">{quantity}</p>
                    <p className="text-xs text-muted">個</p>
                  </div>
                </div>
              </div>

              {/* スタッフ名 */}
              <div>
                <p className="text-xs font-semibold text-muted mb-2">③ スタッフ名 <span className="text-danger">*必須</span></p>
                <div className="relative">
                  <input
                    ref={staffRef}
                    value={staffInput}
                    onChange={(e) => { setStaffInput(e.target.value); setStaffName(e.target.value) }}
                    onFocus={() => setShowStaffDrop(true)}
                    onBlur={() => setTimeout(() => setShowStaffDrop(false), 150)}
                    placeholder="名前を入力または選択"
                    className="w-full h-12 border-2 border-border-strong rounded-xl px-4 text-base bg-surface text-text outline-none focus:border-accent transition-colors"
                  />
                  {showStaffDrop && staffMembers.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                      {filteredStaff.map((m) => (
                        <button key={m}
                          onMouseDown={() => { setStaffInput(m); setStaffName(m); setShowStaffDrop(false) }}
                          className="w-full text-left px-4 py-3 text-sm font-medium hover:bg-bg border-b border-border last:border-0">
                          {m}
                        </button>
                      ))}
                      {filteredStaff.length === 0 && staffInput.length > 0 && (
                        <div className="px-4 py-3 text-sm text-muted">「{staffInput}」を新規追加</div>
                      )}
                    </div>
                  )}
                </div>
                {staffName && (
                  <p className="text-xs text-accent mt-1.5">✓ {staffName} さんへ卸す</p>
                )}
              </div>

              {/* ボタン */}
              <div className="flex gap-3">
                <button onClick={handleBack}
                  className="flex-1 h-12 rounded-xl border-2 border-border text-sm font-bold text-muted hover:bg-surface transition-colors">
                  ← 戻る
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!staffName.trim()}
                  className="flex-[2] h-12 rounded-xl bg-accent text-white font-bold text-base disabled:opacity-40 transition-opacity">
                  確定して卸す
                </button>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-text text-surface text-sm font-semibold px-5 py-3 rounded-xl shadow-xl z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}
