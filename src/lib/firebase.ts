import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCZoTkiVOCO4gHoiBRAfxTZ77qm-jk8Fks',
  authDomain: 'salon-inventory-58dbf.firebaseapp.com',
  projectId: 'salon-inventory-58dbf',
  storageBucket: 'salon-inventory-58dbf.firebasestorage.app',
  messagingSenderId: '832855057846',
  appId: '1:832855057846:web:1cbb39670382aa67f38d17',
}

export const app = initializeApp(firebaseConfig)

// IndexedDBによるオフライン永続化を有効化:
// 削除等の書き込みがIndexedDBにキャッシュされるため、
// ページ更新後も正しいデータが読み込まれる
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
})
