import { HashRouter, Routes, Route } from 'react-router-dom'
import { Home } from './screens/Home'
import { Scan } from './screens/Scan'
import { Products } from './screens/Products'
import { ProductEdit } from './screens/ProductEdit'
import { LowStock } from './screens/LowStock'
import { Orders } from './screens/Orders'
import { Stocktake } from './screens/Stocktake'
import { Transfer } from './screens/Transfer'
import { Sales } from './screens/Sales'
import { MonthlyPurchases } from './screens/MonthlyPurchases'
import { StaffScreen } from './screens/Staff'
import { Wholesale } from './screens/Wholesale'
import { Settings } from './screens/Settings'
import { useFirestoreSync } from './hooks/useFirestoreSync'
import { BottomNav } from './components/BottomNav'
import { PinGate } from './components/PinGate'

function AppRoutes() {
  useFirestoreSync()
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/scan" element={<Scan />} />
      <Route path="/products" element={<Products />} />
      <Route path="/products/new" element={<ProductEdit />} />
      <Route path="/products/:id" element={<ProductEdit />} />
      <Route path="/low-stock" element={<LowStock />} />
      <Route path="/orders" element={<Orders fixedMode="receive" />} />
      <Route path="/dispense" element={<Orders fixedMode="dispense" />} />
      <Route path="/stocktake" element={<Stocktake />} />
      <Route path="/transfer" element={<Transfer />} />
      <Route path="/sales" element={<Sales />} />
      <Route path="/monthly-purchases" element={<MonthlyPurchases />} />
      <Route path="/wholesale" element={<Wholesale />} />
      <Route path="/staff" element={<StaffScreen />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <PinGate>
        <div className="h-full flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden">
            <AppRoutes />
          </div>
          <BottomNav />
        </div>
      </PinGate>
    </HashRouter>
  )
}
