import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import HomePage from '@/pages/HomePage'
import GreetingPage from '@/pages/GreetingPage'
import CartPage from '@/pages/CartPage'
import SignupPage from '@/pages/SignupPage'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import AdminPage from '@/pages/AdminPage'
import MyProfilePage from '@/pages/MyProfilePage'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="app-routes">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/greeting" element={<GreetingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/my-profile" element={<MyProfilePage />} />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </div>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
