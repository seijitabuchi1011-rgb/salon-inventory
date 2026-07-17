import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { Btn } from '../components/Btn'
import { StoreDot } from '../components/StoreDot'

type Section = '店舗設定' | '在庫アラート' | '通知設定' | 'データ管理'

const SECTIONS: Section[] = ['店舗設定', '在庫アラート', '通知設定', 'データ管理']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-accent' : 'bg-border'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-semibold text-text">{label}</p>
        {sub && <p className="text-xs text-faint mt-0.5">{sub}</p>}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  )
}

export function Settings() {
  const [section, setSection] = useState<Section>('店舗設定')

  // 在庫アラート閾値
  const [flagThreshold, setFlagThreshold] = useState(5)
  const [lienThreshold, setLienThreshold] = useState(3)

  // 通知
  const [notifyLowStock, setNotifyLowStock] = useState(true)
  const [notifyOrder, setNotifyOrder] = useState(true)
  const [notifyTransfer, setNotifyTransfer] = useState(false)
  const [notifyStocktake, setNotifyStocktake] = useState(true)

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="設定" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex overflow-hidden bg-bg">
          {/* セクションタブ（縦） */}
          <div className="w-48 flex-shrink-0 bg-surface border-r border-border py-3 flex flex-col">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`text-left px-5 py-3 text-sm font-semibold transition-colors ${
                  section === s
                    ? 'text-accent bg-accent-soft border-r-2 border-accent'
                    : 'text-muted hover:text-text hover:bg-bg'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-8">
            {section === '店舗設定' && (
              <div className="max-w-xl flex flex-col gap-5">
                <h2 className="text-lg font-bold">店舗設定</h2>

                {/* flag */}
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <StoreDot store="flag" />
                    <span className="text-sm font-bold text-flag">flag 美容室</span>
                  </div>
                  <Row label="店舗名">
                    <input
                      defaultValue="flag 美容室"
                      className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent"
                    />
                  </Row>
                  <Row label="電話番号">
                    <input
                      defaultValue="03-1234-5678"
                      className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent"
                    />
                  </Row>
                  <Row label="住所">
                    <input
                      defaultValue="東京都渋谷区..."
                      className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent"
                    />
                  </Row>
                </Card>

                {/* lien */}
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <StoreDot store="lien" />
                    <span className="text-sm font-bold text-lien">Lien 美容室</span>
                  </div>
                  <Row label="店舗名">
                    <input
                      defaultValue="Lien 美容室"
                      className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent"
                    />
                  </Row>
                  <Row label="電話番号">
                    <input
                      defaultValue="03-8765-4321"
                      className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent"
                    />
                  </Row>
                  <Row label="住所">
                    <input
                      defaultValue="東京都新宿区..."
                      className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent"
                    />
                  </Row>
                </Card>

                <div className="flex justify-end">
                  <Btn variant="primary">変更を保存</Btn>
                </div>
              </div>
            )}

            {section === '在庫アラート' && (
              <div className="max-w-xl flex flex-col gap-5">
                <div>
                  <h2 className="text-lg font-bold">在庫アラート</h2>
                  <p className="text-sm text-muted mt-1">在庫数が下限を下回ったときにアラートを表示します。</p>
                </div>

                <Card>
                  <p className="text-xs font-semibold text-muted mb-3">デフォルト下限数 (新規商品登録時の初期値)</p>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <StoreDot store="flag" />
                        <span className="text-sm font-bold text-flag">flag 美容室</span>
                      </div>
                      <div className="flex items-center h-10 border border-border-strong rounded-md overflow-hidden">
                        <button onClick={() => setFlagThreshold(Math.max(0, flagThreshold - 1))} className="w-9 flex items-center justify-center text-muted hover:bg-bg">−</button>
                        <span className="flex-1 text-center font-bold tabular-nums">{flagThreshold}</span>
                        <button onClick={() => setFlagThreshold(flagThreshold + 1)} className="w-9 flex items-center justify-center text-muted hover:bg-bg">＋</button>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <StoreDot store="lien" />
                        <span className="text-sm font-bold text-lien">Lien 美容室</span>
                      </div>
                      <div className="flex items-center h-10 border border-border-strong rounded-md overflow-hidden">
                        <button onClick={() => setLienThreshold(Math.max(0, lienThreshold - 1))} className="w-9 flex items-center justify-center text-muted hover:bg-bg">−</button>
                        <span className="flex-1 text-center font-bold tabular-nums">{lienThreshold}</span>
                        <button onClick={() => setLienThreshold(lienThreshold + 1)} className="w-9 flex items-center justify-center text-muted hover:bg-bg">＋</button>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <p className="text-xs font-semibold text-muted mb-3">アラート表示条件</p>
                  <Row label="緊急アラート" sub="現在庫 ≤ 下限数のとき">
                    <Badge variant="danger">常時ON</Badge>
                  </Row>
                  <Row label="警告アラート" sub="現在庫 ≤ 下限数 × 1.5のとき">
                    <Badge variant="warn">常時ON</Badge>
                  </Row>
                </Card>

                <div className="flex justify-end">
                  <Btn variant="primary">変更を保存</Btn>
                </div>
              </div>
            )}

            {section === '通知設定' && (
              <div className="max-w-xl flex flex-col gap-5">
                <h2 className="text-lg font-bold">通知設定</h2>

                <Card>
                  <Row label="在庫不足アラート" sub="下限を下回った商品が発生したとき">
                    <Toggle value={notifyLowStock} onChange={setNotifyLowStock} />
                  </Row>
                  <Row label="入荷・発注通知" sub="発注ステータスが変更されたとき">
                    <Toggle value={notifyOrder} onChange={setNotifyOrder} />
                  </Row>
                  <Row label="店舗間移動申請" sub="移動依頼が届いたとき">
                    <Toggle value={notifyTransfer} onChange={setNotifyTransfer} />
                  </Row>
                  <Row label="棚卸リマインダー" sub="毎月末5日前">
                    <Toggle value={notifyStocktake} onChange={setNotifyStocktake} />
                  </Row>
                </Card>

                <div className="flex justify-end">
                  <Btn variant="primary">変更を保存</Btn>
                </div>
              </div>
            )}

            {section === 'データ管理' && (
              <div className="max-w-xl flex flex-col gap-5">
                <h2 className="text-lg font-bold">データ管理</h2>

                <Card>
                  <p className="text-xs font-semibold text-muted mb-3">エクスポート</p>
                  <Row label="商品マスタ" sub="全商品データをCSVでダウンロード">
                    <Btn variant="ghost" size="sm">↓ CSV</Btn>
                  </Row>
                  <Row label="在庫一覧" sub="現在の在庫数をCSVでダウンロード">
                    <Btn variant="ghost" size="sm">↓ CSV</Btn>
                  </Row>
                  <Row label="販売実績" sub="指定期間の販売データをCSVでダウンロード">
                    <Btn variant="ghost" size="sm">↓ CSV</Btn>
                  </Row>
                  <Row label="棚卸履歴" sub="過去の棚卸データをCSVでダウンロード">
                    <Btn variant="ghost" size="sm">↓ CSV</Btn>
                  </Row>
                </Card>

                <Card>
                  <p className="text-xs font-semibold text-muted mb-3">インポート</p>
                  <Row label="商品マスタ一括登録" sub="CSVファイルから商品を一括登録">
                    <Btn variant="ghost" size="sm">↑ CSV</Btn>
                  </Row>
                </Card>

                <Card>
                  <p className="text-xs font-semibold text-muted mb-3">アプリ情報</p>
                  <Row label="バージョン">
                    <span className="text-sm text-muted font-mono">1.0.0</span>
                  </Row>
                  <Row label="最終同期">
                    <span className="text-sm text-muted">2026-07-17 09:32</span>
                  </Row>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

function Badge({ children, variant }: { children: React.ReactNode; variant: 'danger' | 'warn' }) {
  const styles = {
    danger: 'bg-danger-soft text-danger',
    warn: 'bg-warn-soft text-warn',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  )
}
