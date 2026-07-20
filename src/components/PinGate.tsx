import { useState } from 'react'
import { useAppStore } from '../store'

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

function PinDots({ count, shake }: { count: number; shake: boolean }) {
  return (
    <div className={`flex gap-5 ${shake ? 'pin-shake' : ''}`}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 transition-all duration-100 ${
            i < count ? 'bg-accent border-accent scale-110' : 'border-border-strong'
          }`}
        />
      ))}
    </div>
  )
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const { appSettings } = useAppStore()

  const [authenticated, setAuthenticated] = useState(() =>
    !appSettings.pin || sessionStorage.getItem('salon-auth') === '1'
  )
  const [digits, setDigits] = useState('')
  const [shake, setShake] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [locked, setLocked] = useState(false)
  const [lockSeconds, setLockSeconds] = useState(0)

  if (authenticated) return <>{children}</>

  function press(key: string) {
    if (locked || digits.length >= 4) return
    if (key === '⌫') {
      setDigits((d) => d.slice(0, -1))
      return
    }
    const next = digits + key
    setDigits(next)
    if (next.length === 4) {
      setTimeout(() => {
        if (next === appSettings.pin) {
          sessionStorage.setItem('salon-auth', '1')
          setAuthenticated(true)
        } else {
          const newAttempts = attempts + 1
          setAttempts(newAttempts)
          setShake(true)
          // 5回連続失敗で30秒ロック
          if (newAttempts >= 5) {
            let secs = 30
            setLockSeconds(secs)
            setLocked(true)
            const t = setInterval(() => {
              secs -= 1
              setLockSeconds(secs)
              if (secs <= 0) { clearInterval(t); setLocked(false); setAttempts(0) }
            }, 1000)
          }
          setTimeout(() => { setDigits(''); setShake(false) }, 500)
        }
      }, 80)
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center bg-bg select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

      {/* ロゴ・タイトル */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4 shadow-md">
          <span className="text-3xl text-white">✂</span>
        </div>
        <p className="text-xl font-bold text-text">在庫管理アプリ</p>
        <p className="text-sm text-muted mt-1">
          {locked ? `${lockSeconds}秒後に再試行できます` : 'PINを入力してください'}
        </p>
        {!locked && attempts > 0 && (
          <p className="text-xs text-danger mt-1">
            PINが違います（{attempts}/5回）
          </p>
        )}
      </div>

      {/* ドット */}
      <div className="mb-8">
        <PinDots count={digits.length} shake={shake} />
      </div>

      {/* 数字パッド */}
      <div className="grid grid-cols-3 gap-3 w-72">
        {PAD.map((key, i) =>
          key === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              onClick={() => press(key)}
              disabled={locked}
              className={`h-[72px] rounded-2xl text-2xl font-semibold transition-all active:scale-95 ${
                key === '⌫'
                  ? 'bg-bg border border-border text-muted text-xl'
                  : 'bg-surface border border-border text-text shadow-sm active:bg-bg'
              } ${locked ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {key}
            </button>
          )
        )}
      </div>
    </div>
  )
}
