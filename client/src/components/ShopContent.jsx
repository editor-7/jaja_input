import { useState, useMemo, useEffect } from 'react'
import { productApi } from '@/services/api'
import { staticProducts, getCategory } from '@/data/products'
import { ORDER_STORAGE_KEY } from '@/utils/constants'
import ShopNavbar from './ShopNavbar'
import ShopBody from './ShopBody'
import ShopFooter from './ShopFooter'

function ShopContent({ user, onLogout }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState(new Set())
  const [addedMsg, setAddedMsg] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [paymentStep, setPaymentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [showOrderList, setShowOrderList] = useState(false)
  const [orderList, setOrderList] = useState([])
  const [deliveryInfo, setDeliveryInfo] = useState({ name: '', phone: '', address: '' })
  const [products, setProducts] = useState(staticProducts)

  useEffect(() => {
    productApi.getAll().then(setProducts).catch(() => setProducts(staticProducts))
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY)
      if (saved) setOrderList(JSON.parse(saved))
    } catch (e) {}
  }, [])

  const saveOrder = (items, total, method, status) => {
    const order = {
      id: Date.now(),
      userId: user?._id,
      userName: user?.name,
      items: items.map((g) => ({ ...g })),
      totalPrice: total,
      paymentMethod: method,
      status,
      createdAt: new Date().toISOString(),
      delivery: { ...deliveryInfo },
    }
    const next = [order, ...orderList]
    setOrderList(next)
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
  }

  const categories = useMemo(() => {
    const set = new Set()
    products.forEach((p) => set.add(getCategory(p)))
    return Array.from(set).sort()
  }, [])

  const filteredProducts = useMemo(() => {
    let result = products
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.desc || '').toLowerCase().includes(term) ||
          (p.size || '').toLowerCase().includes(term)
      )
    }
    if (categoryFilter !== 'all') {
      result = result.filter((p) => getCategory(p) === categoryFilter)
    }
    return result
  }, [searchTerm, categoryFilter])

  const addToCart = (product, qty = 1) => {
    const count = Math.max(1, parseInt(qty) || 0)
    setCart((prev) => {
      const next = [...prev]
      for (let i = 0; i < count; i++) next.push(product)
      return next
    })
    setAddedMsg('장바구니에 담았습니다')
    setTimeout(() => setAddedMsg(''), 2500)
  }

  const toggleWishlist = (product) => {
    const key = `${product.name}|${product.price}`
    setWishlist((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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

  const clearCart = () => {
    if (cart.length === 0) return
    if (window.confirm('장바구니를 모두 비우시겠습니까?')) setCart([])
  }

  return (
    <div className="shop-page">
      <ShopNavbar user={user} onLogout={onLogout} cartCount={cart.length} />

      <ShopBody
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={categories}
        showOrderList={showOrderList}
        onShowOrderList={() => setShowOrderList(true)}
        onCloseOrderList={() => setShowOrderList(false)}
        orderList={orderList}
        deliveryInfo={deliveryInfo}
        onDeliveryInfoChange={setDeliveryInfo}
        showPayment={showPayment}
        paymentStep={paymentStep}
        paymentMethod={paymentMethod}
        onPaymentStepChange={setPaymentStep}
        onPaymentMethodChange={setPaymentMethod}
        onPaymentClose={() => {
          setShowPayment(false)
          setPaymentStep(1)
          setPaymentMethod('')
        }}
        onPaymentComplete={() => {
          setCart([])
          setShowPayment(false)
          setPaymentStep(1)
          setPaymentMethod('')
        }}
        filteredProducts={filteredProducts}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        addToCart={addToCart}
        setCart={setCart}
        setAddedMsg={setAddedMsg}
        groupedCart={groupedCart}
        changeCartQty={changeCartQty}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        totalPrice={totalPrice}
        saveOrder={saveOrder}
        addedMsg={addedMsg}
        onShowPayment={() => {
          setShowPayment(true)
          setPaymentStep(1)
          setPaymentMethod('')
        }}
        user={user}
      />

      <ShopFooter />
    </div>
  )
}

export default ShopContent
