import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreId } from '../types'

type FilterType = 'すべて' | '承認待ち' | '承認済'

const STATUS_VARIANT = {
  承認待ち: 'warn',
  承認済: 'ok',
  却下: 'danger',
} as const

export function Transfer() {
  const { products, stocks, transfers, addTransfer, approveTransfer, rejectTransfer } = useAppStore()
  const [filter, setFilter] = useState<FilterType>('すべて')
  const [showModal, setShowModal] = useState(false)

  // 申請フォーム
  const [fromStore, setFromStore] = useState<StoreId>('flag')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [qty, setQty] = useState(1)
  const [memo, setMemo] = useState('')
  const [showDrop, setShowDrop] = useState(false)

  const toStore: StoreId = fromStore === 'flag' ? 'lien' : 'flag'

  const filteredTransfers = transfers.filter((t) =>
    filter === 'すべて' ? t.status !== '却下' : t.status === filter
  )
  const pendingCount = transfers.filter((t) => t.status === '承認待ち').length

  function getStock(productId: string, storeId: StoreId) {
    return stocks.find((s) => s.productId === productId && s.storeId === storeId)?.currentStock ?? 0
  }

  // フォーカス中: 検索なし→全商品20件、検索あり→絞り込み
  const dropProducts = search.length > 0
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : products.slice(0, 20)

  const selectedProduct = selectedId ? products.find((p) => p.id === selectedId) : null
  const fromStock = selectedId ? getStock(selectedId, fromStore) : 0

  function closeModal() {
    setSearch('')
    setSelectedId('')
    setQty(1)
    setMemo('')
    setShowDrop(false)
    setShowModal(false)
  }

  function openModal() {
    setFromStore('flag')
    setSearch('')
    setSelectedId('')
    setQty(1)
    setMemo('')
    setShowDrop(false)
    setShowModal(true)
  }

  function submitTransfer() {
    if (!selectedId) return
    addTransfer({
      fromStore,
      toStore,
      items: [{ productId: selectedId, quantity: qty }],
      memo: memo || undefined,
    })
    closeModal()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="店舗間移動" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg p-6">
          {/* ヘッダー */}
          <div className="flex items-center gap-3 mb-5">
            <div>
              <p className="text-2xs text-faint">承認待ちの移動依頼</p>
              <p className="text-3xl font-bold text-text">
                {pendingCount} 件
                {pendingCount > 0 && <span className="text-sm text-warn font-semibold ml-2">· 要対応</span>}
              </p>
            </div>
            <div className="flex-1" />
            <Btn variant="primary" size="sm" onClick={openModal}>＋ 移動申請</Btn>
          </div>

          {/* フィルタ */}
          <div className="flex gap-2 mb-4">
            {(['すべて', '承認待ち', '承認済'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
                  filter === f ? 'bg-accent text-white' : 'bg-surface text-muted border border-border'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* リスト */}
          {filteredTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted gap-3">
              <span className="text-5xl">⇄</span>
              <p className="text-base font-semibold">移動履歴がありません</p>
              <Btn variant="primary" size="sm" onClick={openModal}>＋ 移動申請</Btn>
            </div>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto">
              {filteredTransfers.map((transfer) => (
                <Card key={transfer.id}>
                  <div className="flex items-start gap-4">
                    <div className="min-w-[120px]">
                      <p className="text-2xs text-faint font-mono mb-1">{transfer.id}</p>
                      <p className="text-xs text-muted">{transfer.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2 min-w-[200px]">
                      <div className="flex items-center gap-1.5">
                        <StoreDot store={transfer.fromStore} />
                        <span className="text-sm font-bold" style={{ color: transfer.fromStore === 'flag' ? '#2B5FA7' : '#8A4AA6' }}>
                          {transfer.fromStore === 'flag' ? 'flag' : 'Lien'}
                        </span>
                      </div>
                      <span className="text-muted text-lg">→</span>
                      <div className="flex items-center gap-1.5">
                        <StoreDot store={transfer.toStore} />
                        <span className="text-sm font-bold" style={{ color: transfer.toStore === 'flag' ? '#2B5FA7' : '#8A4AA6' }}>
                          {transfer.toStore === 'flag' ? 'flag' : 'Lien'}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      {transfer.items.map((item, i) => {
                        const p = products.find((pr) => pr.id === item.productId)
                        return (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-text">{p?.name ?? '不明商品'}</span>
                            <span className="font-bold tabular-nums ml-4">{item.quantity} 個</span>
                          </div>
                        )
                      })}
                      {transfer.memo && <p className="text-xs text-faint mt-1">{transfer.memo}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={STATUS_VARIANT[transfer.status]}>{transfer.status}</Badge>
                      {transfer.status === '承認待ち' && (
                        <>
                          <Btn variant="primary" size="sm" onClick={() => approveTransfer(transfer.id)}>承認</Btn>
                          <Btn variant="danger" size="sm" onClick={() => rejectTransfer(transfer.id)}>却下</Btn>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 移動申請モーダル */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(e) => e.target === e.currentTarget && closeModal()}
        >
          {/* max-h-[90vh] + overflow-y-auto でスクロール対応 */}
          <div className="bg-surface rounded-xl w-[480px] max-h-[90vh] overflow-y-auto shadow-xl flex flex-col gap-4 p-6">
            <p className="text-lg font-bold">店舗間移動を申請</p>

            {/* 移動元/先 */}
            <div className="grid grid-cols-[1fr_28px_1fr] items-end gap-2">
              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">移動元</label>
                <select
                  value={fromStore}
                  onChange={(e) => { setFromStore(e.target.value as StoreId); setSelectedId(''); setSearch('') }}
                  className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
                >
                  <option value="flag">flag 美容室</option>
                  <option value="lien">Lien 美容室</option>
                </select>
              </div>
              <div className="pb-2 text-center text-lg text-muted">→</div>
              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">移動先</label>
                <div className="h-10 border border-border rounded-md px-3 flex items-center gap-2 text-sm text-text bg-bg">
                  <StoreDot store={toStore} />
                  {toStore === 'flag' ? 'flag 美容室' : 'Lien 美容室'}
                </div>
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
                      移動元 {getStock(selectedId, fromStore)} 個 ／ 移動先 {getStock(selectedId, toStore)} 個
                    </p>
                  </div>
                  <button
                    onMouseDown={() => { setSelectedId(''); setSearch('') }}
                    className="text-xs text-muted hover:text-text px-2 py-1"
                  >
                    ✕ 変更
                  </button>
                </div>
              ) : (
                <>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setShowDrop(true)}
                    onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                    placeholder="タップして商品一覧 / 商品名で検索"
                    className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
                  />
                  {showDrop && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                      {dropProducts.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-faint">該当商品なし</p>
                      ) : (
                        dropProducts.map((p) => (
                          <button
                            key={p.id}
                            onMouseDown={() => { setSelectedId(p.id); setSearch(p.name); setShowDrop(false) }}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg flex items-center justify-between border-b border-border last:border-0"
                          >
                            <span className="font-medium truncate">{p.name}</span>
                            <span className="text-xs text-muted ml-2 flex-shrink-0">
                              {fromStore === 'flag' ? 'flag' : 'Lien'} {getStock(p.id, fromStore)} 個
                            </span>
                          </button>
                        ))
                      )}
                      {search.length === 0 && products.length > 20 && (
                        <p className="px-3 py-2 text-xs text-faint bg-bg text-center">
                          全 {products.length} 商品 — 商品名を入力して絞り込み
                        </p>
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
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg active:bg-border transition-colors"
                >
                  −
                </button>
                <div className="flex-1 h-12 border-2 border-accent rounded-md flex items-center justify-center text-2xl font-bold text-accent">
                  {qty}
                </div>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-12 h-12 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg active:bg-border transition-colors"
                >
                  ＋
                </button>
              </div>
              {selectedProduct && qty > fromStock && fromStock >= 0 && (
                <p className="text-xs text-danger mt-1.5">
                  ⚠ 移動元の在庫（{fromStock} 個）を超えています
                </p>
              )}
            </div>

            {/* メモ */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">メモ (任意)</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="理由や備考を入力"
                className="w-full min-h-[60px] border border-border-strong rounded-md p-3 text-sm bg-surface text-text outline-none resize-none focus:border-accent placeholder:text-faint"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={closeModal}>キャンセル</Btn>
              <Btn variant="primary" onClick={submitTransfer} disabled={!selectedId}>
                申請する
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
