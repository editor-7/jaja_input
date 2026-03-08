import { useState, useMemo, useEffect, useCallback } from 'react'
import { productApi } from '@/services/api'
import { getCategory } from '@/data/products'
import { ORDER_STORAGE_KEY } from '@/utils/constants'
import { skuSort } from '@/utils/productUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import ShopNavbar from './ShopNavbar'
import ShopBody from './ShopBody'
import ShopFooter from './ShopFooter'

function ShopContent({ user, onLogout }) {
  const { pendingWelcome, clearWelcome } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const {
    cart,
    groupedCart,
    totalPrice,
    addToCart,
    changeCartQty,
    removeFromCart,
    clearCart,
  } = useCart()
  const [wishlist, setWishlist] = useState(new Set())
  const [addedMsg, setAddedMsg] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [paymentStep, setPaymentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [showOrderList, setShowOrderList] = useState(false)
  const [orderList, setOrderList] = useState([])
  const [deliveryInfo, setDeliveryInfo] = useState({ name: '', phone: '', address: '' })
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsLoadError, setProductsLoadError] = useState(false)
  const [productPage, setProductPage] = useState(1)

  const ITEMS_PER_PAGE = 2

  const toProductList = (data) => {
    if (Array.isArray(data)) return data
    if (data?.data && Array.isArray(data.data)) return data.data
    if (data?.products && Array.isArray(data.products)) return data.products
    return []
  }

  const loadProducts = useCallback(() => {
    setProductsLoadError(false)
    setProductsLoading(true)
    return productApi
      .getAll()
      .then((data) => {
        setProducts(toProductList(data))
        setProductsLoadError(false)
        setProductsLoading(false)
      })
      .catch((err) => {
        console.error('[상품 로드 실패]', err?.message || err)
        setProducts([])
        setProductsLoadError(true)
        setProductsLoading(false)
      })
  }, [])

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 8
    const run = () => {
      productApi.getAll()
        .then((data) => {
          setProducts(toProductList(data))
          setProductsLoadError(false)
          setProductsLoading(false)
        })
        .catch((err) => {
          if (retryCount < maxRetries) {
            retryCount += 1
            setTimeout(run, 1500)
          } else {
            console.error('[상품 로드 실패]', err?.message || err)
            setProducts([])
            setProductsLoadError(true)
            setProductsLoading(false)
          }
        })
    }
    run()
  }, [])

  useEffect(() => {
    const nameFromStorage = sessionStorage.getItem('pendingWelcome')
    const shouldShow = (pendingWelcome || nameFromStorage) && user
    if (shouldShow) {
      const name = user?.name || pendingWelcome || nameFromStorage || '회원'
      sessionStorage.removeItem('pendingWelcome')
      clearWelcome()
      setAddedMsg(`${name}님 환영합니다`)
      const t = setTimeout(() => setAddedMsg(''), 3000)
      return () => clearTimeout(t)
    }
  }, [pendingWelcome, user, clearWelcome])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        productApi.getAll()
          .then((data) => setProducts((prev) => toProductList(data).length > 0 ? toProductList(data) : prev))
          .catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY)
      if (saved) setOrderList(JSON.parse(saved))
    } catch (e) {}
  }, [])

  const myOrderList = useMemo(() => {
    if (!user?._id) return []
    return orderList.filter((o) => o.userId && String(o.userId) === String(user._id))
  }, [orderList, user?._id])

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
    const sorted = [...products].sort(skuSort)
    const seen = new Set()
    const result = []
    sorted.forEach((p) => {
      const cat = getCategory(p)
      if (cat && !seen.has(cat)) {
        seen.add(cat)
        result.push(cat)
      }
    })
    return result
  }, [products])

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
    return [...result].sort(skuSort)
  }, [products, searchTerm, categoryFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, productPage, ITEMS_PER_PAGE])

  useEffect(() => {
    setProductPage(1)
  }, [searchTerm, categoryFilter])

  useEffect(() => {
    if (productPage > totalPages && totalPages > 0) setProductPage(totalPages)
  }, [productPage, totalPages])

  const handleAddToCart = (product, qty = 1) => {
    addToCart(product, qty)
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

  return (
    <div className="shop-page">
      <ShopNavbar
        user={user}
        onLogout={onLogout}
        cartCount={cart.length}
      />

      <ShopBody
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={categories}
        showOrderList={showOrderList}
        onShowOrderList={() => setShowOrderList(true)}
        onCloseOrderList={() => setShowOrderList(false)}
        orderList={myOrderList}
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
          clearCart(true)
          setShowPayment(false)
          setPaymentStep(1)
          setPaymentMethod('')
        }}
        filteredProducts={paginatedProducts}
        allFilteredCount={filteredProducts.length}
        productPage={productPage}
        totalPages={totalPages}
        onProductPageChange={setProductPage}
        productsLoading={productsLoading}
        productsLoadError={productsLoadError}
        onRetryProducts={loadProducts}
        wishlist={wishlist}
        toggleWishlist={toggleWishlist}
        addToCart={handleAddToCart}
        groupedCart={groupedCart}
        changeCartQty={changeCartQty}
        removeFromCart={removeFromCart}
        clearCart={clearCart}
        totalPrice={totalPrice}
        saveOrder={saveOrder}
        addedMsg={addedMsg}
        onShowPayment={() => {
          if (!user) {
            setAddedMsg('회원가입 후 구매 가능합니다.')
            setTimeout(() => setAddedMsg(''), 3000)
            return
          }
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
