import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreId } from '../types'

function taxIncluded(price: number, rate: 8 | 10) {
  return Math.round(price * (rate === 10 ? 1.1 : 1.08))
}

type FormState = {
  date: string
  productId: string
  productSearch: string
  quantity: number
  purchasedBy: string
  recordedBy: string
  storeId: StoreId
}

const BLANK_FORM = (): FormState => ({
  date: new Date().toISOString().slice(0, 10),
  productId: '',
  productSearch: '',
  quantity: 1,
  purchasedBy: '',
  recordedBy: '',
  storeId: 'flag',
})

export function StaffScreen() {
  const { products, staffPurchases, addStaffPurchase, staffMembers, addStaffMember } = useAppStore()

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(BLANK_FORM())
  const [showProductDrop, setShowProductDrop] = useState(false)
  const [showBuyerDrop, setShowBuyerDrop] = useState(false)
  const [showRecorderDrop, setShowRecorderDrop] = useState(false)

  const selectedProduct = form.productId ? products.find((p) => p.id === form.productId) : null

  const dropProducts = form.productSearch.length > 0
    ? products.filter((p) => p.name.toLowerCase().includes(form.productSearch.toLowerCase())).slice(0, 10)
    : products.slice(0, 20)

  const buyerSuggestions = staffMembers.filter((m) =>
    m.toLowerCase().includes(form.purchasedBy.toLowerCase()) && m !== form.purchasedBy
  )
  const recorderSuggestions = staffMembers.filter((m) =>
    m.toLowerCase().includes(form.recordedBy.toLowerCase()) && m !== form.recordedBy
  )

  function openModal() {
    setForm(BLANK_FORM())
    setShowProductDrop(false)
    setShowBuyerDrop(false)
    setShowRecorderDrop(false)
    setShowModal(true)
  }
  function closeModal() { setShowModal(false) }

  function handleSubmit() {
    if (!form.productId || !selectedProduct || !form.purchasedBy || !form.recordedBy) return
    if (form.purchasedBy && !staffMembers.includes(form.purchasedBy)) addStaffMember(form.purchasedBy)
    if (form.recordedBy && !staffMembers.includes(form.recordedBy)) addStaffMember(form.recordedBy)
    addStaffPurchase({
      date: form.date,
      productId: form.productId,
      quantity: form.quantity,
      sellPriceAtPurchase: selectedProduct.sellPrice,
      taxRate: selectedProduct.taxRate ?? 10,
      purchasedBy: form.purchasedBy,
      recordedBy: form.recordedBy,
      storeId: form.storeId,
    })
    closeModal()
  }

  const canSubmit = !!form.productId && !!form.purchasedBy && !!form.recordedBy && form.quantity > 0

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="スタッフ購入履歴" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* ヘッダー */}
          <div className="px-6 pt-5 pb-4 bg-surface border-b border-border flex items-center gap-3">
            <div>
              <p className="text-2xs text-faint">スタッフ購入 合計件数</p>
              <p className="text-3xl font-bold text-text">{staffPurchases.length} 件</p>
            </div>
            <div className="flex-1" />
            <Btn variant="primary" size="sm" onClick={openModal}>＋ 購入追加</Btn>
          </div>

          {/* 一覧 */}
          {staffPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted gap-3">
              <span className="text-5xl">🛍</span>
              <p className="text-base font-semibold">まだ購入履歴がありません</p>
              <Btn variant="primary" size="sm" onClick={openModal}>＋ 購入追加</Btn>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-bg border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">日付</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-32">販売価格(税込)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-20">数量</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">購入者</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">記入した人</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted w-16">店舗</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPurchases.map((sp) => {
                    const p = products.find((pr) => pr.id === sp.productId)
                    const incTax = taxIncluded(sp.sellPriceAtPurchase, sp.taxRate)
                    return (
                      <tr key={sp.id} className="border-b border-border hover:bg-bg transition-colors">
                        <td className="px-4 py-3 text-xs text-muted font-mono">{sp.date}</td>
                        <td className="px-4 py-3 font-semibold text-text">
                          <p>{p?.name ?? '不明商品'}</p>
                          <p className="text-2xs text-faint">{p?.category ?? ''}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold">
                          ¥{incTax.toLocaleString()}
                          <span className={`ml-1 text-2xs font-semibold px-1 py-0.5 rounded ${
                            sp.taxRate === 8 ? 'bg-ok-soft text-ok' : 'bg-accent-soft text-accent'
                          }`}>{sp.taxRate}%</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold">{sp.quantity}</td>
                        <td className="px-4 py-3 text-text font-medium">{sp.purchasedBy}</td>
                        <td className="px-4 py-3 text-muted">{sp.recordedBy}</td>
                        <td className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <StoreDot store={sp.storeId} size="sm" />
                            <span className="text-xs text-muted">{sp.storeId === 'flag' ? 'flag' : 'Lien'}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* 購入追加モーダル */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-surface rounded-xl w-[480px] max-h-[90vh] overflow-y-auto shadow-xl flex flex-col gap-4 p-6">
            <p className="text-lg font-bold">スタッフ購入を記録</p>

            {/* 日付 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">日付</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
              />
            </div>

            {/* 店舗 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">店舗</label>
              <div className="flex gap-2">
                {(['flag', 'lien'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, storeId: s }))}
                    className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-md text-sm font-bold border-2 transition-colors ${
                      form.storeId === s
                        ? s === 'flag' ? 'border-flag bg-flag text-white' : 'border-lien bg-lien text-white'
                        : 'border-border text-muted bg-surface'
                    }`}
                  >
                    <StoreDot store={s} size="sm" />
                    {s === 'flag' ? 'flag 美容室' : 'Lien 美容室'}
                  </button>
                ))}
              </div>
            </div>

            {/* 商品選択 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">商品</label>
              {selectedProduct ? (
                <div className="border border-accent rounded-md p-3 bg-accent-soft flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text">{selectedProduct.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      販売価格 税込 ¥{taxIncluded(selectedProduct.sellPrice, selectedProduct.taxRate ?? 10).toLocaleString()}
                      <span className="ml-2">({selectedProduct.taxRate ?? 10}%)</span>
                    </p>
                  </div>
                  <button
                    onMouseDown={() => setForm((f) => ({ ...f, productId: '', productSearch: '' }))}
                    className="text-xs text-muted hover:text-text px-2 py-1"
                  >
                    ✕ 変更
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={form.productSearch}
                    onChange={(e) => setForm((f) => ({ ...f, productSearch: e.target.value }))}
                    onFocus={() => setShowProductDrop(true)}
                    onBlur={() => setTimeout(() => setShowProductDrop(false), 200)}
                    placeholder="タップして商品一覧 / 商品名で検索"
                    className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
                  />
                  {showProductDrop && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                      {dropProducts.map((p) => (
                        <button
                          key={p.id}
                          onMouseDown={() => setForm((f) => ({ ...f, productId: p.id, productSearch: p.name }))}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg flex items-center justify-between border-b border-border last:border-0"
                        >
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="text-xs text-muted ml-2 flex-shrink-0">
                            ¥{taxIncluded(p.sellPrice, p.taxRate ?? 10).toLocaleString()} 税込
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 数量 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">数量</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg active:bg-border transition-colors"
                >
                  −
                </button>
                <div className="flex-1 h-12 border-2 border-accent rounded-md flex items-center justify-center text-2xl font-bold text-accent">
                  {form.quantity}
                </div>
                <button
                  onClick={() => setForm((f) => ({ ...f, quantity: f.quantity + 1 }))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg active:bg-border transition-colors"
                >
                  ＋
                </button>
              </div>
            </div>

            {/* 購入者 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">購入者</label>
              <input
                value={form.purchasedBy}
                onChange={(e) => setForm((f) => ({ ...f, purchasedBy: e.target.value }))}
                onFocus={() => setShowBuyerDrop(true)}
                onBlur={() => setTimeout(() => setShowBuyerDrop(false), 200)}
                placeholder="購入者名を入力"
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
              />
              {showBuyerDrop && buyerSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20">
                  {buyerSuggestions.map((m) => (
                    <button
                      key={m}
                      onMouseDown={() => setForm((f) => ({ ...f, purchasedBy: m }))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-0"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 記入した人 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">記入した人</label>
              <input
                value={form.recordedBy}
                onChange={(e) => setForm((f) => ({ ...f, recordedBy: e.target.value }))}
                onFocus={() => setShowRecorderDrop(true)}
                onBlur={() => setTimeout(() => setShowRecorderDrop(false), 200)}
                placeholder="記入者名を入力"
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
              />
              {showRecorderDrop && recorderSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20">
                  {recorderSuggestions.map((m) => (
                    <button
                      key={m}
                      onMouseDown={() => setForm((f) => ({ ...f, recordedBy: m }))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-0"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 合計プレビュー */}
            {selectedProduct && (
              <Card className="bg-bg">
                <p className="text-xs text-muted mb-1">購入金額 (税込)</p>
                <p className="text-2xl font-bold text-accent tabular-nums">
                  ¥{(taxIncluded(selectedProduct.sellPrice, selectedProduct.taxRate ?? 10) * form.quantity).toLocaleString()}
                </p>
                <p className="text-xs text-faint mt-0.5">
                  {selectedProduct.name} × {form.quantity} 個
                </p>
              </Card>
            )}

            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={closeModal}>キャンセル</Btn>
              <Btn variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
                ✓ 記録する
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
