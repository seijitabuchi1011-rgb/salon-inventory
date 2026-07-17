import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Badge } from '../components/Badge'
import { Btn } from '../components/Btn'

const LOW_STOCK = [
  { id: '1', name: 'OWAY カラーマスク ヘナ', category: 'カラー剤', flag: 2, lien: 1, min: 4, need: 8, urgent: true },
  { id: '2', name: 'ナプラ ケアテクトHB', category: 'シャンプー', flag: 0, lien: 4, min: 3, need: 6, urgent: true },
  { id: '3', name: 'ミルボン オージュア クエンチ', category: 'トリートメント', flag: 3, lien: 2, min: 5, need: 10, urgent: false },
  { id: '4', name: 'ロレアル イノアカラー 6.0', category: 'カラー剤', flag: 1, lien: 5, min: 3, need: 4, urgent: false },
  { id: '5', name: 'ケラスターゼ フォンダン', category: 'トリートメント', flag: 4, lien: 3, min: 5, need: 6, urgent: false },
  { id: '6', name: 'デミ ヘアシーズンズ', category: 'オイル', flag: 2, lien: 6, min: 3, need: 4, urgent: false },
]

type Filter = 'すべて' | '緊急のみ' | 'flag店' | 'Lien店' | '両店とも不足'

export function LowStock() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['1', '2', '3', '4']))
  const [filter, setFilter] = useState<Filter>('すべて')

  const filtered = LOW_STOCK.filter((p) => {
    if (filter === '緊急のみ') return p.urgent
    if (filter === 'flag店') return p.flag <= p.min
    if (filter === 'Lien店') return p.lien <= p.min
    if (filter === '両店とも不足') return p.flag <= p.min && p.lien <= p.min
    return true
  })

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="在庫不足一覧" />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">
          <div className="px-6 pt-5 pb-3 bg-surface border-b border-border">
            {/* サマリー行 */}
            <div className="flex items-center gap-3 mb-4">
              <div>
                <p className="text-2xs text-faint">下限を下回っている商品</p>
                <p className="text-3xl font-bold text-text">
                  12 商品{' '}
                  <span className="text-sm text-danger font-semibold">· 緊急 2件</span>
                </p>
              </div>
              <div className="flex-1" />
              <Btn variant="ghost" size="sm">CSVエクスポート</Btn>
              <Btn variant="primary" size="sm" disabled={selected.size === 0}>
                ↧ 選択中 {selected.size}件をまとめて発注
              </Btn>
            </div>
            {/* フィルタチップ */}
            <div className="flex gap-2 overflow-x-auto">
              {(['すべて', '緊急のみ', 'flag店', 'Lien店', '両店とも不足'] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-shrink-0 px-3 h-7 rounded-full text-xs font-semibold transition-colors ${
                    filter === f ? 'bg-accent text-white' : 'bg-bg text-muted border border-border'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* テーブル */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-bg border-b border-border sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-3 w-10"></th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted">商品名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted w-28">カテゴリ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-16">flag</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-16">Lien</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-16">下限</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted w-24">推奨発注</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const checked = selected.has(p.id)
                  return (
                    <tr
                      key={p.id}
                      className={`border-b border-border transition-colors ${checked ? 'bg-accent-soft' : 'hover:bg-bg'}`}
                    >
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggle(p.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                            checked ? 'bg-text border-text text-white' : 'border-border-strong'
                          }`}
                        >
                          {checked && <span className="text-xs leading-none">✓</span>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text">{p.name}</span>
                          {p.urgent && <Badge variant="danger">緊急</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted">{p.category}</td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${p.flag <= p.min ? 'text-danger' : 'text-text'}`}>
                        {p.flag}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${p.lien <= p.min ? 'text-danger' : 'text-text'}`}>
                        {p.lien}
                      </td>
                      <td className="px-4 py-3 text-right text-muted tabular-nums">{p.min}</td>
                      <td className="px-4 py-3 text-right font-bold text-accent tabular-nums">{p.need} 個</td>
                      <td className="px-4 py-3 text-center">
                        <Btn variant="ghost" size="sm">発注</Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}
