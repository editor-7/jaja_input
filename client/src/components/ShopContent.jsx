import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { productApi } from '@/services/api'
import {
  getCategory,
  getSpecFromProduct,
  getRemarkDisplay,
  findLaborPair,
  findMaterialPair,
  getMainCategory,
  getShopSection,
  getPePipeKind,
  SHOP_SECTIONS,
} from '@/data/products'
import { ORDER_STORAGE_KEY } from '@/utils/constants'
import { isDuplicateOrder, validatePayment } from '@/utils/orderUtils'
import { skuSort } from '@/utils/productUtils'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import ShopNavbar from './ShopNavbar'
import ShopBody from './ShopBody'
import ShopFooter from './ShopFooter'

function ShopContent({ user, onLogout }) {
  const navigate = useNavigate()
  const { pendingWelcome, clearWelcome } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  // 상단: PLP / PE / 노출관 / 공통 (PE 안에서 SPPG·배관)
  const categories = ['전체', ...SHOP_SECTIONS, '인건만']
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const [pePipeFilter, setPePipeFilter] = useState('전체')
  const {
    cart,
    groupedCart,
    totalPrice,
    addToCart,
    setProductQty,
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

  const ITEMS_PER_PAGE = 60

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
      const rawName = String(user?.name || pendingWelcome || nameFromStorage || '').trim()
      const emailId = String(user?.email || '').split('@')[0]?.trim()
      const name = rawName.toLowerCase() === 'admin' && emailId
        ? emailId
        : (rawName || emailId || '회원')
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
    const validation = validatePayment(deliveryInfo, method)
    if (!validation.ok) return validation

    if (isDuplicateOrder(orderList, items, total, user?._id)) {
      return { ok: false, message: '동일한 주문이 최근에 접수되었습니다. 잠시 후 다시 시도해주세요.' }
    }

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
    return { ok: true }
  }

  const deleteOrder = useCallback((orderId) => {
    setOrderList((prev) => {
      const next = prev.filter((o) => o.id !== orderId)
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateOrder = useCallback((orderId, updated) => {
    setOrderList((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const addOrder = useCallback(() => {
    if (!user?._id) return null
    const order = {
      id: Date.now(),
      userId: user._id,
      userName: user.name || '',
      items: [],
      totalPrice: 0,
      paymentMethod: '',
      status: '입금대기',
      createdAt: new Date().toISOString(),
      delivery: { name: '', phone: '', address: '' },
    }
    setOrderList((prev) => {
      const next = [order, ...prev]
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
    return order.id
  }, [user?._id, user?.name])

  /** 현재 장바구니를 구매내역(주문 목록)에 추가 */
  const addCartAsOrder = useCallback(() => {
    if (!user?._id || !groupedCart?.length) return
    const order = {
      id: Date.now(),
      userId: user._id,
      userName: user.name || '',
      items: groupedCart.map((g) => ({ name: g.name, count: g.count, price: g.price })),
      totalPrice: totalPrice || 0,
      paymentMethod: '',
      status: '입금대기',
      createdAt: new Date().toISOString(),
      delivery: { ...deliveryInfo },
    }
    setOrderList((prev) => {
      const next = [order, ...prev]
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [user?._id, user?.name, groupedCart, totalPrice, deliveryInfo])

  const filteredProducts = useMemo(() => {
    let result = Array.isArray(products) ? products : []
    const trimmed = searchTerm.trim()
    if (trimmed) {
      const tokens = trimmed.toLowerCase().split(/\s+/).filter(Boolean)
      result = result.filter((p) => {
        const spec = (getSpecFromProduct(p) || '').toLowerCase()
        const cat = (getRemarkDisplay(p) || '').toLowerCase()
        const mainCat = (getMainCategory(p) || '').toLowerCase()
        const sec = (getShopSection(p) || '').toLowerCase()
        const peKind = (getPePipeKind(p) || '').toLowerCase()
        const sku = String(p.sku || '').toLowerCase()
        const haystack = [
          p.name || '',
          p.desc || '',
          p.size || '',
          p.unit || '',
          spec,
          sku,
          cat,
          mainCat,
          sec,
          peKind,
        ]
          .join(' ')
          .toLowerCase()

        // 입력한 단어들(예: "pem 400")이 모두 포함될 때만 매칭
        return tokens.every((t) => haystack.includes(t))
      })
    }
    if (categoryFilter !== '전체' && categoryFilter !== 'all') {
      if (categoryFilter === '인건만') {
        result = result.filter(
          (p) =>
            getCategory(p) === '도시가스-인건' &&
            (p.laborOnly === true || !findMaterialPair(p, products))
        )
      } else if (SHOP_SECTIONS.includes(categoryFilter)) {
        result = result.filter((p) => getShopSection(p) === categoryFilter)
        if (categoryFilter === 'PE' && pePipeFilter !== '전체') {
          result = result.filter((p) => getPePipeKind(p) === pePipeFilter)
        }
      }
    }
    // 자재 품목 먼저, 그 다음 인건 (자재 선택 시 인건이 따라오는 설계)
    return [...result].sort((a, b) => {
      const is자재A = getCategory(a) === '도시가스-자재' ? 0 : 1
      const is자재B = getCategory(b) === '도시가스-자재' ? 0 : 1
      if (is자재A !== is자재B) return is자재A - is자재B
      return skuSort(a, b)
    })
  }, [products, searchTerm, categoryFilter, pePipeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * ITEMS_PER_PAGE
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredProducts, productPage, ITEMS_PER_PAGE])

  useEffect(() => {
    setProductPage(1)
  }, [searchTerm, categoryFilter, pePipeFilter])

  useEffect(() => {
    if (categoryFilter !== 'PE') setPePipeFilter('전체')
  }, [categoryFilter])

  useEffect(() => {
    if (productPage > totalPages && totalPages > 0) setProductPage(totalPages)
  }, [productPage, totalPages])

  const handleAddToCart = (product, qty = 1) => {
    const n = Math.max(0, parseInt(qty) || 0)
    const addMode = categoryFilter === '공통' || categoryFilter === '인건만'
    if (addMode) {
      addToCart(product, n)
      const laborPair = findLaborPair(product, products)
      if (laborPair) addToCart(laborPair, n)
    } else {
      setProductQty(product, n)
      const laborPair = findLaborPair(product, products)
      if (laborPair) setProductQty(laborPair, n)
    }
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
      <aside className="shop-sidebar">
        <ShopNavbar
          user={user}
          onLogout={onLogout}
          cartCount={groupedCart.length}
        />
      </aside>
      <div className="shop-main">
      <ShopBody
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        pePipeFilter={pePipeFilter}
        onPePipeFilterChange={setPePipeFilter}
        onGoCart={() => navigate('/cart')}
        categories={categories}
        showOrderList={showOrderList}
        onShowOrderList={() => setShowOrderList(true)}
        onCloseOrderList={() => setShowOrderList(false)}
        orderList={myOrderList}
        onDeleteOrder={deleteOrder}
        onUpdateOrder={updateOrder}
        onAddOrder={addOrder}
        onAddCartAsOrder={addCartAsOrder}
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
        products={products}
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
        setProductQty={setProductQty}
        cartAddMode={categoryFilter === '공통' || categoryFilter === '인건만'}
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
    </div>
  )
}

export default ShopContent
