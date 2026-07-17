import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'

type Tab = '発注中' | '入荷待ち' | '入荷済 (今月)' | '下書き'

const TABS: { label: Tab; count: number }[] = [
  { label: '発注中', count: 3 },
  { label: '入荷待ち', count: 5 },
  { label: '入荷済 (今月)', count: 12 },
  { label: '下書き', count: 2 },
]

const ORDERS = [
  { id: 'PO-2026-0142', vendor: 'ミルボン株式会社', items: 8, total: '¥42,800', date: '2026-07-14', eta: '2026-07-18', status: '発送済' as const },
  { id: 'PO-2026-0141', vendor: 'ホーユープロ', items: 5, total: '¥18,500', date: '2026-07-13', eta: '2026-07-17', status: '確認中' as const },
  { id: 'PO-2026-0140', vendor: 'ケラスターゼ', items: 3, total: '¥15,600', date: '2026-07-11', eta: '2026-07-16', status: '本日到着' as const },
]

type OrderStatus = '本日到着' | '発送済' | '確認中'

const STATUS_VARIANT: Record<OrderStatus, 'accent' | 'ok' | 'warn'> = {
  '本日到着': 'accent',
  '発送済': 'ok',
  '確認中': 'warn',
}

export function Orders() {
  const [tab, setTab] = useState<Tab>('発注中')

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="入荷・発注管理" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg p-6">
          {/* タブ行 */}
          <div className="flex items-end border-b border-border mb-5">
            {TABS.map(({ label, count }) => (
              <button
                key={label}
                onClick={() => setTab(label)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
                  tab === label
                    ? 'border-text text-text'
                    : 'border-transparent text-muted hover:text-text'
                }`}
              >
                {label}
                <span
                  className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                    tab === label ? 'bg-text text-white' : 'bg-bg text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
            <div className="flex-1" />
            <div className="mb-1">
              <Btn variant="primary" size="sm">＋ 新規発注</Btn>
            </div>
          </div>

          {/* 発注カードリスト */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {ORDERS.map((order) => (
              <Card key={order.id} className="flex items-center gap-4">
                {/* 発注ID + 仕入先 */}
                <div className="min-w-[140px]">
                  <p className="text-2xs text-faint font-mono">{order.id}</p>
                  <p className="text-md font-bold text-text">{order.vendor}</p>
                </div>

                {/* 4カラムメタ */}
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div>
                    <p className="text-2xs text-muted">商品数</p>
                    <p className="text-sm font-bold">{order.items}種</p>
                  </div>
                  <div>
                    <p className="text-2xs text-muted">合計</p>
                    <p className="text-sm font-bold tabular-nums">{order.total}</p>
                  </div>
                  <div>
                    <p className="text-2xs text-muted">発注日</p>
                    <p className="text-sm">{order.date}</p>
                  </div>
                  <div>
                    <p className="text-2xs text-muted">入荷予定</p>
                    <p className="text-sm font-semibold">{order.eta}</p>
                  </div>
                </div>

                <Badge variant={STATUS_VARIANT[order.status]}>{order.status}</Badge>
                <Btn variant="ghost" size="sm">▦ 入荷登録</Btn>
              </Card>
            ))}

            {/* 空状態（タブ切替時） */}
            {tab !== '発注中' && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted gap-2">
                <span className="text-3xl">📦</span>
                <p className="text-sm">該当なし</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
