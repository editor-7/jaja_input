import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import { CartProvider } from '@/contexts/CartContext'
import HomePage from '@/pages/HomePage'
import GreetingPage from '@/pages/GreetingPage'
import CartPage from '@/pages/CartPage'
import SignupPage from '@/pages/SignupPage'
import LoginPage from '@/pages/LoginPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import AdminPage from '@/pages/AdminPage'
import MyProfilePage from '@/pages/MyProfilePage'

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return children
}

function RedirectIfLoggedIn({ children }) {
  const { isLoggedIn } = useAuth()
  if (isLoggedIn) return <Navigate to="/" replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="app-routes">
          <Routes>
            <Route
              path="/"
              element={(
                <RequireAuth>
                  <HomePage />
                </RequireAuth>
              )}
            />
            <Route
              path="/greeting"
              element={(
                <RequireAuth>
                  <GreetingPage />
                </RequireAuth>
              )}
            />
            <Route
              path="/login"
              element={(
                <RedirectIfLoggedIn>
                  <LoginPage />
                </RedirectIfLoggedIn>
              )}
            />
            <Route
              path="/signup"
              element={(
                <RedirectIfLoggedIn>
                  <SignupPage />
                </RedirectIfLoggedIn>
              )}
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              path="/admin"
              element={(
                <RequireAuth>
                  <AdminPage />
                </RequireAuth>
              )}
            />
            <Route
              path="/my-profile"
              element={(
                <RequireAuth>
                  <MyProfilePage />
                </RequireAuth>
              )}
            />
            <Route
              path="/cart"
              element={(
                <RequireAuth>
                  <CartPage />
                </RequireAuth>
              )}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
