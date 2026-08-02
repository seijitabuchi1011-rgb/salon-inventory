import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { checkForUpdate } from './version-check'

// アプリ起動時に新バージョンを確認（古いキャッシュを自動排除）
checkForUpdate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
