import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { useAppStore } from '../store'
import { sendNotification } from '../lib/email'
import type { StoreId } from '../types'

type Direction = 'flag-to-lien' | 'lien-to-flag'

export function Transfer() {
  const {
    products, stocks, transfers,
    directTransfer, deleteTransfer,
    approveTransfer, rejectTransfer,
    appSettings,
  } = useAppStore()

  const [direction, setDirection] = useState<Direction>('flag-to-lien')
  const fromStore: StoreId = direction === 'flag-to-lien' ? 'flag' : 'lien'
  const toStore: StoreId = direction === 'flag-to-lien' ? 'lien' : 'flag'

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [qty, setQty] = useState(1)
  const [memo, setMemo] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [toast, setToast] = useState('')

  function getStock(productId: string, storeId: StoreId) {
    return stocks.find((s) => s.productId === productId && s.storeId === storeId)?.currentStock ?? 0
  }

  const dropProducts = search.length > 0
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : products.slice(0, 20)

  const selectedProduct = selectedId ? products.find((p) => p.id === selectedId) : null
  const fromStock = selectedId ? getStock(selectedId, fromStore) : 0

  function handleSelectProduct(id: string, name: string) {
    setSelectedId(id)
    setSearch(name)
    setShowDrop(false)
    setQty(1)
  }

  function clearProduct() {
    setSelectedId('')
    setSearch('')
    setShowDrop(false)
  }

  function changeDirection(d: Direction) {
    setDirection(d)
    clearProduct()
    setQty(1)
    setMemo('')
  }

  function handleTransfer() {
    if (!selectedId || qty <= 0) return
    directTransfer(fromStore, toStore, selectedId, qty, memo || undefined)
    const name = selectedProduct?.name ?? ''
    if (appSettings.notifyTransfer) {
      sendNotification(
        '店舗間移動',
        `${name} が移動されました。\n${fromLabel} → ${toLabel}: ${qty} 個${memo ? `\nメモ: ${memo}` : ''}`
      )
    }
    setToast(`${name} を ${qty} 個移動しました`)
    setTimeout(() => setToast(''), 2500)
    clearProduct()
    setMemo('')
    setQty(1)
  }

  const history = transfers.filter((t) => t.status !== '却下')

  const fromLabel = fromStore === 'flag' ? 'flag' : 'Lien'
  const toLabel = toStore === 'flag' ? 'flag' : 'Lien'
  const fromColor = fromStore === 'flag' ? '#2B5FA7' : '#8A4AA6'
  const toColor = toStore === 'flag' ? '#2B5FA7' : '#8A4AA6'

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="店舗間移動" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 overflow-y-auto bg-bg p-4 md:p-6">

          {/* Toast */}
          {toast && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-xl text-sm font-semibold pointer-events-none">
              ✓ {toast}
            </div>
          )}

          {/* 方向選択 */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              onClick={() => changeDirection('flag-to-lien')}
              className={`rounded-xl p-4 border-2 transition-all text-left active:scale-[0.98] ${
                direction === 'flag-to-lien'
                  ? 'border-accent bg-accent/5 shadow-sm'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-extrabold" style={{ color: '#2B5FA7' }}>flag</span>
                <span className="text-muted text-base">→</span>
                <span className="text-sm font-extrabold" style={{ color: '#8A4AA6' }}>Lien</span>
              </div>
              <p className="text-xs font-semibold text-text">flag から Lien へ送る</p>
            </button>

            <button
              onClick={() => changeDirection('lien-to-flag')}
              className={`rounded-xl p-4 border-2 transition-all text-left active:scale-[0.98] ${
                direction === 'lien-to-flag'
                  ? 'border-accent bg-accent/5 shadow-sm'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-extrabold" style={{ color: '#8A4AA6' }}>Lien</span>
                <span className="text-muted text-base">→</span>
                <span className="text-sm font-extrabold" style={{ color: '#2B5FA7' }}>flag</span>
              </div>
              <p className="text-xs font-semibold text-text">Lien から flag へ送る</p>
            </button>
          </div>

          {/* 移動フォーム */}
          <div className="bg-surface rounded-xl border border-border p-4 mb-5 flex flex-col gap-4">

            {/* 商品選択 */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted mb-1.5 block">商品</label>
              {selectedProduct ? (
                <div className="border-2 border-accent rounded-lg p-3 bg-accent/5 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text">{selectedProduct.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1 bg-surface border border-border rounded-md px-2 py-1">
                        <span className="text-xs font-bold" style={{ color: fromColor }}>{fromLabel}</span>
                        <span className="text-xs text-text font-semibold ml-1">{getStock(selectedId, fromStore)} 個</span>
                      </div>
                      <span className="text-muted text-sm">→</span>
                      <div className="flex items-center gap-1 bg-surface border border-border rounded-md px-2 py-1">
                        <span className="text-xs font-bold" style={{ color: toColor }}>{toLabel}</span>
                        <span className="text-xs text-text font-semibold ml-1">{getStock(selectedId, toStore)} 個</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onPointerDown={(e) => { e.preventDefault(); clearProduct() }}
                    className="text-xs text-muted hover:text-text px-2 py-1 flex-shrink-0"
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
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    placeholder="タップして商品一覧 / 商品名で検索"
                    className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-bg text-text outline-none focus:border-accent placeholder:text-faint"
                  />
                  {showDrop && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-surface border border-border rounded-md shadow-lg z-20 overflow-hidden max-h-52 overflow-y-auto">
                      {dropProducts.length === 0 ? (
                        <p className="px-3 py-3 text-sm text-faint">該当商品なし</p>
                      ) : (
                        dropProducts.map((p) => (
                          <button
                            key={p.id}
                            onMouseDown={() => handleSelectProduct(p.id, p.name)}
                            className="w-full text-left px-3 py-2.5 text-sm hover:bg-bg flex items-center justify-between border-b border-border last:border-0"
                          >
                            <span className="font-medium truncate mr-2">{p.name}</span>
                            <span className="text-xs text-muted flex-shrink-0">
                              {fromLabel} {getStock(p.id, fromStore)} 個
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
              <label className="text-xs font-semibold text-muted mb-1.5 block">移動数量</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-12 h-12 border border-border-strong rounded-lg text-2xl font-bold hover:bg-bg active:bg-border transition-colors"
                >
                  −
                </button>
                <div className="flex-1 h-12 border-2 border-accent rounded-lg flex items-center justify-center text-2xl font-bold text-accent">
                  {qty}
                </div>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-12 h-12 border border-border-strong rounded-lg text-2xl font-bold hover:bg-bg active:bg-border transition-colors"
                >
                  ＋
                </button>
              </div>
              {selectedProduct && qty > fromStock && (
                <p className="text-xs text-red-500 mt-1.5">
                  ⚠ {fromLabel} の在庫は {fromStock} 個です
                </p>
              )}
            </div>

            {/* メモ */}
            <div>
              <label className="text-xs font-semibold text-muted mb-1.5 block">メモ（任意）</label>
              <input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                placeholder="理由や備考を入力"
                className="w-full h-9 border border-border-strong rounded-md px-3 text-sm bg-bg text-text outline-none focus:border-accent placeholder:text-faint"
              />
            </div>

            {/* 実行ボタン */}
            <button
              onClick={handleTransfer}
              disabled={!selectedId}
              className={`w-full h-12 rounded-lg text-sm font-bold transition-all ${
                selectedId
                  ? 'bg-accent text-white hover:opacity-90 active:scale-[0.98]'
                  : 'bg-border text-faint cursor-not-allowed'
              }`}
            >
              <span style={{ color: fromColor, fontWeight: 900 }}>{fromLabel}</span>
              <span className="mx-1 text-white/80"> から </span>
              <span style={{ color: toColor, fontWeight: 900 }}>{toLabel}</span>
              <span className="text-white/80"> へ {qty} 個移動する</span>
            </button>
          </div>

          {/* 移動履歴 */}
          <p className="text-sm font-bold text-text mb-3">移動履歴</p>
          {history.length === 0 ? (
            <p className="text-sm text-faint text-center py-10">移動履歴がありません</p>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map((tr) => {
                const item = tr.items[0]
                const p = item ? products.find((pr) => pr.id === item.productId) : null
                const fColor = tr.fromStore === 'flag' ? '#2B5FA7' : '#8A4AA6'
                const tColor = tr.toStore === 'flag' ? '#2B5FA7' : '#8A4AA6'
                const fLabel = tr.fromStore === 'flag' ? 'flag' : 'Lien'
                const tLabel = tr.toStore === 'flag' ? 'flag' : 'Lien'
                return (
                  <div key={tr.id} className="bg-surface rounded-lg border border-border px-4 py-3 flex items-center gap-3">
                    <span className="text-xs text-faint w-14 flex-shrink-0">{tr.createdAt}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs font-bold" style={{ color: fColor }}>{fLabel}</span>
                      <span className="text-xs text-muted mx-0.5">→</span>
                      <span className="text-xs font-bold" style={{ color: tColor }}>{tLabel}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{p?.name ?? '不明商品'}</p>
                      {tr.memo && <p className="text-xs text-faint truncate">{tr.memo}</p>}
                    </div>
                    <span className="text-sm font-bold text-text flex-shrink-0">{item?.quantity ?? 0} 個</span>
                    {tr.status === '承認待ち' ? (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => approveTransfer(tr.id)}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded font-semibold"
                        >
                          承認
                        </button>
                        <button
                          onClick={() => rejectTransfer(tr.id)}
                          className="text-xs bg-red-500 text-white px-2 py-1 rounded font-semibold"
                        >
                          却下
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (confirm('この移動を取り消しますか？在庫も元に戻ります。')) {
                            deleteTransfer(tr.id)
                          }
                        }}
                        className="text-xs text-muted border border-border px-2 py-1 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors flex-shrink-0"
                      >
                        取消
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
