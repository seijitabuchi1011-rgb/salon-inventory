import { useState, useRef, useEffect } from 'react'
import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'
import { Card } from '../components/Card'
import { Btn } from '../components/Btn'
import { StoreDot } from '../components/StoreDot'
import { useAppStore } from '../store'
import { sendNotification } from '../lib/email'
import type { StoreInfo } from '../store'

const PRESET_COLORS = ['#2B5FA7', '#8A4AA6', '#2D9E6B', '#E67E22', '#E74C3C', '#1ABC9C', '#E91E8C', '#F39C12']

type Section = '店舗設定' | 'スタッフ管理' | '在庫アラート' | '通知設定' | 'マスタ管理' | 'セキュリティ' | 'データ管理'
const SECTIONS: Section[] = ['店舗設定', 'スタッフ管理', '在庫アラート', '通知設定', 'マスタ管理', 'セキュリティ', 'データ管理']

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${value ? 'bg-accent' : 'bg-border'}`}
    >
      <span className={`absolute top-[3px] left-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform ${value ? 'translate-x-[20px]' : 'translate-x-0'}`} />
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

function MasterList({ label, items, onAdd, onRemove, showToast }: {
  label: string
  items: string[]
  onAdd: (name: string) => void
  onRemove: (name: string) => void
  showToast: (msg: string) => void
}) {
  const [input, setInput] = useState('')
  function add() {
    const v = input.trim()
    if (!v || items.includes(v)) return
    onAdd(v); setInput(''); showToast(`「${v}」を追加しました`)
  }
  return (
    <Card>
      <p className="text-xs font-semibold text-muted mb-3">{label}（{items.length}件）</p>
      <div className="flex flex-wrap gap-2 mb-3 min-h-[2rem]">
        {items.map((item) => (
          <span key={item} className="flex items-center gap-1 pl-3 pr-1.5 py-1 bg-bg border border-border rounded-full text-xs font-semibold text-text">
            {item}
            <button onClick={() => { onRemove(item); showToast(`「${item}」を削除しました`) }}
              className="w-4 h-4 flex items-center justify-center rounded-full text-muted hover:bg-danger-soft hover:text-danger transition-colors">
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-faint py-1">まだ登録されていません</p>}
      </div>
      <div className="flex gap-2 pt-3 border-t border-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add() }}
          placeholder={`${label}名を入力`}
          className="flex-1 h-9 border border-border-strong rounded-md px-3 text-sm bg-surface text-text outline-none focus:border-accent"
        />
        <Btn variant="primary" size="sm" disabled={!input.trim() || items.includes(input.trim())} onClick={add}>＋ 追加</Btn>
      </div>
    </Card>
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

function parseCSVRow(line: string): string[] {
  const result: string[] = []
  let inQuotes = false
  let current = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else { inQuotes = !inQuotes }
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else { current += ch }
  }
  result.push(current)
  return result
}

export function Settings() {
  const {
    products, stocks, transactions, staffPurchases,
    storeInfo, storeOrder, setStoreInfo, addStore, removeStore,
    appSettings, setAppSettings,
    staffMembers, addStaffMember, removeStaffMember,
    categories, addCategory, removeCategory,
    makers, addMaker, removeMaker,
    dealers, addDealer, removeDealer,
    dealerReps, addDealerRep, removeDealerRep,
    upsertProduct,
  } = useAppStore()

  const [section, setSection] = useState<Section>('店舗設定')
  const [toast, setToast] = useState('')
  const [newStaffName, setNewStaffName] = useState('')

  // 店舗設定ローカル状態（動的）
  const [storeEdits, setStoreEdits] = useState<Record<string, StoreInfo>>(() =>
    Object.fromEntries(storeOrder.map((id) => [id, { ...storeInfo[id] }]))
  )

  // storeOrderに新しい店舗が追加されたらstoreEditsにマージ
  useEffect(() => {
    setStoreEdits((prev) => {
      const merged: Record<string, StoreInfo> = {}
      storeOrder.forEach((id) => {
        merged[id] = prev[id] ?? { ...storeInfo[id] }
      })
      return merged
    })
  }, [storeOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  // 新規店舗追加フォーム
  const [showAddStore, setShowAddStore] = useState(false)
  const [newStoreName, setNewStoreName] = useState('')
  const [newStoreColor, setNewStoreColor] = useState(PRESET_COLORS[2])

  // 在庫アラートローカル状態
  const [minStockEdits, setMinStockEdits] = useState<Record<string, number>>(
    () => ({ ...appSettings.minStockByStore })
  )

  useEffect(() => {
    setMinStockEdits((prev) => {
      const merged = { ...prev }
      storeOrder.forEach((id) => {
        if (!(id in merged)) merged[id] = appSettings.minStockByStore[id] ?? 3
      })
      return merged
    })
  }, [storeOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  // セキュリティ — PIN設定状態
  type PinStep = 'menu' | 'set-new' | 'set-confirm' | 'change-current' | 'change-new' | 'change-confirm' | 'delete-confirm'
  const [pinStep, setPinStep] = useState<PinStep>('menu')
  const [pinInput, setPinInput] = useState('')
  const [pinFirst, setPinFirst] = useState('')

  function pinPress(key: string) {
    if (key === '⌫') { setPinInput((d) => d.slice(0, -1)); return }
    if (pinInput.length >= 4) return
    const next = pinInput + key
    setPinInput(next)
    if (next.length < 4) return

    setTimeout(() => {
      if (pinStep === 'set-new') {
        setPinFirst(next); setPinInput(''); setPinStep('set-confirm')
      } else if (pinStep === 'set-confirm') {
        if (next === pinFirst) {
          setAppSettings({ pin: next }); sessionStorage.setItem('salon-auth', '1')
          setPinStep('menu'); setPinInput(''); showToast('PINを設定しました')
        } else {
          showToast('PINが一致しません。もう一度'); setPinInput(''); setPinStep('set-new')
        }
      } else if (pinStep === 'change-current') {
        if (next === appSettings.pin) {
          setPinInput(''); setPinStep('change-new')
        } else {
          showToast('現在のPINが違います'); setPinInput('')
        }
      } else if (pinStep === 'change-new') {
        setPinFirst(next); setPinInput(''); setPinStep('change-confirm')
      } else if (pinStep === 'change-confirm') {
        if (next === pinFirst) {
          setAppSettings({ pin: next }); sessionStorage.setItem('salon-auth', '1')
          setPinStep('menu'); setPinInput(''); showToast('PINを変更しました')
        } else {
          showToast('PINが一致しません。もう一度'); setPinInput(''); setPinStep('change-new')
        }
      } else if (pinStep === 'delete-confirm') {
        if (next === appSettings.pin) {
          setAppSettings({ pin: '' }); sessionStorage.removeItem('salon-auth')
          setPinStep('menu'); setPinInput(''); showToast('PINを削除しました')
        } else {
          showToast('PINが違います'); setPinInput('')
        }
      }
    }, 80)
  }

  const PIN_STEP_LABEL: Record<PinStep, string> = {
    'menu': '',
    'set-new': '新しい4桁のPINを入力',
    'set-confirm': 'もう一度入力して確認',
    'change-current': '現在のPINを入力',
    'change-new': '新しいPINを入力',
    'change-confirm': '新しいPINをもう一度入力',
    'delete-confirm': '現在のPINを入力して解除',
  }
  const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  // 通知設定ローカル状態
  const [notifyByStore, setNotifyByStore] = useState<Record<string, boolean>>(
    () => ({ ...appSettings.notifyLowStockByStore })
  )

  useEffect(() => {
    setNotifyByStore((prev) => {
      const merged = { ...prev }
      storeOrder.forEach((id) => {
        if (!(id in merged)) merged[id] = true
      })
      return merged
    })
  }, [storeOrder]) // eslint-disable-line react-hooks/exhaustive-deps

  const [notifyOrder, setNotifyOrder] = useState(appSettings.notifyOrder)
  const [notifyTransfer, setNotifyTransfer] = useState(appSettings.notifyTransfer)
  const [notifyStocktake, setNotifyStocktake] = useState(appSettings.notifyStocktake)

  // CSVインポート
  const importRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function saveStoreInfo() {
    storeOrder.forEach((id) => {
      if (storeEdits[id]) setStoreInfo(id, storeEdits[id])
    })
    showToast('店舗設定を保存しました')
  }

  function saveAlertSettings() {
    setAppSettings({ minStockByStore: minStockEdits })
    showToast('在庫アラート設定を保存しました')
  }

  function saveNotifySettings() {
    setAppSettings({
      notifyLowStockByStore: notifyByStore,
      notifyLowStock: Object.values(notifyByStore).some(Boolean),
      notifyOrder,
      notifyTransfer,
      notifyStocktake,
    })
    showToast('通知設定を保存しました')
  }

  function handleAddStore() {
    if (!newStoreName.trim()) return
    addStore(newStoreName.trim(), newStoreColor)
    showToast(`「${newStoreName.trim()}」を追加しました`)
    setNewStoreName('')
    setNewStoreColor(PRESET_COLORS[2])
    setShowAddStore(false)
  }

  function handleRemoveStore(id: string) {
    const name = storeInfo[id]?.name ?? id
    if (!window.confirm(`「${name}」を削除しますか？\n※この店舗に関連する在庫データは残ります。`)) return
    removeStore(id)
    setStoreEdits((prev) => {
      const { [id]: _, ...rest } = prev
      return rest
    })
    showToast('店舗を削除しました')
  }

  function importProducts(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = ((e.target?.result as string) ?? '').replace(/^﻿/, '')
      const lines = text.split(/\r?\n/).filter(Boolean)
      if (lines.length < 2) { showToast('データがありません'); return }
      let imported = 0, skipped = 0
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVRow(lines[i])
        const id = cols[0]?.trim()
        const name = cols[1]?.trim()
        if (!id || !name) { skipped++; continue }
        const taxRaw = cols[7]?.trim() ?? ''
        const taxRate: 8 | 10 = taxRaw.startsWith('8') ? 8 : 10
        upsertProduct({
          id, name,
          category: cols[2]?.trim() ?? '',
          maker: cols[3]?.trim() ?? '',
          barcode: cols[4]?.trim() ?? '',
          purchasePrice: Number(cols[5]?.replace(/[^0-9]/g, '') || 0),
          sellPrice: Number(cols[6]?.replace(/[^0-9]/g, '') || 0),
          taxRate,
          memo: cols[8]?.trim() || undefined,
        })
        imported++
      }
      showToast(`${imported}件インポートしました${skipped > 0 ? `（${skipped}件スキップ）` : ''}`)
    }
    reader.readAsText(file, 'utf-8')
    if (importRef.current) importRef.current.value = ''
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
      const storeName = storeInfo[s.storeId]?.name ?? s.storeId
      return [
        s.productId, p?.name ?? '', p?.category ?? '',
        storeName,
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
        storeInfo[t.storeId]?.name ?? t.storeId,
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
        storeInfo[sp.storeId]?.name ?? sp.storeId,
      ]
    })
    downloadCSV(`スタッフ購入履歴_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows])
  }

  const inputCls = 'w-36 md:w-44 h-9 border border-border-strong rounded-md px-3 text-sm outline-none focus:border-accent bg-surface text-text'

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
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-xl mx-auto flex flex-col gap-5">

              {/* 店舗設定 */}
              {section === '店舗設定' && (
                <>
                  <h2 className="text-lg font-bold">店舗設定</h2>

                  {storeOrder.map((id) => {
                    const edit = storeEdits[id] ?? storeInfo[id]
                    if (!edit) return null
                    const isDefault = id === 'flag' || id === 'lien'
                    return (
                      <Card key={id}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <StoreDot store={id} />
                            <span className="text-sm font-bold" style={{ color: edit.color }}>
                              {edit.name || id}
                            </span>
                          </div>
                          {!isDefault && (
                            <button
                              onClick={() => handleRemoveStore(id)}
                              className="text-xs text-danger hover:bg-danger-soft px-2 py-1 rounded transition-colors"
                            >
                              削除
                            </button>
                          )}
                        </div>
                        <Row label="店舗名">
                          <input
                            value={edit.name}
                            onChange={(e) => setStoreEdits((prev) => ({ ...prev, [id]: { ...prev[id], name: e.target.value } }))}
                            className={inputCls}
                          />
                        </Row>
                        <Row label="電話番号">
                          <input
                            value={edit.phone}
                            onChange={(e) => setStoreEdits((prev) => ({ ...prev, [id]: { ...prev[id], phone: e.target.value } }))}
                            className={inputCls}
                          />
                        </Row>
                        <Row label="住所">
                          <input
                            value={edit.address}
                            onChange={(e) => setStoreEdits((prev) => ({ ...prev, [id]: { ...prev[id], address: e.target.value } }))}
                            className={inputCls}
                          />
                        </Row>
                        <Row label="カラー">
                          <div className="flex gap-1.5 flex-wrap">
                            {PRESET_COLORS.map((c) => (
                              <button
                                key={c}
                                onClick={() => setStoreEdits((prev) => ({ ...prev, [id]: { ...prev[id], color: c } }))}
                                className="w-6 h-6 rounded-full transition-all"
                                style={{
                                  background: c,
                                  outline: edit.color === c ? `2px solid ${c}` : 'none',
                                  outlineOffset: '2px',
                                }}
                              />
                            ))}
                          </div>
                        </Row>
                      </Card>
                    )
                  })}

                  {/* 新規店舗追加フォーム */}
                  {showAddStore ? (
                    <Card>
                      <p className="text-xs font-semibold text-muted mb-3">新規店舗を追加</p>
                      <Row label="店舗名">
                        <input
                          value={newStoreName}
                          onChange={(e) => setNewStoreName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddStore() }}
                          placeholder="店舗名を入力"
                          className={inputCls}
                          autoFocus
                        />
                      </Row>
                      <Row label="カラー">
                        <div className="flex gap-1.5 flex-wrap">
                          {PRESET_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => setNewStoreColor(c)}
                              className="w-6 h-6 rounded-full transition-all"
                              style={{
                                background: c,
                                outline: newStoreColor === c ? `2px solid ${c}` : 'none',
                                outlineOffset: '2px',
                              }}
                            />
                          ))}
                        </div>
                      </Row>
                      <div className="flex gap-2 justify-end mt-3 pt-3 border-t border-border">
                        <Btn variant="ghost" size="sm" onClick={() => { setShowAddStore(false); setNewStoreName('') }}>キャンセル</Btn>
                        <Btn variant="primary" size="sm" disabled={!newStoreName.trim()} onClick={handleAddStore}>追加する</Btn>
                      </div>
                    </Card>
                  ) : (
                    <button
                      onClick={() => setShowAddStore(true)}
                      className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:opacity-75 transition-opacity"
                    >
                      ＋ 店舗を追加
                    </button>
                  )}

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
                      {storeOrder.map((id) => {
                        const info = storeInfo[id]
                        const val = minStockEdits[id] ?? 3
                        return (
                          <div key={id}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <StoreDot store={id} />
                              <span className="text-sm font-bold" style={{ color: info?.color }}>{info?.name ?? id}</span>
                            </div>
                            <div className="flex items-center h-10 border border-border-strong rounded-md overflow-hidden">
                              <button
                                onClick={() => setMinStockEdits((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 3) - 1) }))}
                                className="w-9 flex items-center justify-center text-muted hover:bg-bg"
                              >
                                −
                              </button>
                              <span className="flex-1 text-center font-bold tabular-nums">{val}</span>
                              <button
                                onClick={() => setMinStockEdits((prev) => ({ ...prev, [id]: (prev[id] ?? 3) + 1 }))}
                                className="w-9 flex items-center justify-center text-muted hover:bg-bg"
                              >
                                ＋
                              </button>
                            </div>
                          </div>
                        )
                      })}
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
                    {/* 在庫不足アラート — 店舗別 */}
                    <div className="py-3.5 border-b border-border">
                      <p className="text-sm font-semibold text-text mb-0.5">在庫不足アラート</p>
                      <p className="text-xs text-faint mb-3">下限を下回った商品が発生したとき</p>
                      <div className="flex flex-col gap-3">
                        {storeOrder.map((id) => (
                          <div key={id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <StoreDot store={id} />
                              <span className="text-sm text-text">{storeInfo[id]?.name ?? id}</span>
                            </div>
                            <Toggle
                              value={notifyByStore[id] ?? true}
                              onChange={(v) => setNotifyByStore((prev) => ({ ...prev, [id]: v }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
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
                  <Card>
                    <p className="text-xs font-semibold text-muted mb-3">動作確認</p>
                    <Row label="テスト送信" sub="メール通知が届くか確認できます">
                      <Btn variant="ghost" size="sm" onClick={() => {
                        sendNotification('テスト通知', '在庫管理アプリからのテストメールです。\nメール通知が正常に動作しています。')
                        showToast('テストメールを送信しました')
                      }}>
                        送信テスト
                      </Btn>
                    </Row>
                  </Card>
                  <div className="flex justify-end">
                    <Btn variant="primary" onClick={saveNotifySettings}>変更を保存</Btn>
                  </div>
                </>
              )}

              {/* マスタ管理 */}
              {section === 'マスタ管理' && (
                <>
                  <h2 className="text-lg font-bold">マスタ管理</h2>
                  <p className="text-sm text-muted -mt-3">ここで追加・削除した項目は商品登録画面のプルダウンに反映されます。</p>
                  {(
                    [
                      { label: 'カテゴリー', items: categories, onAdd: addCategory, onRemove: removeCategory },
                      { label: 'メーカー', items: makers, onAdd: addMaker, onRemove: removeMaker },
                      { label: 'ディーラー', items: dealers, onAdd: addDealer, onRemove: removeDealer },
                      { label: 'ディーラー担当', items: dealerReps, onAdd: addDealerRep, onRemove: removeDealerRep },
                    ] as const
                  ).map(({ label, items, onAdd, onRemove }) => (
                    <MasterList key={label} label={label} items={items as string[]} onAdd={onAdd} onRemove={onRemove} showToast={showToast} />
                  ))}
                </>
              )}

              {/* セキュリティ */}
              {section === 'セキュリティ' && (
                <>
                  <h2 className="text-lg font-bold">セキュリティ</h2>

                  {pinStep === 'menu' ? (
                    <Card>
                      <p className="text-xs font-semibold text-muted mb-3">PIN認証</p>
                      <Row label="現在の状態">
                        <span className={`text-sm font-semibold ${appSettings.pin ? 'text-accent' : 'text-muted'}`}>
                          {appSettings.pin ? '🔒 設定済み' : '🔓 未設定'}
                        </span>
                      </Row>
                      {!appSettings.pin ? (
                        <Row label="PINを設定する" sub="4桁の数字でアプリをロック">
                          <Btn variant="primary" size="sm" onClick={() => { setPinInput(''); setPinStep('set-new') }}>設定する</Btn>
                        </Row>
                      ) : (
                        <>
                          <Row label="PINを変更する" sub="現在のPINを確認してから変更">
                            <Btn variant="ghost" size="sm" onClick={() => { setPinInput(''); setPinStep('change-current') }}>変更</Btn>
                          </Row>
                          <Row label="PINを解除する" sub="認証なしでアプリを開けるようになります">
                            <Btn variant="ghost" size="sm" onClick={() => { setPinInput(''); setPinStep('delete-confirm') }}>解除</Btn>
                          </Row>
                        </>
                      )}
                    </Card>
                  ) : (
                    <Card>
                      <div className="flex flex-col items-center py-4 gap-6">
                        <p className="text-sm font-semibold text-text">{PIN_STEP_LABEL[pinStep]}</p>

                        <div className="flex gap-5">
                          {[0,1,2,3].map((i) => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pinInput.length ? 'bg-accent border-accent' : 'border-border-strong'}`} />
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-60">
                          {PAD.map((key, i) =>
                            key === '' ? <div key={i} /> : (
                              <button
                                key={i}
                                onClick={() => pinPress(key)}
                                className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
                                  key === '⌫'
                                    ? 'bg-bg border border-border text-muted'
                                    : 'bg-surface border border-border text-text shadow-sm'
                                }`}
                              >
                                {key}
                              </button>
                            )
                          )}
                        </div>

                        <button
                          onClick={() => { setPinStep('menu'); setPinInput('') }}
                          className="text-sm text-muted hover:text-text transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </Card>
                  )}

                  <Card>
                    <p className="text-xs font-semibold text-muted mb-1">セキュリティについて</p>
                    <p className="text-xs text-faint leading-relaxed">
                      PINはアプリを開くときに入力します。5回連続で間違えると30秒間ロックされます。
                      PINはこのデバイスのセッションに保存されます。ブラウザを閉じると再度入力が必要です。
                    </p>
                  </Card>
                </>
              )}

              {/* データ管理 */}
              {section === 'データ管理' && (
                <>
                  <h2 className="text-lg font-bold">データ管理</h2>

                  {/* CSVインポート */}
                  <Card>
                    <p className="text-xs font-semibold text-muted mb-3">CSVインポート</p>
                    <Row label="商品マスタ" sub="エクスポートしたCSVを読み込み">
                      <Btn variant="ghost" size="sm" onClick={() => importRef.current?.click()}>↑ CSV</Btn>
                    </Row>
                    <input
                      ref={importRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) importProducts(file)
                      }}
                    />
                    <p className="text-xs text-faint mt-2 leading-relaxed">
                      商品マスタCSVを読み込みます。IDが一致する商品は上書き更新、新しいIDは追加されます。
                    </p>
                  </Card>

                  {/* CSVエクスポート */}
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
