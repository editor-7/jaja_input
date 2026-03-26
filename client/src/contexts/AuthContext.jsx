import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const AuthContext = createContext(null)

function readStoredAuth() {
  try {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser && parsedUser._id && parsedUser.email) {
        return { token: storedToken, user: parsedUser }
      }
    }
  } catch (e) {}
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  } catch (e) {}
  return { token: null, user: null }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => readStoredAuth().user)
  const [token, setToken] = useState(() => readStoredAuth().token)
  const [isReady, setIsReady] = useState(true)
  const [pendingWelcome, setPendingWelcome] = useState(null)

  useEffect(() => {
    const { token: t, user: u } = readStoredAuth()
    if (t) setToken(t)
    if (u) setUser(u)
  }, [])

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    sessionStorage.setItem('pendingWelcome', newUser?.name || '')
    setToken(newToken)
    setUser(newUser)
    setPendingWelcome(newUser?.name || null)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    navigate('/login')
  }

  const isLoggedIn = !!(token && user?._id)

  const clearWelcome = useCallback(() => setPendingWelcome(null), [])

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, login, logout, isReady, pendingWelcome, clearWelcome }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
