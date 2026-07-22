import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreId } from '../types'

const PRODUCT_CATEGORIES = [
  'カラー剤', 'ブリーチ剤', 'カラーオキシ',
  'パーマ剤', 'プレックス剤', '髪ドラ',
  'oggi otto', 'H2', '処理剤', '小物類',
  'シャンプー', 'トリートメント', 'アウトバスTR', 'スタイリング', 'オイル',
]

type QuickAdd = {
  name: string
  category: string
  purchasePrice: string
  sellPrice: string
  taxRate: 8 | 10
}

type ManualEntry = {
  name: string
  priceIncTax: string
  taxRate: 8 | 10
}

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

function getMonthLabel(offset: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

function getMonthPrefix(offset: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

type PaymentForm = {
  date: string
  amount: string
  staffName: string
  storeId: StoreId
  note: string
}

const BLANK_PAYMENT = (storeId: StoreId): PaymentForm => ({
  date: new Date().toISOString().slice(0, 10),
  amount: '',
  staffName: '',
  storeId,
  note: '',
})

// 統合エントリ型
type UnifiedEntry = {
  id: string
  date: string
  productName: string
  category: string
  entryType: 'purchase' | 'dispense' | 'payment'
  priceIncTax: number
  quantity: number
  person: string       // purchasedBy or dispensedBy or payer
  recordedBy: string
  storeId: StoreId
}

export function StaffScreen() {
  const {
    products, upsertProduct, stocks, upsertStock, addTransaction, deleteTransaction,
    staffPurchases, addStaffPurchase, deleteStaffPurchase,
    staffPayments, addStaffPayment, deleteStaffPayment,
    staffMembers, addStaffMember,
    transactions, storeOrder, storeInfo,
  } = useAppStore()

  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedStaff, setSelectedStaff] = useState<string>('全員')
  const [typeFilter, setTypeFilter] = useState<'all' | 'purchase' | 'dispense'>('all')

  const [showModal, setShowModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(BLANK_PAYMENT(storeOrder[0] ?? 'flag'))
  const [showPayerDrop, setShowPayerDrop] = useState(false)
  const [confirmDeletePayId, setConfirmDeletePayId] = useState<string | null>(null)
  // { id, entryType } で purchase / dispense を区別して削除
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<{ id: string; entryType: 'purchase' | 'dispense' } | null>(null)
  const [form, setForm] = useState<FormState>(BLANK_FORM())
  const [showProductDrop, setShowProductDrop] = useState(false)
  const [showBuyerDrop, setShowBuyerDrop] = useState(false)
  const [showRecorderDrop, setShowRecorderDrop] = useState(false)
  const [quickAdd, setQuickAdd] = useState<QuickAdd | null>(null)
  const [manualEntry, setManualEntry] = useState<ManualEntry | null>(null)

  const monthPrefix = getMonthPrefix(monthOffset)
  const monthLabel = getMonthLabel(monthOffset)

  // staffPurchases → UnifiedEntry
  const purchaseEntries: UnifiedEntry[] = staffPurchases
    .filter((sp) => sp.date.startsWith(monthPrefix))
    .map((sp) => {
      const p = products.find((pr) => pr.id === sp.productId)
      const incTax = sp.manualProductName
        ? sp.sellPriceAtPurchase
        : taxIncluded(sp.sellPriceAtPurchase, sp.taxRate)
      return {
        id: sp.id,
        date: sp.date,
        productName: sp.manualProductName ?? p?.name ?? '不明商品',
        category: sp.manualProductName ? '手動入力' : (p?.category ?? ''),
        entryType: 'purchase' as const,
        priceIncTax: incTax,
        quantity: sp.quantity,
        person: sp.purchasedBy,
        recordedBy: sp.recordedBy,
        storeId: sp.storeId,
      }
    })

  // dispense transactions with dispensedBy → UnifiedEntry
  const dispenseEntries: UnifiedEntry[] = transactions
    .filter((t) => {
      if (t.type !== 'dispense' || !t.dispensedBy) return false
      const date = new Date(t.timestamp).toISOString().slice(0, 7)
      return date === monthPrefix
    })
    .map((t) => {
      const p = products.find((pr) => pr.id === t.productId)
      const rate = p?.taxRate ?? 10
      const incTax = taxIncluded(p?.purchasePrice ?? 0, rate)
      const dateStr = new Date(t.timestamp).toISOString().slice(0, 10)
      return {
        id: t.id,
        date: dateStr,
        productName: p?.name ?? '不明商品',
        category: p?.category ?? '',
        entryType: 'dispense' as const,
        priceIncTax: incTax,
        quantity: t.quantity,
        person: t.dispensedBy ?? '',
        recordedBy: '—',
        storeId: t.storeId,
      }
    })

  // staffPayments → UnifiedEntry
  const paymentEntries: UnifiedEntry[] = staffPayments
    .filter((sp) => sp.date.startsWith(monthPrefix))
    .map((sp) => ({
      id: sp.id,
      date: sp.date,
      productName: sp.note || 'お支払い',
      category: '',
      entryType: 'payment' as const,
      priceIncTax: sp.amount,
      quantity: 1,
      person: sp.staffName,
      recordedBy: '—',
      storeId: sp.storeId,
    }))

  // 統合・ソート（日付降順）
  const allEntries = [...purchaseEntries, ...dispenseEntries, ...paymentEntries].sort((a, b) =>
    b.date.localeCompare(a.date)
  )

  const filtered = allEntries.filter((e) => {
    if (selectedStaff !== '全員' && e.person !== selectedStaff) return false
    if (typeFilter === 'purchase' && e.entryType !== 'purchase') return false
    if (typeFilter === 'dispense' && e.entryType !== 'dispense') return false
    return true
  })

  // 残高計算（特定スタッフ選択時）
  const staffEntries = selectedStaff === '全員' ? allEntries : allEntries.filter((e) => e.person === selectedStaff)
  const purchaseTotal = staffEntries.filter((e) => e.entryType !== 'payment').reduce((sum, e) => sum + e.priceIncTax * e.quantity, 0)
  const paymentTotal = staffEntries.filter((e) => e.entryType === 'payment').reduce((sum, e) => sum + e.priceIncTax, 0)
  const balance = purchaseTotal - paymentTotal

  const totalAmount = filtered.filter((e) => e.entryType !== 'payment').reduce((sum, e) => sum + e.priceIncTax * e.quantity, 0)
  const totalPaid = filtered.filter((e) => e.entryType === 'payment').reduce((sum, e) => sum + e.priceIncTax, 0)

  // スタッフ一覧（購入者 + 卸した人）
  const allPersons = Array.from(new Set([
    ...staffMembers,
    ...allEntries.map((e) => e.person).filter(Boolean),
  ]))

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

  function openPaymentModal() {
    setPaymentForm({
      ...BLANK_PAYMENT(storeOrder[0] ?? 'flag'),
      staffName: selectedStaff !== '全員' ? selectedStaff : '',
    })
    setShowPaymentModal(true)
  }

  function handlePaymentSubmit() {
    const amt = Number(paymentForm.amount)
    if (!paymentForm.staffName || !amt) return
    if (!staffMembers.includes(paymentForm.staffName)) addStaffMember(paymentForm.staffName)
    addStaffPayment({
      date: paymentForm.date,
      amount: amt,
      staffName: paymentForm.staffName,
      storeId: paymentForm.storeId,
      note: paymentForm.note || undefined,
    })
    setShowPaymentModal(false)
  }

  function openModal() {
    setForm(BLANK_FORM())
    setShowProductDrop(false)
    setShowBuyerDrop(false)
    setShowRecorderDrop(false)
    setQuickAdd(null)
    setManualEntry(null)
    setShowModal(true)
  }
  function closeModal() {
    setShowModal(false)
    setQuickAdd(null)
    setManualEntry(null)
  }

  function handleQuickAddSave() {
    if (!quickAdd || !quickAdd.name || !quickAdd.category) return
    const id = `QP-${Date.now()}`
    upsertProduct({
      id, name: quickAdd.name, category: quickAdd.category, maker: '',
      barcode: '', purchasePrice: Number(quickAdd.purchasePrice) || 0,
      sellPrice: Number(quickAdd.sellPrice) || 0, taxRate: quickAdd.taxRate, memo: '',
    })
    setForm((f) => ({ ...f, productId: id, productSearch: quickAdd.name }))
    setQuickAdd(null)
  }

  function handleSubmit() {
    if (!form.purchasedBy || !form.recordedBy) return
    if (!staffMembers.includes(form.purchasedBy)) addStaffMember(form.purchasedBy)
    if (!staffMembers.includes(form.recordedBy)) addStaffMember(form.recordedBy)
    const ts = new Date(form.date).getTime()

    if (manualEntry && manualEntry.name && manualEntry.priceIncTax) {
      addStaffPurchase({
        date: form.date, productId: '', quantity: form.quantity,
        sellPriceAtPurchase: Number(manualEntry.priceIncTax) || 0,
        taxRate: manualEntry.taxRate, purchasedBy: form.purchasedBy,
        recordedBy: form.recordedBy, storeId: form.storeId,
        manualProductName: manualEntry.name,
      })
    } else if (form.productId && selectedProduct) {
      addStaffPurchase({
        date: form.date, productId: form.productId, quantity: form.quantity,
        sellPriceAtPurchase: selectedProduct.purchasePrice,
        taxRate: selectedProduct.taxRate ?? 10, purchasedBy: form.purchasedBy,
        recordedBy: form.recordedBy, storeId: form.storeId,
      })
      addTransaction({ type: 'dispense', productId: form.productId, storeId: form.storeId, quantity: form.quantity, timestamp: ts })
      const s = stocks.find((st) => st.productId === form.productId && st.storeId === form.storeId)
      upsertStock({ productId: form.productId, storeId: form.storeId, currentStock: Math.max(0, (s?.currentStock ?? 0) - form.quantity), minStock: s?.minStock ?? 3, active: s?.active ?? true })
    }
    closeModal()
  }

  const canSubmit =
    (!!form.productId || (!!manualEntry?.name && !!manualEntry?.priceIncTax)) &&
    !!form.purchasedBy && !!form.recordedBy && form.quantity > 0

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="購入・卸し履歴" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* フィルターバー */}
          <div className="px-4 md:px-6 pt-4 pb-3 bg-surface border-b border-border flex flex-col gap-3 flex-shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              {/* 月切り替え */}
              <div className="flex items-center gap-2">
                <button onClick={() => setMonthOffset((o) => o - 1)}
                  className="w-8 h-8 rounded-md border border-border text-muted hover:bg-bg flex items-center justify-center">‹</button>
                <span className="text-sm font-bold min-w-[90px] text-center">{monthLabel}</span>
                <button onClick={() => setMonthOffset((o) => Math.min(0, o + 1))} disabled={monthOffset >= 0}
                  className="w-8 h-8 rounded-md border border-border text-muted hover:bg-bg flex items-center justify-center disabled:opacity-30">›</button>
                {monthOffset < 0 && (
                  <button onClick={() => setMonthOffset(0)} className="text-xs text-accent font-semibold ml-1">今月に戻る</button>
                )}
              </div>

              {/* タイプフィルター */}
              <div className="flex rounded-md border border-border overflow-hidden flex-shrink-0">
                {([['all', 'すべて'], ['purchase', '購入'], ['dispense', '卸し']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setTypeFilter(val)}
                    className={`px-3 h-8 text-xs font-bold border-l first:border-l-0 border-border transition-colors ${typeFilter === val ? 'bg-accent text-white' : 'bg-surface text-muted'}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1" />
              <Btn variant="ghost" size="sm" onClick={openPaymentModal}>¥ 支払い記録</Btn>
              <Btn variant="primary" size="sm" onClick={openModal}>＋ 購入追加</Btn>
            </div>

            {/* スタッフフィルター */}
            <div className="flex gap-2 overflow-x-auto">
              <button onClick={() => setSelectedStaff('全員')}
                className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${selectedStaff === '全員' ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'}`}>
                全員
              </button>
              {allPersons.map((name) => (
                <button key={name} onClick={() => setSelectedStaff(name)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${selectedStaff === name ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'}`}>
                  {name}
                </button>
              ))}
              {allPersons.length === 0 && (
                <span className="text-xs text-faint self-center">「設定 → スタッフ管理」でスタッフを登録すると絞り込めます</span>
              )}
            </div>

            {/* KPI */}
            <div className="flex gap-2 flex-wrap">
              <div className="bg-bg rounded-lg px-3 py-2 flex flex-col">
                <span className="text-2xs text-faint">購入・卸し合計</span>
                <span className="text-lg font-bold text-text">¥{totalAmount.toLocaleString()}</span>
              </div>
              {totalPaid > 0 && (
                <div className="bg-bg rounded-lg px-3 py-2 flex flex-col">
                  <span className="text-2xs text-faint">支払い済み</span>
                  <span className="text-lg font-bold text-ok">−¥{totalPaid.toLocaleString()}</span>
                </div>
              )}
              {selectedStaff !== '全員' && (
                <div className={`rounded-lg px-3 py-2 flex flex-col ${balance <= 0 ? 'bg-ok-soft' : 'bg-danger-soft'}`}>
                  <span className="text-2xs text-faint">残高（未払い）</span>
                  <span className={`text-lg font-bold ${balance <= 0 ? 'text-ok' : 'text-danger'}`}>
                    {balance <= 0 ? '精算済み' : `¥${balance.toLocaleString()}`}
                  </span>
                </div>
              )}
              <div className="bg-bg rounded-lg px-3 py-2 flex flex-col">
                <span className="text-2xs text-faint">件数</span>
                <span className="text-lg font-bold text-text">{filtered.filter((e) => e.entryType !== 'payment').length} 件</span>
              </div>
            </div>
          </div>

          {/* 一覧 */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted gap-3">
              <span className="text-5xl">🛍</span>
              <p className="text-base font-semibold">
                {allEntries.length === 0 ? 'まだ記録がありません' : 'この月・絞り込み条件に合う記録がありません'}
              </p>
              <Btn variant="primary" size="sm" onClick={openModal}>＋ 購入追加</Btn>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[600px] text-sm border-collapse">
                <thead className="bg-bg border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">日付</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-muted w-16">種別</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-28">金額(税込)</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-14">数量</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">購入者/卸した人</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-24">記入した人</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted w-16">店舗</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className={`border-b border-border hover:bg-bg transition-colors ${e.entryType === 'payment' ? 'bg-ok-soft/30' : ''}`}>
                      <td className="px-4 py-3 text-xs text-muted font-mono">{e.date}</td>
                      <td className="px-3 py-3">
                        {e.entryType === 'purchase' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-accent-soft text-accent">購入</span>
                        ) : e.entryType === 'dispense' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-danger-soft text-danger">卸し</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-ok-soft text-ok">支払</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-text">{e.productName}</p>
                        <p className="text-2xs text-faint">{e.category}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold">
                        {e.entryType === 'payment' ? (
                          <span className="text-ok">−¥{e.priceIncTax.toLocaleString()}</span>
                        ) : (
                          <>
                            ¥{(e.priceIncTax * e.quantity).toLocaleString()}
                            <span className="block text-2xs text-faint font-normal">¥{e.priceIncTax.toLocaleString()} × {e.quantity}</span>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold">
                        {e.entryType === 'payment' ? '—' : e.quantity}
                      </td>
                      <td className="px-4 py-3 text-text font-medium">{e.person || '—'}</td>
                      <td className="px-4 py-3 text-muted">{e.recordedBy}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <StoreDot store={e.storeId} size="sm" />
                          <span className="text-xs text-muted">{storeInfo[e.storeId]?.name ?? e.storeId}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => {
                            if (e.entryType === 'payment') setConfirmDeletePayId(e.id)
                            else setConfirmDeleteEntry({ id: e.id, entryType: e.entryType })
                          }}
                          className="w-7 h-7 rounded-md text-faint hover:text-danger hover:bg-danger-soft transition-colors flex items-center justify-center text-sm">
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-bg border-t-2 border-border sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-muted">合計</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-accent">¥{(totalAmount - totalPaid).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{filtered.filter((e) => e.entryType !== 'payment').reduce((s, e) => s + e.quantity, 0)}</td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* 購入追加モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bg-surface rounded-xl w-[480px] max-w-[95vw] max-h-[90vh] overflow-y-auto shadow-xl flex flex-col gap-4 p-6">
            <p className="text-lg font-bold">スタッフ購入を記録</p>

            {/* 日付 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">日付</label>
              <input type="date" value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent" />
            </div>

            {/* 店舗 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">店舗</label>
              <div className="flex gap-2 flex-wrap">
                {storeOrder.map((s) => {
                  const color = storeInfo[s]?.color ?? '#888888'
                  const active = form.storeId === s
                  return (
                    <button key={s} type="button"
                      onClick={() => setForm((f) => ({ ...f, storeId: s as StoreId }))}
                      className="flex-1 h-10 flex items-center justify-center gap-2 rounded-md text-sm font-bold border-2 transition-colors min-w-[80px]"
                      style={active ? { borderColor: color, backgroundColor: color, color: '#fff' } : { borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--surface)' }}>
                      <StoreDot store={s} size="sm" />
                      {storeInfo[s]?.name ?? s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 商品選択 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">商品</label>

              {quickAdd ? (
                <div className="border border-ok rounded-lg p-4 bg-ok-soft flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-ok">新規商品をカタログに登録</p>
                    <button onMouseDown={() => setQuickAdd(null)} className="text-xs text-muted hover:text-text">キャンセル</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-2xs text-muted mb-1 block">商品名 *</label>
                      <input value={quickAdd.name}
                        onChange={(e) => setQuickAdd((q) => q && { ...q, name: e.target.value })}
                        className="w-full h-9 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-ok" />
                    </div>
                    <div>
                      <label className="text-2xs text-muted mb-1 block">カテゴリ *</label>
                      <select value={quickAdd.category}
                        onChange={(e) => setQuickAdd((q) => q && { ...q, category: e.target.value })}
                        className="w-full h-9 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-ok">
                        <option value="">選択してください</option>
                        {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-2xs text-muted mb-1 block">仕入価格(税抜)</label>
                        <input value={quickAdd.purchasePrice}
                          onChange={(e) => setQuickAdd((q) => q && { ...q, purchasePrice: e.target.value })}
                          placeholder="0"
                          className="w-full h-9 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-ok" />
                      </div>
                      <div>
                        <label className="text-2xs text-muted mb-1 block">販売価格(税抜)</label>
                        <input value={quickAdd.sellPrice}
                          onChange={(e) => setQuickAdd((q) => q && { ...q, sellPrice: e.target.value })}
                          placeholder="0"
                          className="w-full h-9 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-ok" />
                      </div>
                    </div>
                    <div>
                      <label className="text-2xs text-muted mb-1 block">税率</label>
                      <div className="flex gap-2">
                        {([10, 8] as const).map((r) => (
                          <button key={r} type="button"
                            onMouseDown={() => setQuickAdd((q) => q && { ...q, taxRate: r })}
                            className={`flex-1 h-8 rounded-md text-xs font-bold border-2 transition-colors ${quickAdd.taxRate === r ? 'bg-ok text-white border-ok' : 'bg-surface text-muted border-border'}`}>
                            {r}% {r === 10 ? '標準' : '軽減'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Btn variant="primary" onClick={handleQuickAddSave} disabled={!quickAdd.name || !quickAdd.category}>
                    ✓ カタログに登録してこの商品を選択
                  </Btn>
                </div>

              ) : manualEntry ? (
                <div className="border border-accent rounded-lg p-4 bg-accent-soft flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-accent">手動入力（カタログ登録なし）</p>
                    <button onMouseDown={() => setManualEntry(null)} className="text-xs text-muted hover:text-text">キャンセル</button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-2xs text-muted mb-1 block">商品名 *</label>
                      <input value={manualEntry.name}
                        onChange={(e) => setManualEntry((m) => m && { ...m, name: e.target.value })}
                        placeholder="商品名を入力"
                        className="w-full h-9 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent" />
                    </div>
                    <div>
                      <label className="text-2xs text-muted mb-1 block">価格（税込） *</label>
                      <div className="flex items-center h-9 border border-border-strong rounded-md px-3 bg-surface focus-within:border-accent">
                        <span className="text-faint text-sm mr-1">¥</span>
                        <input value={manualEntry.priceIncTax}
                          onChange={(e) => setManualEntry((m) => m && { ...m, priceIncTax: e.target.value })}
                          placeholder="0" inputMode="numeric"
                          className="flex-1 text-sm bg-transparent outline-none text-text" />
                      </div>
                    </div>
                    <div>
                      <label className="text-2xs text-muted mb-1 block">税率（記録用）</label>
                      <div className="flex gap-2">
                        {([10, 8] as const).map((r) => (
                          <button key={r} type="button"
                            onMouseDown={() => setManualEntry((m) => m && { ...m, taxRate: r })}
                            className={`flex-1 h-8 rounded-md text-xs font-bold border-2 transition-colors ${manualEntry.taxRate === r ? 'bg-accent text-white border-accent' : 'bg-surface text-muted border-border'}`}>
                            {r}% {r === 10 ? '標準' : '軽減'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              ) : selectedProduct ? (
                <div className="border border-accent rounded-md p-3 bg-accent-soft flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-text">{selectedProduct.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      仕入価格 税込 ¥{taxIncluded(selectedProduct.purchasePrice, selectedProduct.taxRate ?? 10).toLocaleString()}
                      <span className="ml-2">({selectedProduct.taxRate ?? 10}%)</span>
                    </p>
                  </div>
                  <button onMouseDown={() => setForm((f) => ({ ...f, productId: '', productSearch: '' }))}
                    className="text-xs text-muted hover:text-text px-2 py-1">✕ 変更</button>
                </div>

              ) : (
                <>
                  <input value={form.productSearch}
                    onChange={(e) => setForm((f) => ({ ...f, productSearch: e.target.value }))}
                    onFocus={() => setShowProductDrop(true)}
                    onBlur={() => setTimeout(() => setShowProductDrop(false), 200)}
                    placeholder="タップして商品一覧 / 商品名で検索"
                    className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent" />
                  {showProductDrop && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 max-h-56 overflow-y-auto">
                      {dropProducts.map((p) => (
                        <button key={p.id}
                          onMouseDown={() => setForm((f) => ({ ...f, productId: p.id, productSearch: p.name }))}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg flex items-center justify-between border-b border-border last:border-0">
                          <span className="font-medium truncate">{p.name}</span>
                          <span className="text-xs text-muted ml-2 flex-shrink-0">
                            仕入 ¥{taxIncluded(p.purchasePrice, p.taxRate ?? 10).toLocaleString()} 税込
                          </span>
                        </button>
                      ))}
                      {form.productSearch.length > 0 && (
                        <div className="border-t border-border">
                          <button
                            onMouseDown={() => { setManualEntry({ name: form.productSearch, priceIncTax: '', taxRate: 10 }); setShowProductDrop(false) }}
                            className="w-full text-left px-3 py-2.5 text-sm text-accent font-semibold hover:bg-accent-soft flex items-center gap-2 border-b border-border">
                            <span>✏</span>
                            <span>「{form.productSearch}」を手動入力</span>
                          </button>
                          <button
                            onMouseDown={() => { setQuickAdd({ name: form.productSearch, category: '', purchasePrice: '', sellPrice: '', taxRate: 10 }); setShowProductDrop(false) }}
                            className="w-full text-left px-3 py-2.5 text-sm text-ok font-semibold hover:bg-ok-soft flex items-center gap-2">
                            <span>＋</span>
                            <span>「{form.productSearch}」をカタログに新規登録</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 数量 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">数量</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg active:bg-border transition-colors">−</button>
                <div className="flex-1 h-12 border-2 border-accent rounded-md flex items-center justify-center text-2xl font-bold text-accent">
                  {form.quantity}
                </div>
                <button onClick={() => setForm((f) => ({ ...f, quantity: f.quantity + 1 }))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg active:bg-border transition-colors">＋</button>
              </div>
            </div>

            {/* 購入者 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">購入者</label>
              <input value={form.purchasedBy}
                onChange={(e) => setForm((f) => ({ ...f, purchasedBy: e.target.value }))}
                onFocus={() => setShowBuyerDrop(true)}
                onBlur={() => setTimeout(() => setShowBuyerDrop(false), 200)}
                placeholder="購入者名を入力"
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent" />
              {showBuyerDrop && buyerSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20">
                  {buyerSuggestions.map((m) => (
                    <button key={m} onMouseDown={() => setForm((f) => ({ ...f, purchasedBy: m }))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-0">{m}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 記入した人 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">記入した人</label>
              <input value={form.recordedBy}
                onChange={(e) => setForm((f) => ({ ...f, recordedBy: e.target.value }))}
                onFocus={() => setShowRecorderDrop(true)}
                onBlur={() => setTimeout(() => setShowRecorderDrop(false), 200)}
                placeholder="記入者名を入力"
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent" />
              {showRecorderDrop && recorderSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20">
                  {recorderSuggestions.map((m) => (
                    <button key={m} onMouseDown={() => setForm((f) => ({ ...f, recordedBy: m }))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-0">{m}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 合計プレビュー */}
            {(selectedProduct || (manualEntry?.name && manualEntry?.priceIncTax)) && (
              <Card className="bg-bg">
                <p className="text-xs text-muted mb-1">購入金額 (税込)</p>
                <p className="text-2xl font-bold text-accent tabular-nums">
                  {selectedProduct
                    ? `¥${(taxIncluded(selectedProduct.purchasePrice, selectedProduct.taxRate ?? 10) * form.quantity).toLocaleString()}`
                    : `¥${((Number(manualEntry?.priceIncTax) || 0) * form.quantity).toLocaleString()}`}
                </p>
                <p className="text-xs text-faint mt-0.5">
                  {selectedProduct ? selectedProduct.name : manualEntry?.name} × {form.quantity} 個
                </p>
              </Card>
            )}

            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={closeModal}>キャンセル</Btn>
              <Btn variant="primary" onClick={handleSubmit} disabled={!canSubmit}>✓ 記録する</Btn>
            </div>
          </div>
        </div>
      )}
      {/* 支払い記録モーダル */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(e) => e.target === e.currentTarget && setShowPaymentModal(false)}>
          <div className="bg-surface rounded-xl w-[400px] max-w-[95vw] shadow-xl flex flex-col gap-4 p-6">
            <p className="text-lg font-bold">支払いを記録</p>
            <p className="text-xs text-muted -mt-2">購入・卸し合計から相殺されます</p>

            {/* 日付 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">日付</label>
              <input type="date" value={paymentForm.date}
                onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-ok" />
            </div>

            {/* スタッフ名 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">誰が支払ったか</label>
              <input value={paymentForm.staffName}
                onChange={(e) => setPaymentForm((f) => ({ ...f, staffName: e.target.value }))}
                onFocus={() => setShowPayerDrop(true)}
                onBlur={() => setTimeout(() => setShowPayerDrop(false), 150)}
                placeholder="スタッフ名"
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-ok" />
              {showPayerDrop && allPersons.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 max-h-40 overflow-y-auto">
                  {allPersons.filter((m) => m.toLowerCase().includes(paymentForm.staffName.toLowerCase())).map((m) => (
                    <button key={m} onMouseDown={() => setPaymentForm((f) => ({ ...f, staffName: m }))}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-0">{m}</button>
                  ))}
                </div>
              )}
            </div>

            {/* 金額 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">支払い金額（税込）</label>
              <div className="flex items-center h-12 border-2 border-border-strong rounded-md px-3 bg-surface focus-within:border-ok">
                <span className="text-faint text-sm mr-1">¥</span>
                <input value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0" inputMode="numeric"
                  className="flex-1 text-xl font-bold bg-transparent outline-none text-ok" />
              </div>
            </div>

            {/* メモ */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">メモ（省略可）</label>
              <input value={paymentForm.note}
                onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="現金, 振込など"
                className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-ok" />
            </div>

            {/* 店舗 */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">店舗</label>
              <div className="flex gap-2 flex-wrap">
                {storeOrder.map((s) => {
                  const color = storeInfo[s]?.color ?? '#888'
                  const active = paymentForm.storeId === s
                  return (
                    <button key={s} type="button"
                      onClick={() => setPaymentForm((f) => ({ ...f, storeId: s as StoreId }))}
                      className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-md text-sm font-bold border-2 transition-colors min-w-[70px]"
                      style={active ? { borderColor: color, backgroundColor: color, color: '#fff' } : { borderColor: 'var(--border)', color: 'var(--muted)', backgroundColor: 'var(--surface)' }}>
                      <StoreDot store={s} size="sm" />
                      {storeInfo[s]?.name ?? s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={() => setShowPaymentModal(false)}>キャンセル</Btn>
              <Btn variant="primary" onClick={handlePaymentSubmit}
                disabled={!paymentForm.staffName || !paymentForm.amount || Number(paymentForm.amount) <= 0}
                className="bg-ok border-ok hover:bg-ok/90">
                ✓ 支払いを記録
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* 購入・卸し削除確認 */}
      {confirmDeleteEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 shadow-xl flex flex-col gap-4 w-72">
            <p className="text-base font-bold">この記録を削除しますか？</p>
            <p className="text-xs text-muted">削除すると元に戻せません。</p>
            <div className="flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setConfirmDeleteEntry(null)}>キャンセル</Btn>
              <Btn variant="danger" className="flex-1" onClick={() => {
                if (confirmDeleteEntry.entryType === 'purchase') deleteStaffPurchase(confirmDeleteEntry.id)
                else deleteTransaction(confirmDeleteEntry.id)
                setConfirmDeleteEntry(null)
              }}>削除</Btn>
            </div>
          </div>
        </div>
      )}

      {/* 支払い削除確認 */}
      {confirmDeletePayId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 shadow-xl flex flex-col gap-4 w-72">
            <p className="text-base font-bold">この支払い記録を削除しますか？</p>
            <div className="flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setConfirmDeletePayId(null)}>キャンセル</Btn>
              <Btn variant="danger" className="flex-1" onClick={() => { deleteStaffPayment(confirmDeletePayId); setConfirmDeletePayId(null) }}>削除</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
