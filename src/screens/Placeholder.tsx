import { AppBar } from '../components/AppBar'
import { SideNav } from '../components/SideNav'

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-status bg-surface border-b border-border" />
      <AppBar title={title} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav />
        <main className="flex-1 flex items-center justify-center bg-bg">
          <p className="text-muted text-sm">🚧 実装中</p>
        </main>
      </div>
    </div>
  )
}
