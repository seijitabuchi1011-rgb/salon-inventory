import { useState, useRef, useEffect } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { StoreDot } from '../components/StoreDot'
import { Btn } from '../components/Btn'
import { useAppStore } from '../store'
import { sendNotification } from '../lib/email'

type Tab = 'receive' | 'dispense'

type ModalState = {
  productId: string
  productName: string
  storeId: string
  currentStock: number
  minStock: number
  active: boolean
  quantity: number
  dispensedBy: string
}

export function Orders({ fixedMode }: { fixedMode?: Tab }) {
  const { products, upsertStock, addTransaction, deleteTransaction, currentStore, appSettings, storeInfo, storeOrder, categories } = useAppStore()
  const visibleStores = currentStore === 'all' ? storeOrder : storeOrder.filter((id) => id === currentStore)
  const [tabState, setTabState] = useState<Tab>('receive')
  const tab = fixedMode ?? tabState
  const setTab = fixedMode ? () => {} : setTabState
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('すべて')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // useSyncExternalStoreのiOS Safari問題を回避: vanillaのsubscribeで直接監視
  const [stocks, setStocks] = useState(() => useAppStore.getState().stocks)
  const [transactions, setTransactions] = useState(() => useAppStore.getState().transactions)
  useEffect(() => {
    setStocks(useAppStore.getState().stocks)
    setTransactions(useAppStore.getState().transactions)
    return useAppStore.subscribe((state) => {
      setStocks(state.stocks)
      setTransactions(state.transactions)
    })
  }, [])

  const isReceive = tab === 'receive'

  // 今月の仕入れ件数（ヘッダー表示用）
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()
  const thisMonthReceiveCount = transactions.filter(
    (t) => t.type === 'receive' && t.timestamp >= monthStart && t.timestamp <= monthEnd
  ).length

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  function getStock(productId: string, storeId: string) {
    return stocks.find((s) => s.productId === productId && s.storeId === storeId)
  }

  // ワンタッチで ±1
  function quickUpdate(productId: string, storeId: string, delta: number) {
    // getState()で最新在庫を取得（iOS SafariのuseStateステール回避）
    const s = useAppStore.getState().stocks.find((st) => st.productId === productId && st.storeId === storeId)
    const currentStock = s?.currentStock ?? 0
    const next = Math.max(0, currentStock + delta)
    // 在庫0でマイナス押下 → 実質変化なし、トランザクション不要
    if (next === currentStock && delta < 0) return
    upsertStock({ productId, storeId, currentStock: next, minStock: s?.minStock ?? 3, active: s?.active ?? true })
    if (delta !== 0) {
      if (isReceive && delta < 0) {
        // 仕入れモードの修正（カウントダウン）→ 最新の仕入れトランザクションを削除（今月仕入高に反映しない）
        const lastReceive = useAppStore.getState().transactions.find(
          (t) => t.type === 'receive' && t.productId === productId && t.storeId === storeId
        )
        if (lastReceive) {
          deleteTransaction(lastReceive.id)
          const p = products.find((pr) => pr.id === productId)
          showToast(`修正: ${p?.name ?? '商品'} −1 (仕入れ取消)`)
        }
      } else if (!isReceive && delta > 0) {
        // 払出しモードの修正（カウントアップ）→ 最新の払出しトランザクションを削除
        const lastDispense = useAppStore.getState().transactions.find(
          (t) => t.type === 'dispense' && t.productId === productId && t.storeId === storeId
        )
        if (lastDispense) {
          deleteTransaction(lastDispense.id)
          const p = products.find((pr) => pr.id === productId)
          showToast(`修正: ${p?.name ?? '商品'} +1 (払出し取消)`)
        }
      } else {
        try {
          addTransaction({ type: delta > 0 ? 'receive' : 'dispense', productId, storeId, quantity: Math.abs(delta) })
        } catch (e) {
          console.error('[addTransaction]', e)
          showToast(`記録エラー: ${e instanceof Error ? e.message.slice(0, 40) : String(e).slice(0, 40)}`)
          return
        }
        if (delta > 0) {
          const p = products.find((pr) => pr.id === productId)
          showToast(`仕入れ記録: ${p?.name ?? '商品'} +1`)
        }
      }
    }
    const notifyThisStore = appSettings.notifyLowStockByStore?.[storeId] ?? appSettings.notifyLowStock
    if (delta < 0 && notifyThisStore && next <= (s?.minStock ?? 3)) {
      const p = products.find((pr) => pr.id === productId)
      sendNotification(
        '在庫不足アラート',
        `${p?.name ?? '商品'} の在庫が下限を下回りました。\n店舗: ${storeInfo[storeId]?.name ?? storeId}\n現在庫: ${next} 個（下限: ${s?.minStock ?? 3} 個）`
      )
    }
  }

  // モーダルで任意数を入力
  function openModal(productId: string, productName: string, storeId: string) {
    const s = getStock(productId, storeId)
    setModal({
      productId,
      productName,
      storeId,
      currentStock: s?.currentStock ?? 0,
      minStock: s?.minStock ?? 3,
      active: s?.active ?? true,
      quantity: 1,
      dispensedBy: '',
    })
  }

  function confirmTransaction() {
    if (!modal) return
    const newStock = isReceive
      ? modal.currentStock + modal.quantity
      : Math.max(0, modal.currentStock - modal.quantity)
    upsertStock({ productId: modal.productId, storeId: modal.storeId, currentStock: newStock, minStock: modal.minStock, active: modal.active })
    addTransaction({
      type: isReceive ? 'receive' : 'dispense',
      productId: modal.productId,
      storeId: modal.storeId,
      quantity: modal.quantity,
      ...((!isReceive && modal.dispensedBy) ? { dispensedBy: modal.dispensedBy } : {}),
    })
    const notifyThisStore = appSettings.notifyLowStockByStore?.[modal.storeId] ?? appSettings.notifyLowStock
    if (!isReceive && notifyThisStore && newStock <= modal.minStock) {
      sendNotification(
        '在庫不足アラート',
        `${modal.productName} の在庫が下限を下回りました。\n店舗: ${storeInfo[modal.storeId]?.name ?? modal.storeId}\n現在庫: ${newStock} 個（下限: ${modal.minStock} 個）`
      )
    }
    if (isReceive) {
      showToast(`仕入れ記録: ${modal.productName} +${modal.quantity} → 今月仕入高に追加`)
    }
    setModal(null)
  }

  const afterStock = modal
    ? isReceive
      ? modal.currentStock + modal.quantity
      : Math.max(0, modal.currentStock - modal.quantity)
    : 0

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search)
    const matchCat = category === 'すべて' || p.category === category
    return matchSearch && matchCat
  })

  // ストアカラム：在庫数 ＋ ワンタッチボタン ＋ 詳細ボタン
  function StoreCell({
    productId,
    productName,
    storeId,
  }: {
    productId: string
    productName: string
    storeId: string
  }) {
    const s = getStock(productId, storeId)
    const active = s?.active ?? true
    const stock = s?.currentStock ?? 0
    const low = active && s != null && s.currentStock <= s.minStock

    if (!active) {
      return (
        <>
          <td className="px-4 py-3 text-right">
            <span className="text-faint text-xs">取扱なし</span>
          </td>
          <td className="px-2 py-3 w-36"></td>
        </>
      )
    }

    return (
      <>
        {/* 在庫数（タップでモーダル） */}
        <td className="px-4 py-3 text-right">
          <button
            onClick={() => openModal(productId, productName, storeId)}
            className={`text-base font-bold tabular-nums underline decoration-dashed underline-offset-2 ${
              low ? 'text-danger' : 'text-text'
            }`}
          >
            {stock}
          </button>
        </td>

        {/* ワンタッチ ＋/ー */}
        <td className="px-2 py-2 w-36">
          <div className="flex items-center gap-1 justify-center">
            {/* ー ボタン（払出） */}
            <button
              onClick={() => quickUpdate(productId, storeId, -1)}
              className={`w-10 h-10 rounded-lg text-lg font-bold transition-all active:scale-95 flex items-center justify-center ${
                !isReceive
                  ? 'bg-danger text-white shadow-sm'
                  : 'bg-bg border border-border text-muted'
              }`}
            >
              −
            </button>
            {/* ＋ ボタン（仕入） */}
            <button
              onClick={() => quickUpdate(productId, storeId, +1)}
              className={`w-10 h-10 rounded-lg text-lg font-bold transition-all active:scale-95 flex items-center justify-center ${
                isReceive
                  ? 'bg-ok text-white shadow-sm'
                  : 'bg-bg border border-border text-muted'
              }`}
            >
              ＋
            </button>
          </div>
        </td>
      </>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title={fixedMode === 'dispense' ? '払出し' : '仕入れ'} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* フィルターヘッダー */}
          <div className="px-6 pt-4 pb-3 bg-surface border-b border-border flex flex-col gap-3">

            {/* タブ（fixedMode時は非表示） */}
            {!fixedMode && (
              <div className="flex gap-3 items-center">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    onClick={() => setTab('receive')}
                    className={`px-5 py-2 text-sm font-bold transition-colors flex items-center gap-1.5 ${
                      tab === 'receive' ? 'bg-ok text-white' : 'bg-surface text-muted'
                    }`}
                  >
                    ↑ 仕入数
                  </button>
                  <button
                    onClick={() => setTab('dispense')}
                    className={`px-5 py-2 text-sm font-bold border-l border-border transition-colors flex items-center gap-1.5 ${
                      tab === 'dispense' ? 'bg-danger text-white' : 'bg-surface text-muted'
                    }`}
                  >
                    ↓ 払出数
                  </button>
                </div>
                <p className="text-xs text-muted">
                  {isReceive
                    ? '緑の ＋ をタップで即カウントアップ。数字をタップで任意入力'
                    : '赤の − をタップで即カウントダウン。数字をタップで任意入力'}
                </p>
              </div>
            )}
            {fixedMode && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">
                  {isReceive
                    ? '緑の ＋ をタップで即カウントアップ。数字をタップで任意入力'
                    : '赤の − をタップで即カウントダウン。数字をタップで任意入力'}
                </p>
                {isReceive && (
                  <span className="text-xs font-bold text-ok bg-ok-soft px-2 py-1 rounded-full flex-shrink-0">
                    今月 {thisMonthReceiveCount}件 (全{transactions.length}件)
                  </span>
                )}
              </div>
            )}

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
              {['すべて', ...categories].map((cat) => (
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
            <table className="w-full min-w-[540px] text-sm border-collapse">
              <thead className="bg-bg border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">カテゴリ</th>
                  {visibleStores.map((sid) => (
                    <>
                      <th key={sid + '-stock'} className="text-right px-4 py-3 text-xs font-semibold w-20" style={{ color: storeInfo[sid]?.color ?? '#888888' }}>
                        {storeInfo[sid]?.name ?? sid}
                      </th>
                      <th key={sid + '-btn'} className="w-36 px-2 py-3 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <span className="text-xs text-danger font-semibold">−</span>
                          <span className="text-xs text-muted font-semibold">/</span>
                          <span className="text-xs text-ok font-semibold">＋</span>
                        </div>
                      </th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-bg transition-colors">
                    <td className="px-4 py-2 font-semibold text-text">{p.name}</td>
                    <td className="px-4 py-2 text-xs text-muted">{p.category}</td>
                    {visibleStores.map((sid) => (
                      <StoreCell key={sid} productId={p.id} productName={p.name} storeId={sid} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* 任意数入力モーダル */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-xl flex flex-col gap-4" style={{ width: '340px' }}>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <StoreDot store={modal.storeId} />
                <span
                  className="text-xs font-bold"
                  style={{ color: storeInfo[modal.storeId]?.color ?? '#888888' }}
                >
                  {storeInfo[modal.storeId]?.name ?? modal.storeId}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${
                  isReceive ? 'bg-ok-soft text-ok' : 'bg-danger-soft text-danger'
                }`}>
                  {isReceive ? '↑ 仕入数' : '↓ 払出数'}
                </span>
              </div>
              <p className="text-base font-bold leading-snug">{modal.productName}</p>
              <p className="text-xs text-muted mt-0.5">現在庫: {modal.currentStock} 個</p>
            </div>

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

            <div className="bg-bg rounded-lg px-4 py-3">
              <p className="text-xs text-muted mb-1">変更後の在庫</p>
              <p className="text-lg font-bold">
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

            {/* 払出し時のみ：卸した人 */}
            {!isReceive && (
              <div>
                <p className="text-xs font-semibold text-muted mb-2">卸した人 <span className="font-normal text-faint">（省略可）</span></p>
                <input
                  value={modal.dispensedBy}
                  onChange={(e) => setModal((m) => m && { ...m, dispensedBy: e.target.value })}
                  placeholder="名前を入力すると購入履歴に記録"
                  className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-danger"
                />
              </div>
            )}

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

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-ok text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
