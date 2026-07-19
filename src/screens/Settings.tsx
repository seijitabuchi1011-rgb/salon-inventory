import { useState } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { Btn } from '../components/Btn'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import type { StoreInfo } from '../store'

type Section = '店舗設定' | 'スタッフ管理' | '在庫アラート' | '通知設定' | 'データ管理'
const SECTIONS: Section[] = ['店舗設定', 'スタッフ管理', '在庫アラート', '通知設定', 'データ管理']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-accent' : 'bg-border'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
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

function Badge({ children, variant }: { children: React.ReactNode; variant: 'danger' | 'warn' }) {
  const styles = { danger: 'bg-danger-soft text-danger', warn: 'bg-warn-soft text-warn' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[variant]}`}>
      {children}
    </span>
  )
}

function Toast({ msg }: { msg: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-text text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg pointer-events-none">
      {msg}
    </div>
  )
}

function downloadCSV(filename: string, rows: string[][]) {
  const bom = '﻿'
  const csv = bom + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Settings() {
  const {
    products, stocks, transactions, staffPurchases,
    storeInfo, setStoreInfo,
    appSettings, setAppSettings,
    staffMembers, addStaffMember, removeStaffMember,
  } = useAppStore()

  const [section, setSection] = useState<Section>('店舗設定')
  const [toast, setToast] = useState('')
  const [newStaffName, setNewStaffName] = useState('')

  // 店舗設定ローカル状態
  const [flag, setFlag] = useState<StoreInfo>({ ...storeInfo.flag })
  const [lien, setLien] = useState<StoreInfo>({ ...storeInfo.lien })

  // 在庫アラートローカル状態
  const [flagMin, setFlagMin] = useState(appSettings.flagMinStock)
  const [lienMin, setLienMin] = useState(appSettings.lienMinStock)

  // 通知設定ローカル状態
  const [notifyLowStock, setNotifyLowStock] = useState(appSettings.notifyLowStock)
  const [notifyOrder, setNotifyOrder] = useState(appSettings.notifyOrder)
  const [notifyTransfer, setNotifyTransfer] = useState(appSettings.notifyTransfer)
  const [notifyStocktake, setNotifyStocktake] = useState(appSettings.notifyStocktake)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function saveStoreInfo() {
    setStoreInfo('flag', flag)
    setStoreInfo('lien', lien)
    showToast('店舗設定を保存しました')
  }

  function saveAlertSettings() {
    setAppSettings({ flagMinStock: flagMin, lienMinStock: lienMin })
    showToast('在庫アラート設定を保存しました')
  }

  function saveNotifySettings() {
    setAppSettings({ notifyLowStock, notifyOrder, notifyTransfer, notifyStocktake })
    showToast('通知設定を保存しました')
  }

  function exportProducts() {
    const header = ['ID', '商品名', 'カテゴリ', 'メーカー', 'バーコード', '仕入価格(税抜)', '販売価格(税抜)', '税率', 'メモ']
    const rows = products.map((p) => [
      p.id, p.name, p.category, p.maker, p.barcode,
      String(p.purchasePrice), String(p.sellPrice), String(p.taxRate ?? 10) + '%', p.memo ?? '',
    ])
    downloadCSV(`商品マスタ_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
  }

  function exportStocks() {
    const header = ['商品ID', '商品名', 'カテゴリ', '店舗', '現在庫', '下限', '取扱']
    const rows = stocks.map((s) => {
      const p = products.find((pr) => pr.id === s.productId)
      return [
        s.productId, p?.name ?? '', p?.category ?? '',
        s.storeId === 'flag' ? 'flag美容室' : 'Lien美容室',
        String(s.currentStock), String(s.minStock), s.active ? '○' : '×',
      ]
    })
    downloadCSV(`在庫一覧_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
  }

  function exportTransactions() {
    const header = ['取引ID', '日付', '種別', '商品ID', '商品名', '店舗', '数量']
    const rows = transactions.map((t) => {
      const p = products.find((pr) => pr.id === t.productId)
      const typeLabel = t.type === 'receive' ? '仕入' : t.type === 'dispense' ? '払出' : '移動'
      return [
        t.id,
        new Date(t.timestamp).toLocaleDateString('ja-JP'),
        typeLabel,
        t.productId, p?.name ?? '',
        t.storeId === 'flag' ? 'flag美容室' : 'Lien美容室',
        String(t.quantity),
      ]
    })
    downloadCSV(`取引履歴_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
  }

  function exportStaffPurchases() {
    const header = ['日付', '商品名', '仕入価格(税込)', '税率', '数量', '購入者', '記入した人', '店舗']
    const rows = staffPurchases.map((sp) => {
      const p = products.find((pr) => pr.id === sp.productId)
      const displayName = sp.manualProductName ?? p?.name ?? ''
      const priceIncTax = sp.manualProductName
        ? sp.sellPriceAtPurchase
        : Math.round(sp.sellPriceAtPurchase * (sp.taxRate === 10 ? 1.1 : 1.08))
      return [
        sp.date, displayName, String(priceIncTax), String(sp.taxRate) + '%',
        String(sp.quantity), sp.purchasedBy, sp.recordedBy,
        sp.storeId === 'flag' ? 'flag美容室' : 'Lien美容室',
      ]
    })
    downloadCSV(`スタッフ購入履歴_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title="設定" showStoreSwitch={false} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex flex-col overflow-hidden bg-bg">

          {/* 水平タブバー */}
          <div className="bg-surface border-b border-border px-4 pt-4 flex gap-1 overflow-x-auto flex-shrink-0">
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={`flex-shrink-0 px-4 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  section === s
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted hover:text-text'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* コンテンツ */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-xl mx-auto flex flex-col gap-5">

              {/* 店舗設定 */}
              {section === '店舗設定' && (
                <>
                  <h2 className="text-lg font-bold">店舗設定</h2>
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <StoreDot store="flag" />
                      <span className="text-sm font-bold text-flag">flag 美容室</span>
                    </div>
                    <Row label="店舗名">
                      <input
                        value={flag.name}
                        onChange={(e) => setFlag({ ...flag, name: e.target.value })}
                        className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent bg-surface text-text"
                      />
                    </Row>
                    <Row label="電話番号">
                      <input
                        value={flag.phone}
                        onChange={(e) => setFlag({ ...flag, phone: e.target.value })}
                        className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent bg-surface text-text"
                      />
                    </Row>
                    <Row label="住所">
                      <input
                        value={flag.address}
                        onChange={(e) => setFlag({ ...flag, address: e.target.value })}
                        className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent bg-surface text-text"
                      />
                    </Row>
                  </Card>
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <StoreDot store="lien" />
                      <span className="text-sm font-bold text-lien">Lien 美容室</span>
                    </div>
                    <Row label="店舗名">
                      <input
                        value={lien.name}
                        onChange={(e) => setLien({ ...lien, name: e.target.value })}
                        className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent bg-surface text-text"
                      />
                    </Row>
                    <Row label="電話番号">
                      <input
                        value={lien.phone}
                        onChange={(e) => setLien({ ...lien, phone: e.target.value })}
                        className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent bg-surface text-text"
                      />
                    </Row>
                    <Row label="住所">
                      <input
                        value={lien.address}
                        onChange={(e) => setLien({ ...lien, address: e.target.value })}
                        className="w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent bg-surface text-text"
                      />
                    </Row>
                  </Card>
                  <div className="flex justify-end">
                    <Btn variant="primary" onClick={saveStoreInfo}>変更を保存</Btn>
                  </div>
                </>
              )}

              {/* スタッフ管理 */}
              {section === 'スタッフ管理' && (
                <>
                  <div>
                    <h2 className="text-lg font-bold">スタッフ管理</h2>
                    <p className="text-sm text-muted mt-1">登録したスタッフは購入履歴の購入者・記入者に反映されます。</p>
                  </div>
                  <Card>
                    <p className="text-xs font-semibold text-muted mb-3">登録スタッフ一覧（{staffMembers.length} 名）</p>
                    {staffMembers.length === 0 ? (
                      <p className="text-sm text-faint py-4 text-center">まだスタッフが登録されていません</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-border">
                        {staffMembers.map((name) => (
                          <div key={name} className="flex items-center justify-between py-3">
                            <span className="text-sm font-semibold text-text">{name}</span>
                            <button
                              onClick={() => removeStaffMember(name)}
                              className="text-xs text-danger hover:bg-danger-soft px-2 py-1 rounded transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-border flex gap-2">
                      <input
                        value={newStaffName}
                        onChange={(e) => setNewStaffName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newStaffName.trim()) {
                            addStaffMember(newStaffName.trim())
                            setNewStaffName('')
                            showToast('スタッフを追加しました')
                          }
                        }}
                        placeholder="スタッフ名を入力"
                        className="flex-1 h-10 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
                      />
                      <Btn
                        variant="primary"
                        size="sm"
                        disabled={!newStaffName.trim()}
                        onClick={() => {
                          if (!newStaffName.trim()) return
                          addStaffMember(newStaffName.trim())
                          setNewStaffName('')
                          showToast('スタッフを追加しました')
                        }}
                      >
                        ＋ 追加
                      </Btn>
                    </div>
                  </Card>
                </>
              )}

              {/* 在庫アラート */}
              {section === '在庫アラート' && (
                <>
                  <div>
                    <h2 className="text-lg font-bold">在庫アラート</h2>
                    <p className="text-sm text-muted mt-1">在庫数が下限を下回ったときにアラートを表示します。</p>
                  </div>
                  <Card>
                    <p className="text-xs font-semibold text-muted mb-3">デフォルト下限数（新規商品登録時の初期値）</p>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <StoreDot store="flag" />
                          <span className="text-sm font-bold text-flag">flag 美容室</span>
                        </div>
                        <div className="flex items-center h-10 border border-border-strong rounded-md overflow-hidden">
                          <button onClick={() => setFlagMin(Math.max(0, flagMin - 1))} className="w-9 flex items-center justify-center text-muted hover:bg-bg">−</button>
                          <span className="flex-1 text-center font-bold tabular-nums">{flagMin}</span>
                          <button onClick={() => setFlagMin(flagMin + 1)} className="w-9 flex items-center justify-center text-muted hover:bg-bg">＋</button>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <StoreDot store="lien" />
                          <span className="text-sm font-bold text-lien">Lien 美容室</span>
                        </div>
                        <div className="flex items-center h-10 border border-border-strong rounded-md overflow-hidden">
                          <button onClick={() => setLienMin(Math.max(0, lienMin - 1))} className="w-9 flex items-center justify-center text-muted hover:bg-bg">−</button>
                          <span className="flex-1 text-center font-bold tabular-nums">{lienMin}</span>
                          <button onClick={() => setLienMin(lienMin + 1)} className="w-9 flex items-center justify-center text-muted hover:bg-bg">＋</button>
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
                    <Btn variant="primary" onClick={saveAlertSettings}>変更を保存</Btn>
                  </div>
                </>
              )}

              {/* 通知設定 */}
              {section === '通知設定' && (
                <>
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
                    <Btn variant="primary" onClick={saveNotifySettings}>変更を保存</Btn>
                  </div>
                </>
              )}

              {/* データ管理 */}
              {section === 'データ管理' && (
                <>
                  <h2 className="text-lg font-bold">データ管理</h2>
                  <Card>
                    <p className="text-xs font-semibold text-muted mb-3">CSVエクスポート</p>
                    <Row label="商品マスタ" sub={`全${products.length}件の商品データ`}>
                      <Btn variant="ghost" size="sm" onClick={exportProducts}>↓ CSV</Btn>
                    </Row>
                    <Row label="在庫一覧" sub={`現在の在庫数 ${stocks.length}件`}>
                      <Btn variant="ghost" size="sm" onClick={exportStocks}>↓ CSV</Btn>
                    </Row>
                    <Row label="取引履歴" sub={`仕入・払出履歴 ${transactions.length}件`}>
                      <Btn variant="ghost" size="sm" onClick={exportTransactions}>↓ CSV</Btn>
                    </Row>
                    <Row label="スタッフ購入履歴" sub={`購入記録 ${staffPurchases.length}件`}>
                      <Btn variant="ghost" size="sm" onClick={exportStaffPurchases}>↓ CSV</Btn>
                    </Row>
                  </Card>
                  <Card>
                    <p className="text-xs font-semibold text-muted mb-1">アプリ情報</p>
                    <Row label="バージョン">
                      <span className="text-sm text-muted font-mono">1.0.0</span>
                    </Row>
                    <Row label="商品数">
                      <span className="text-sm text-muted tabular-nums">{products.length} 件</span>
                    </Row>
                    <Row label="取引記録">
                      <span className="text-sm text-muted tabular-nums">{transactions.length} 件</span>
                    </Row>
                  </Card>
                </>
              )}

            </div>
          </div>
        </main>
      </div>

      {toast && <Toast msg={toast} />}
    </div>
  )
}
