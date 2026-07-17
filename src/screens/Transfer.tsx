import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'
import { Card } from '../components/Card'
import { StoreDot } from '../components/StoreDot'

type TransferStatus = '承認待ち' | '承認済' | '却下'

const STATUS_VARIANT: Record<TransferStatus, 'warn' | 'ok' | 'danger'> = {
  承認待ち: 'warn',
  承認済: 'ok',
  却下: 'danger',
}

const TRANSFERS = [
  {
    id: 'TR-2026-0031',
    from: 'flag' as const,
    to: 'lien' as const,
    createdAt: '2026-07-16',
    status: '承認待ち' as TransferStatus,
    items: [
      { name: 'OWAY カラーマスク ヘナ', qty: 2 },
      { name: 'ナプラ ケアテクトHB', qty: 3 },
    ],
    memo: '週次補充',
  },
  {
    id: 'TR-2026-0030',
    from: 'lien' as const,
    to: 'flag' as const,
    createdAt: '2026-07-14',
    status: '承認済' as TransferStatus,
    items: [
      { name: 'ケラスターゼ ソワン オレオ', qty: 1 },
    ],
    memo: '',
  },
  {
    id: 'TR-2026-0029',
    from: 'flag' as const,
    to: 'lien' as const,
    createdAt: '2026-07-10',
    status: '承認済' as TransferStatus,
    items: [
      { name: 'デミ アドミオオイル', qty: 5 },
      { name: 'アジュバン コンポジオ EX', qty: 2 },
    ],
    memo: '月初補充',
  },
  {
    id: 'TR-2026-0028',
    from: 'lien' as const,
    to: 'flag' as const,
    createdAt: '2026-07-05',
    status: '承認済' as TransferStatus,
    items: [
      { name: 'ミルボン ジェミールフラン シャンプー 500ml', qty: 4 },
    ],
    memo: '',
  },
]

type FilterType = 'すべて' | '承認待ち' | '承認済'

export function Transfer() {
  const [filter, setFilter] = useState<FilterType>('すべて')
  const [showModal, setShowModal] = useState(false)

  const filtered = TRANSFERS.filter((t) => {
    if (filter === 'すべて') return true
    return t.status === filter
  })

  const pendingCount = TRANSFERS.filter((t) => t.status === '承認待ち').length

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="店舗間移動" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg p-6">
          {/* ヘッダー行 */}
          <div className="flex items-center gap-3 mb-5">
            <div>
              <p className="text-2xs text-faint">承認待ちの移動依頼</p>
              <p className="text-3xl font-bold text-text">
                {pendingCount} 件{' '}
                {pendingCount > 0 && (
                  <span className="text-sm text-warn font-semibold">· 要対応</span>
                )}
              </p>
            </div>
            <div className="flex-1" />
            <Btn variant="primary" size="sm" onClick={() => setShowModal(true)}>＋ 移動申請</Btn>
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

          {/* カードリスト */}
          <div className="flex flex-col gap-3 overflow-y-auto">
            {filtered.map((transfer) => (
              <Card key={transfer.id}>
                <div className="flex items-start gap-4">
                  {/* 移動ID */}
                  <div className="min-w-[120px]">
                    <p className="text-2xs text-faint font-mono mb-1">{transfer.id}</p>
                    <p className="text-xs text-muted">{transfer.createdAt}</p>
                  </div>

                  {/* 移動方向 */}
                  <div className="flex items-center gap-2 min-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <StoreDot store={transfer.from} />
                      <span className={`text-sm font-bold text-${transfer.from}`}>
                        {transfer.from === 'flag' ? 'flag' : 'Lien'}
                      </span>
                    </div>
                    <span className="text-muted text-lg">→</span>
                    <div className="flex items-center gap-1.5">
                      <StoreDot store={transfer.to} />
                      <span className={`text-sm font-bold text-${transfer.to}`}>
                        {transfer.to === 'flag' ? 'flag' : 'Lien'}
                      </span>
                    </div>
                  </div>

                  {/* 商品リスト */}
                  <div className="flex-1">
                    {transfer.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-text">{item.name}</span>
                        <span className="font-bold tabular-nums ml-4">{item.qty} 個</span>
                      </div>
                    ))}
                    {transfer.memo && (
                      <p className="text-xs text-faint mt-1">{transfer.memo}</p>
                    )}
                  </div>

                  {/* ステータス＋アクション */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={STATUS_VARIANT[transfer.status]}>{transfer.status}</Badge>
                    {transfer.status === '承認待ち' && (
                      <>
                        <Btn variant="primary" size="sm">承認</Btn>
                        <Btn variant="danger" size="sm">却下</Btn>
                      </>
                    )}
                    {transfer.status === '承認済' && (
                      <Btn variant="ghost" size="sm">詳細</Btn>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>

      {/* 移動申請モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 w-[480px] shadow-xl">
            <p className="text-lg font-bold mb-4">店舗間移動を申請</p>
            <div className="flex flex-col gap-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted mb-1.5 block">移動元</label>
                  <select className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent">
                    <option>flag 美容室</option>
                    <option>Lien 美容室</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted mb-1.5 block">移動先</label>
                  <select className="w-full h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent">
                    <option>Lien 美容室</option>
                    <option>flag 美容室</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">商品・数量</label>
                <div className="border border-border-strong rounded-md p-3 bg-bg text-sm text-faint text-center py-6">
                  ＋ 商品を追加
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted mb-1.5 block">メモ (任意)</label>
                <textarea
                  placeholder="理由や備考を入力"
                  className="w-full min-h-[64px] border border-border-strong rounded-md p-3 text-sm bg-surface text-text outline-none resize-none focus:border-accent placeholder:text-faint"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Btn variant="ghost" onClick={() => setShowModal(false)}>キャンセル</Btn>
              <Btn variant="primary" onClick={() => setShowModal(false)}>申請する</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
