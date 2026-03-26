import { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import { getCartStorageKey, getListQtysStorageKey } from '@/utils/constants'

const CartContext = createContext(null)
const GUEST_OWNER_KEY = 'guest'

const getOwnerKey = (user) => (user?._id ? String(user._id) : GUEST_OWNER_KEY)

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [cart, setCart] = useState([])
  const prevOwnerKeyRef = useRef(null)
  const cartRef = useRef(cart)
  cartRef.current = cart

  useEffect(() => {
    const currentOwnerKey = getOwnerKey(user)
    if (prevOwnerKeyRef.current !== currentOwnerKey) {
      const prevOwnerKey = prevOwnerKeyRef.current
      if (prevOwnerKey) {
        try {
          localStorage.setItem(getCartStorageKey(prevOwnerKey), JSON.stringify(cart))
        } catch (e) {}
      }
      try {
        const saved = localStorage.getItem(getCartStorageKey(currentOwnerKey))
        setCart(saved ? JSON.parse(saved) : [])
      } catch (e) {
        setCart([])
      }
      prevOwnerKeyRef.current = currentOwnerKey
    }
  }, [user])

  useEffect(() => {
    const ownerKey = getOwnerKey(user)
    try {
      localStorage.setItem(getCartStorageKey(ownerKey), JSON.stringify(cart))
    } catch (e) {}
  }, [user?._id, cart])

  const groupedCart = useMemo(() => {
    const map = new Map()
    cart.forEach((item) => {
      const key = `${item.name}|${item.desc}|${item.size}|${item.unit}|${item.price}`
      if (!map.has(key)) map.set(key, { ...item, count: 0 })
      map.get(key).count++
    })
    return Array.from(map.values())
  }, [cart])

  const totalPrice = groupedCart.reduce((sum, g) => sum + g.price * g.count, 0)

  const addToCart = (product, qty = 1) => {
    const count = Math.max(1, parseInt(qty) || 0)
    setCart((prev) => {
      const next = [...prev]
      for (let i = 0; i < count; i++) next.push(product)
      return next
    })
  }

  /** 해당 상품 수량을 정확히 qty로 맞춤 (기존 수량 제거 후 qty개 추가) */
  const setProductQty = (product, qty) => {
    const count = Math.max(0, parseInt(qty) || 0)
    const key = `${product.name}|${product.desc}|${product.size}|${product.unit}|${product.price}`
    setCart((prev) => {
      const next = prev.filter((i) => `${i.name}|${i.desc}|${i.size}|${i.unit}|${i.price}` !== key)
      for (let i = 0; i < count; i++) next.push(product)
      return next
    })
  }

  const changeCartQty = (group, diff) => {
    const g = groupedCart[group]
    const newCount = Math.max(0, g.count + diff)
    setCart((prev) => {
      const key = `${g.name}|${g.desc}|${g.size}|${g.unit}|${g.price}`
      const next = prev.filter(
        (i) => `${i.name}|${i.desc}|${i.size}|${i.unit}|${i.price}` !== key
      )
      for (let i = 0; i < newCount; i++) next.push(g)
      return next
    })
  }

  const removeFromCart = (group) => {
    const g = groupedCart[group]
    const key = `${g.name}|${g.desc}|${g.size}|${g.unit}|${g.price}`
    setCart((prev) => prev.filter((i) => `${i.name}|${i.desc}|${i.size}|${i.unit}|${i.price}` !== key))
  }

  const clearCart = (silent = false) => {
    if (cartRef.current.length === 0) return
    if (silent || window.confirm('장바구니를 모두 비우시겠습니까?')) {
      setCart([])
      try {
        localStorage.setItem(getListQtysStorageKey(getOwnerKey(user)), '{}')
        window.dispatchEvent(new CustomEvent('clearListQtys'))
      } catch (e) {}
    }
  }

  const value = useMemo(
    () => ({
      cart,
      setCart,
      groupedCart,
      totalPrice,
      addToCart,
      setProductQty,
      changeCartQty,
      removeFromCart,
      clearCart,
    }),
    [cart, groupedCart, totalPrice]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
