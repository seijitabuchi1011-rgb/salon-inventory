import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { StoreDot } from '../components/StoreDot'
import { Btn } from '../components/Btn'
import { useAppStore } from '../store'

type Tab = 'receive' | 'dispense'

const CATEGORIES = [
  'すべて',
  'カラー剤', 'ブリーチ剤', 'カラーオキシ',
  'パーマ剤', 'プレックス剤', '髪ドラ',
  'oggi otto', 'H2', '処理剤', '小物類',
  'シャンプー', 'トリートメント', 'アウトバスTR', 'スタイリング', 'オイル',
]

type ModalState = {
  productId: string
  productName: string
  storeId: 'flag' | 'lien'
  currentStock: number
  minStock: number
  active: boolean
  quantity: number
}

export function Orders() {
  const { products, stocks, upsertStock } = useAppStore()
  const [tab, setTab] = useState<Tab>('receive')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('すべて')
  const [modal, setModal] = useState<ModalState | null>(null)

  function getStock(productId: string, storeId: 'flag' | 'lien') {
    return stocks.find((s) => s.productId === productId && s.storeId === storeId)
  }

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search)
    const matchCat = category === 'すべて' || p.category === category
    return matchSearch && matchCat
  })

  function openModal(productId: string, productName: string, storeId: 'flag' | 'lien') {
    const s = getStock(productId, storeId)
    setModal({
      productId,
      productName,
      storeId,
      currentStock: s?.currentStock ?? 0,
      minStock: s?.minStock ?? 3,
      active: s?.active ?? true,
      quantity: 1,
    })
  }

  function confirmTransaction() {
    if (!modal) return
    const newStock =
      tab === 'receive'
        ? modal.currentStock + modal.quantity
        : Math.max(0, modal.currentStock - modal.quantity)
    upsertStock({
      productId: modal.productId,
      storeId: modal.storeId,
      currentStock: newStock,
      minStock: modal.minStock,
      active: modal.active,
    })
    setModal(null)
  }

  const afterStock = modal
    ? tab === 'receive'
      ? modal.currentStock + modal.quantity
      : Math.max(0, modal.currentStock - modal.quantity)
    : 0

  const isReceive = tab === 'receive'

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="入荷・発注" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* フィルターヘッダー */}
          <div className="px-6 pt-4 pb-3 bg-surface border-b border-border flex flex-col gap-3">

            {/* タブ */}
            <div className="flex gap-2 items-center">
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setTab('receive')}
                  className={`px-5 py-2 text-sm font-bold transition-colors flex items-center gap-1.5 ${
                    tab === 'receive' ? 'bg-ok text-white' : 'bg-surface text-muted'
                  }`}
                >
                  <span className="text-base leading-none">↑</span> 仕入数
                </button>
                <button
                  onClick={() => setTab('dispense')}
                  className={`px-5 py-2 text-sm font-bold border-l border-border transition-colors flex items-center gap-1.5 ${
                    tab === 'dispense' ? 'bg-danger text-white' : 'bg-surface text-muted'
                  }`}
                >
                  <span className="text-base leading-none">↓</span> 払出数
                </button>
              </div>
              <p className="text-xs text-muted">
                {isReceive
                  ? '入荷・仕入れた数量を入力すると在庫が増えます'
                  : '使用・消費した数量を入力すると在庫が減ります'}
              </p>
            </div>

            {/* 検索 */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="商品名・バーコードで検索"
                className="w-full h-10 pl-8 pr-4 border border-border rounded-md text-sm bg-surface focus:outline-none focus:border-accent"
              />
            </div>

            {/* カテゴリ */}
            <div className="flex gap-2 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
                    category === cat ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <span className="ml-auto text-xs text-faint flex-shrink-0 self-center">
                {filtered.length} 商品
              </span>
            </div>
          </div>

          {/* テーブル */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-bg border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">カテゴリ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold w-20" style={{ color: '#2B5FA7' }}>
                    flag 在庫
                  </th>
                  <th className="w-24 px-3 py-3"></th>
                  <th className="text-right px-4 py-3 text-xs font-semibold w-20" style={{ color: '#8A4AA6' }}>
                    Lien 在庫
                  </th>
                  <th className="w-24 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const flagS = getStock(p.id, 'flag')
                  const lienS = getStock(p.id, 'lien')
                  const flagActive = flagS?.active ?? true
                  const lienActive = lienS?.active ?? true
                  const flagStock = flagS?.currentStock ?? 0
                  const lienStock = lienS?.currentStock ?? 0
                  const flagLow = flagActive && flagS && flagS.currentStock <= flagS.minStock
                  const lienLow = lienActive && lienS && lienS.currentStock <= lienS.minStock

                  return (
                    <tr key={p.id} className="border-b border-border hover:bg-bg transition-colors">
                      <td className="px-4 py-3 font-semibold text-text">{p.name}</td>
                      <td className="px-4 py-3 text-xs text-muted">{p.category}</td>

                      {/* flag 在庫 */}
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${
                        flagLow ? 'text-danger' : 'text-text'
                      }`}>
                        {flagActive
                          ? flagStock
                          : <span className="text-faint text-xs font-normal">取扱なし</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-center">
                        {flagActive && (
                          <button
                            onClick={() => openModal(p.id, p.name, 'flag')}
                            className={`w-full px-2 py-1.5 rounded-md text-xs font-bold text-white transition-colors ${
                              isReceive
                                ? 'bg-ok hover:bg-ok/80'
                                : 'bg-danger hover:bg-danger/80'
                            }`}
                          >
                            {isReceive ? '＋ 仕入' : '－ 払出'}
                          </button>
                        )}
                      </td>

                      {/* Lien 在庫 */}
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${
                        lienLow ? 'text-danger' : 'text-text'
                      }`}>
                        {lienActive
                          ? lienStock
                          : <span className="text-faint text-xs font-normal">取扱なし</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-center">
                        {lienActive && (
                          <button
                            onClick={() => openModal(p.id, p.name, 'lien')}
                            className={`w-full px-2 py-1.5 rounded-md text-xs font-bold text-white transition-colors ${
                              isReceive
                                ? 'bg-ok hover:bg-ok/80'
                                : 'bg-danger hover:bg-danger/80'
                            }`}
                          >
                            {isReceive ? '＋ 仕入' : '－ 払出'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* 仕入/払出 入力モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-84 shadow-xl flex flex-col gap-4" style={{ width: '340px' }}>

            {/* ヘッダー */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StoreDot store={modal.storeId} />
                <span className="text-xs font-bold" style={{ color: modal.storeId === 'flag' ? '#2B5FA7' : '#8A4AA6' }}>
                  {modal.storeId === 'flag' ? 'flag 美容室' : 'Lien 美容室'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isReceive ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'
                }`}>
                  {isReceive ? '↑ 仕入数' : '↓ 払出数'}
                </span>
              </div>
              <p className="text-base font-bold leading-snug">{modal.productName}</p>
              <p className="text-xs text-muted mt-0.5">現在庫: {modal.currentStock} 個</p>
            </div>

            {/* 数量ステッパー */}
            <div>
              <p className="text-xs font-semibold text-muted mb-2">
                {isReceive ? '仕入数量' : '払出数量'}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setModal((m) => m && { ...m, quantity: Math.max(1, m.quantity - 1) })}
                  className="w-16 h-16 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg transition-colors"
                >
                  −
                </button>
                <div className={`flex-1 h-16 border-2 rounded-md flex items-center justify-center text-3xl font-bold ${
                  isReceive ? 'border-ok text-ok' : 'border-danger text-danger'
                }`}>
                  {modal.quantity}
                </div>
                <button
                  onClick={() => setModal((m) => m && { ...m, quantity: m.quantity + 1 })}
                  className="w-16 h-16 border border-border-strong rounded-md text-2xl font-bold hover:bg-bg transition-colors"
                >
                  ＋
                </button>
              </div>
            </div>

            {/* 変更後プレビュー */}
            <div className="bg-bg rounded-lg px-4 py-3">
              <p className="text-xs text-muted mb-1">変更後の在庫</p>
              <p className="text-lg font-bold text-text">
                {modal.currentStock}{' '}
                <span className={isReceive ? 'text-ok' : 'text-danger'}>
                  {isReceive ? '＋' : '－'} {modal.quantity}
                </span>
                {' '}＝{' '}
                <span className={afterStock <= modal.minStock ? 'text-danger' : 'text-text'}>
                  {afterStock} 個
                </span>
                {afterStock <= modal.minStock && (
                  <span className="text-xs text-danger ml-2">⚠ 下限以下</span>
                )}
              </p>
            </div>

            {/* ボタン */}
            <div className="flex gap-2">
              <Btn variant="ghost" className="flex-1" onClick={() => setModal(null)}>
                キャンセル
              </Btn>
              <Btn variant="primary" className="flex-[2]" onClick={confirmTransaction}>
                ✓ 確定
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
