import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './screens/Home'
import { Scan } from './screens/Scan'
import { Products } from './screens/Products'
import { ProductEdit } from './screens/ProductEdit'
import { LowStock } from './screens/LowStock'
import { Orders } from './screens/Orders'
import { Stocktake } from './screens/Stocktake'
import { Transfer } from './screens/Transfer'
import { Sales } from './screens/Sales'
import { StaffScreen } from './screens/Staff'
import { Settings } from './screens/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductEdit />} />
        <Route path="/products/:id" element={<ProductEdit />} />
        <Route path="/low-stock" element={<LowStock />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/stocktake" element={<Stocktake />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/staff" element={<StaffScreen />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}
