import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { userApi, productApi } from '@/services/api'
import { ORDER_STORAGE_KEY } from '@/utils/constants'
import { skuSort } from '@/utils/productUtils'
import {
  getDisplayItemName,
  getSpecFromProduct,
  getCategory,
  getMainCategory,
  getMainCategoryLabel,
  findLaborPair,
  findMaterialPair,
  getMaterialKindSelectLabel,
  MAIN_CATEGORIES,
  getMaterialKindOptionsForAdmin,
  isAdminMaterialKindSelectValue,
  mapAdminFeeCategoryToDb,
  mapDbCategoryToAdminFeeSelect,
} from '@/data/products'
import { downloadProductsAsExcel } from '@/utils/exportProductsToExcel'
import ShopNavbar from '@/components/ShopNavbar'
import './AdminPage.css'

function AdminPage() {
  const { user, isLoggedIn, logout, isReady } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeMenu, setActiveMenu] = useState('orders')
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [productForm, setProductForm] = useState({
    sku: '',
    name: '',
    desc: '',
    spec: '',
    category: '도시가스-자재',
    mainCategory: '',
    price: '',
    img: '',
  })
  const [editingId, setEditingId] = useState(null)
  const [productMsg, setProductMsg] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [productSearchInput, setProductSearchInput] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')
  const [productMainCategoryFilter, setProductMainCategoryFilter] = useState('all')
  const [productSortBy, setProductSortBy] = useState('skuAsc')

  useEffect(() => {
    if (!isReady) return
    if (!isLoggedIn || !user) {
      navigate('/login')
      return
    }
    if (user.user_type !== 'admin') {
      navigate('/')
      return
    }
    loadUsers()
    loadOrders()
    loadProducts()
  }, [isReady, isLoggedIn, user, navigate])

  /** 쇼핑 화면 등에서 /admin?tab=product 로 진입 시 새상품 등록과 동일 탭 오픈 (+ fee=신규단가입력 시 요금 프리셋) */
  useEffect(() => {
    if (!isReady || !isLoggedIn || user?.user_type !== 'admin') return
    if (searchParams.get('tab') === 'product') {
      setActiveMenu('product')
      const feeRaw = searchParams.get('fee')
      const fee = feeRaw ? decodeURIComponent(feeRaw) : ''
      if (fee === '신규단가입력') {
        setProductForm((prev) => ({ ...prev, category: '신규단가입력' }))
      }
      setSearchParams({}, { replace: true })
    }
  }, [isReady, isLoggedIn, user, searchParams, setSearchParams])

  const adminMaterialKindOptions = useMemo(() => getMaterialKindOptionsForAdmin(products), [products])

  useEffect(() => {
    setProductSearchInput(productSearch)
  }, [productSearch])

  const applyProductSearch = () => {
    setProductSearch(productSearchInput)
  }

  const loadProducts = async () => {
    try {
      const data = await productApi.getAll()
      setProducts(Array.isArray(data) ? data : data?.data || data?.products || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await userApi.getAll()
      setUsers(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadOrders = () => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY)
      if (saved) {
        const list = JSON.parse(saved)
        setOrders(list)
      }
    } catch (e) {}
  }

  if (!isReady) {
    return (
      <div className="shop-page admin-page">
        <aside className="shop-sidebar">
          <ShopNavbar user={user} onLogout={logout} cartCount={0} />
        </aside>
        <div className="shop-main admin-main-standalone">
          <div className="admin-loading-msg">로딩 중...</div>
        </div>
      </div>
    )
  }
  if (!isLoggedIn || user?.user_type !== 'admin') {
    return (
      <div className="shop-page admin-page">
        <aside className="shop-sidebar">
          <ShopNavbar user={user} onLogout={logout} cartCount={0} />
        </aside>
        <div className="shop-main admin-main-standalone">
          <div className="admin-loading-msg">접근 권한이 없습니다. 로그인 후 다시 시도해 주세요.</div>
          <Link to="/login" className="admin-back-btn" style={{ marginTop: '1rem', display: 'inline-block' }}>로그인</Link>
        </div>
      </div>
    )
  }

  const statusColors = {
    결제완료: 'rgba(183, 110, 121, 0.2)',
    입금대기: 'var(--color-blush)',
    처리중: 'var(--color-sage)',
    배송중: 'rgba(183, 110, 121, 0.15)',
    배송완료: 'rgba(183, 110, 121, 0.2)',
  }

  const statusText = (status) => status || '처리중'

  const handleProductEdit = async (p) => {
    setEditingId(p._id)
    setProductMsg('')
    try {
      const fresh = await productApi.getById(p._id)
      setProductForm({
        sku: fresh.sku ?? '',
        name: fresh.name || '',
        desc: fresh.desc || '',
        spec: fresh.spec || '',
        category: mapDbCategoryToAdminFeeSelect(fresh.category || ''),
        mainCategory: fresh.mainCategory || '',
        price: fresh.price ?? '',
        img: fresh.img || '',
      })
    } catch {
      setProductForm({
        sku: p.sku ?? '',
        name: p.name || '',
        desc: p.desc || '',
        spec: p.spec || '',
        category: mapDbCategoryToAdminFeeSelect(p.category || ''),
        mainCategory: p.mainCategory || '',
        price: p.price ?? '',
        img: p.img || '',
      })
    }
  }

  const handleProductSubmit = async (e) => {
    e.preventDefault()
    setProductMsg('')
    const skuVal = String(productForm.sku ?? '').trim()
    const rawCat = productForm.category.trim() || '도시가스-자재'
    const payload = {
      sku: skuVal,
      name: productForm.name.trim(),
      desc: productForm.desc.trim() || `정성스럽게 구운 ${productForm.name.trim()}`,
      spec: (productForm.spec ?? '').trim(),
      category: mapAdminFeeCategoryToDb(rawCat) || '도시가스-자재',
      mainCategory: (productForm.mainCategory ?? '').trim(),
      price: Number(productForm.price) || 0,
      img: productForm.img?.trim() || '',
    }
    try {
      if (editingId) {
        const updated = await productApi.update(editingId, payload)
        setProducts((prev) => prev.map((p) => (String(p._id) === String(editingId) ? updated : p)))
        setProductMsg('상품이 수정되었습니다.')
        setProductForm({
          sku: updated.sku || '',
          name: updated.name || '',
          desc: updated.desc || '',
          category: mapDbCategoryToAdminFeeSelect(updated.category || ''),
          mainCategory: updated.mainCategory || '',
          price: updated.price ?? '',
          img: updated.img || '',
        })
      } else {
        await productApi.create(payload)
        setProductMsg('상품이 등록되었습니다.')
        const keepFee =
          String(productForm.category || '').trim() === '신규단가입력' ? '신규단가입력' : '도시가스-자재'
        setProductForm({
          sku: '',
          name: '',
          desc: '',
          spec: '',
          category: keepFee,
          mainCategory: '',
          price: '',
          img: '',
        })
      }
      if (!editingId) loadProducts()
    } catch (err) {
      setProductMsg(err?.message || (editingId ? '수정에 실패했습니다.' : '등록에 실패했습니다.'))
    }
  }

  const managedProducts = (() => {
    let list = [...products]
    if (productSearch.trim()) {
      const term = productSearch.trim().toLowerCase()
      list = list.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(term) ||
          (p.sku || '').toLowerCase().includes(term) ||
          (p.category || '').toLowerCase().includes(term) ||
          (p.desc || '').toLowerCase().includes(term)
      )
    }
    if (productCategoryFilter !== 'all') {
      list = list.filter((p) => (p.category || p.name) === productCategoryFilter)
    }
    if (productMainCategoryFilter !== 'all') {
      list = list.filter((p) => getMainCategory(p) === productMainCategoryFilter)
    }
    if (productSortBy === 'skuAsc') list.sort(skuSort)
    else if (productSortBy === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    else if (productSortBy === 'priceAsc') list.sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (productSortBy === 'priceDesc') list.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (productSortBy === 'createdAt') list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return list
  })()

  const productCategories = (() => {
    const sorted = [...products].sort(skuSort)
    const seen = new Set()
    const fromProducts = sorted
      .map((p) => p.category || p.name)
      .filter(Boolean)
    return [...adminMaterialKindOptions.map((o) => o.value), ...fromProducts]
      .filter((c) => {
        if (seen.has(c)) return false
        seen.add(c)
        return true
      })
  })()

  const feeSelectKey = mapDbCategoryToAdminFeeSelect(productForm.category)
  const materialKindSelectValue = isAdminMaterialKindSelectValue(feeSelectKey, products)
    ? feeSelectKey
    : '__custom__'

  const 신규단가CatalogRows = useMemo(() => {
    if (feeSelectKey !== '신규단가입력') return []
    return [...products]
      .filter((p) => {
        const c = String(p?.category || '').trim()
        return c === '신규단가' || c === '신규단가입력'
      })
      .sort(skuSort)
  }, [products, feeSelectKey])

  const handleProductDelete = async (id) => {
    if (!window.confirm('이 상품을 삭제하시겠습니까?')) return
    const targetId = String(id || '').trim()
    if (!targetId) {
      setProductMsg('삭제할 상품 ID를 찾지 못했습니다.')
      return
    }
    const target = products.find((p) => String(p._id) === targetId)
    const targetName = target ? `${getDisplayItemName(target)} ${getSpecFromProduct(target) || ''}`.trim() : ''
    const confirmText = '삭제'
    const typed = window.prompt(
      `삭제 잠금: 정말 삭제하려면 "${confirmText}" 를 입력하세요.\n` +
      `${targetName ? `대상: ${targetName}` : ''}`
    )
    if (typed == null) return
    if (String(typed).trim() !== confirmText) {
      setProductMsg('삭제가 취소되었습니다. (확인 문구 불일치)')
      setTimeout(() => setProductMsg(''), 2500)
      return
    }
    try {
      const toDeleteIds = new Set([targetId])
      if (target) {
        const cat = getCategory(target)
        const pair =
          cat === '도시가스-자재'
            ? findLaborPair(target, products)
            : cat === '도시가스-인건'
              ? findMaterialPair(target, products)
              : null
        if (pair?._id) toDeleteIds.add(String(pair._id))
      }

      // 선택한 품목은 반드시 삭제, 짝 품목은 존재할 때 함께 삭제
      await productApi.delete(targetId)
      const pairIds = [...toDeleteIds].filter((x) => x !== targetId)
      for (const pairId of pairIds) {
        try {
          await productApi.delete(pairId)
        } catch (err) {
          // 이미 없거나 권한/동기화 지연으로 실패할 수 있어 주 삭제 흐름은 유지
        }
      }

      setProducts((prev) => prev.filter((p) => !toDeleteIds.has(String(p._id))))
      if (editingId && toDeleteIds.has(String(editingId))) {
        setEditingId(null)
        setProductForm({ sku: '', name: '', desc: '', spec: '', category: '도시가스-자재', mainCategory: '', price: '', img: '' })
      }
      setProductMsg(toDeleteIds.size > 1 ? `상품 ${toDeleteIds.size}건이 삭제되었습니다.` : '상품이 삭제되었습니다.')
      // 서버 기준으로 한 번 더 동기화해 재등장/잔상 이슈를 방지
      await loadProducts()
      setTimeout(() => setProductMsg(''), 3000)
    } catch (err) {
      setProductMsg(err?.message || '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="shop-page admin-page">
      <aside className="shop-sidebar">
        <ShopNavbar user={user} onLogout={logout} cartCount={0} />
      </aside>
      <div className="shop-main">
      <header className="admin-header">
        <div className="admin-header-inner">
          <h1>관리자 모드</h1>
          <Link to="/" className="admin-back-btn">
            자재몰로 돌아가기
          </Link>
        </div>
      </header>

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <h2 className="sidebar-title">빠른 작업</h2>
          <nav className="quick-tasks">
            <button
              type="button"
              className={`task-btn ${activeMenu === 'product' ? 'active' : ''}`}
              onClick={() => setActiveMenu('product')}
            >
              <span className="task-icon">+</span>
              새상품 등록
            </button>
            <button
              type="button"
              className={`task-btn ${activeMenu === 'productList' ? 'active' : ''}`}
              onClick={() => setActiveMenu('productList')}
            >
              <span className="task-icon">📋</span>
              상품관리
            </button>
            <button
              type="button"
              className={`task-btn ${activeMenu === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveMenu('orders')}
            >
              <span className="task-icon">📦</span>
              주문 관리
            </button>
            <button
              type="button"
              className={`task-btn ${activeMenu === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveMenu('sales')}
            >
              <span className="task-icon">📊</span>
              매출 분석
            </button>
            <button
              type="button"
              className={`task-btn ${activeMenu === 'customers' ? 'active' : ''}`}
              onClick={() => setActiveMenu('customers')}
            >
              <span className="task-icon">👥</span>
              고객 관리
            </button>
          </nav>
        </aside>

        <main className="admin-main">
          {activeMenu === 'product' && (
            <section className="admin-section">
              <h2>{editingId ? '상품 수정' : '새상품 등록'}</h2>
              <form onSubmit={handleProductSubmit} className="product-form">
                <div className="form-row">
                  <label>상품 ID (SKU)</label>
                  <input
                    type="text"
                    value={productForm.sku ?? ''}
                    onChange={(e) => setProductForm((p) => ({ ...p, sku: e.target.value }))}
                    placeholder="예: BREAD-001"
                  />
                </div>
                <div className="form-row">
                  <label>상품명 *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="예: PEM 관"
                    required
                  />
                </div>
                <div className="form-row">
                  <label>규격</label>
                  <input
                    type="text"
                    value={productForm.spec ?? ''}
                    onChange={(e) => setProductForm((p) => ({ ...p, spec: e.target.value }))}
                    placeholder="예: 63A"
                  />
                </div>
                <div className="form-row">
                  <label>설명</label>
                  <input
                    type="text"
                    value={productForm.desc}
                    onChange={(e) => setProductForm((p) => ({ ...p, desc: e.target.value }))}
                    placeholder="예: 정성스럽게 구운 깜바뉴"
                  />
                </div>
                <div className="form-row">
                  <label>요금 구분</label>
                  <select
                    value={materialKindSelectValue}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '__custom__') {
                        setProductForm((p) => ({
                          ...p,
                          category: isAdminMaterialKindSelectValue(p.category, products) ? '' : p.category,
                        }))
                        return
                      }
                      setProductForm((p) => ({ ...p, category: v }))
                    }}
                  >
                    {adminMaterialKindOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                    <option value="__custom__">기타 (직접 입력)</option>
                  </select>
                  {materialKindSelectValue === '__custom__' && (
                    <input
                      type="text"
                      className="form-row-follow"
                      value={productForm.category}
                      onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                      placeholder="category 필드에 저장할 문자열"
                    />
                  )}
                </div>
                <div className="form-row">
                  <label>관로 구분 (대분류)</label>
                  <select
                    value={productForm.mainCategory}
                    onChange={(e) => setProductForm((p) => ({ ...p, mainCategory: e.target.value }))}
                  >
                    <option value="">자동 (품명·규칙으로 추정)</option>
                    {MAIN_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{getMainCategoryLabel(c)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <label>가격(원) *</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="예: 18000"
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="submit-btn">
                    {editingId ? '수정완료' : '등록하기'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => {
                        setEditingId(null)
                        setProductForm({ sku: '', name: '', desc: '', spec: '', category: '도시가스-자재', mainCategory: '', price: '', img: '' })
                        setProductMsg('')
                      }}
                    >
                      취소
                    </button>
                  )}
                </div>
              </form>
              {productMsg && <p className="product-msg">{productMsg}</p>}
              {(feeSelectKey === '신규단가입력' || products.length > 0) && (
                <div
                  className={
                    feeSelectKey === '신규단가입력'
                      ? 'product-list-admin product-list-admin--신규단가'
                      : 'product-list-admin'
                  }
                >
                  <h3>
                    {feeSelectKey === '신규단가입력'
                      ? `신규 단가 품목 (${신규단가CatalogRows.length})`
                      : `등록된 상품 (${products.length})`}
                  </h3>
                  {feeSelectKey === '신규단가입력' ? (
                    신규단가CatalogRows.length === 0 ? (
                      <p className="empty-msg">
                        등록된 신규 단가 품목이 없습니다. 위 폼에서 요금 <strong>신규단가입력</strong>으로 저장한 품목만 이 목록에 표시됩니다.
                      </p>
                    ) : (
                      <ul>
                        {신규단가CatalogRows.map((p) => (
                          <li key={p._id} className="product-item-admin product-item-admin--신규단가-row">
                            <span className="product-sku">{p.sku || '-'}</span>
                            <span className="admin-신규단가-name">{getDisplayItemName(p)}</span>
                            <span className="admin-신규단가-spec">{getSpecFromProduct(p) || '-'}</span>
                            <span className="admin-신규단가-price">{p.price != null ? `${Number(p.price).toLocaleString()}원` : '-'}</span>
                            <div className="product-actions">
                              <button type="button" className="edit-btn" onClick={() => handleProductEdit(p)}>수정</button>
                              <button type="button" className="delete-btn" onClick={() => handleProductDelete(p._id)}>삭제</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : (
                    <ul>
                      {products.map((p) => (
                        <li key={p._id} className="product-item-admin">
                          <span className="product-sku">{p.sku || '-'}</span>
                          <span>{p.name}</span>
                          <span>{p.price?.toLocaleString()}원</span>
                          <div className="product-actions">
                            <button type="button" className="edit-btn" onClick={() => handleProductEdit(p)}>수정</button>
                            <button type="button" className="delete-btn" onClick={() => handleProductDelete(p._id)}>삭제</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          )}

          {activeMenu === 'productList' && (
            <section className="admin-section">
              <div className="section-header">
                <h2>상품관리 ({managedProducts.length}{managedProducts.length !== products.length ? ` / ${products.length}` : ''})</h2>
                <div className="section-header-actions">
                  <button type="button" className="task-btn secondary" onClick={() => downloadProductsAsExcel(products)} disabled={products.length === 0}>
                    전체 물량 엑셀 다운로드
                  </button>
                  <button type="button" className="task-btn" onClick={() => { setProductMsg(''); setActiveMenu('product') }}>
                    + 새상품 등록
                  </button>
                </div>
              </div>
              {productMsg && <p className="product-msg">{productMsg}</p>}
              {products.length === 0 ? (
                <p className="empty-msg">등록된 상품이 없습니다. 새상품 등록에서 추가해 주세요.</p>
              ) : (
                <>
                  <div className="product-management-toolbar">
                    <input
                      type="text"
                      placeholder="상품명, SKU, 카테고리 검색"
                      value={productSearchInput}
                      onChange={(e) => setProductSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          applyProductSearch()
                        }
                      }}
                      className="product-search-input"
                    />
                    <button type="button" className="toolbar-search-btn" onClick={applyProductSearch} aria-label="검색">
                      🔍
                    </button>
                    <select
                      value={productMainCategoryFilter}
                      onChange={(e) => setProductMainCategoryFilter(e.target.value)}
                      className="product-filter-select"
                    >
                      <option value="all">관로 · 전체</option>
                      {MAIN_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{getMainCategoryLabel(c)}</option>
                      ))}
                    </select>
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="product-filter-select"
                    >
                      <option value="all">요금 · 전체</option>
                      {productCategories.map((c) => (
                        <option key={c} value={c}>{getMaterialKindSelectLabel(c)}</option>
                      ))}
                    </select>
                    <select
                      value={productSortBy}
                      onChange={(e) => setProductSortBy(e.target.value)}
                      className="product-sort-select"
                    >
                      <option value="skuAsc">SKU 낮은번호순</option>
                      <option value="createdAt">최신순</option>
                      <option value="name">이름순</option>
                      <option value="priceAsc">가격 낮은순</option>
                      <option value="priceDesc">가격 높은순</option>
                    </select>
                  </div>
                  <div className="product-list-table">
                    <div className="product-list-header">
                      <span>SKU</span>
                      <span>상품명</span>
                      <span>규격</span>
                      <span>관로</span>
                      <span>요금</span>
                      <span>가격</span>
                      <span>관리</span>
                    </div>
                    {managedProducts.map((p) => (
                      <div key={p._id} className="product-list-row">
                        <span className="product-list-sku">{p.sku || '-'}</span>
                        <span className="product-list-name">{getDisplayItemName(p)}</span>
                        <span className="product-list-spec">{getSpecFromProduct(p) || '-'}</span>
                        <span className="product-list-category">{getMainCategoryLabel(getMainCategory(p))}</span>
                        <span className="product-list-category">{getMaterialKindSelectLabel(p.category) || '-'}</span>
                        <span className="product-list-price">{p.price?.toLocaleString()}원</span>
                        <div className="product-list-actions">
                          <button type="button" className="edit-btn" onClick={() => { handleProductEdit(p); setActiveMenu('product') }}>
                            수정
                          </button>
                          <button type="button" className="delete-btn" onClick={() => handleProductDelete(p._id)}>삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {managedProducts.length === 0 && products.length > 0 && (
                    <p className="empty-msg">검색 결과가 없습니다.</p>
                  )}
                </>
              )}
            </section>
          )}

          {activeMenu === 'orders' && (
            <section className="admin-section">
              <div className="section-header">
                <h2>주문 관리 ({orders.length}건)</h2>
                <button type="button" className="view-all-btn" onClick={loadOrders}>새로고침</button>
              </div>
              <div className="order-table-wrap">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>주문번호</th>
                      <th>주문일자</th>
                      <th>주문금액</th>
                      <th>회원아이디</th>
                      <th>주문자</th>
                      <th>결제수단</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="order-empty-cell">
                          주문 내역이 없습니다. (0건)
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        const matchedUser = users.find((u) => String(u._id) === String(order.userId))
                        const userEmail = matchedUser?.email || order.userId || '-'
                        return (
                          <tr key={order.id}>
                            <td className="order-num">ORD-{String(order.id).slice(-8)}</td>
                            <td className="order-date">
                              {order.createdAt ? new Date(order.createdAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }) : '-'}
                            </td>
                            <td className="order-amount">{order.totalPrice ? `${order.totalPrice.toLocaleString()}원` : '0원'}</td>
                            <td className="order-user-id">{userEmail}</td>
                            <td className="order-user-name">{order.userName || '-'}</td>
                            <td className="order-payment">
                              {order.paymentMethod === 'card' ? '카드' : order.paymentMethod === 'transfer' ? '계좌이체' : order.paymentMethod === 'deposit' ? '무통장입금' : '-'}
                            </td>
                            <td>
                              <span
                                className="order-status-badge"
                                style={{ background: statusColors[order.status] || statusColors.처리중 }}
                              >
                                {statusText(order.status)}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeMenu === 'sales' && (
            <section className="admin-section">
              <div className="section-header">
                <h2>매출 분석 ({orders.length}건)</h2>
                <button type="button" className="view-all-btn" onClick={loadOrders}>새로고침</button>
              </div>
              <div className="order-table-wrap">
                <table className="order-table sales-table">
                  <thead>
                    <tr>
                      <th>구분</th>
                      <th>건수</th>
                      <th>금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="order-empty-cell">
                          매출 내역이 없습니다. (0건)
                        </td>
                      </tr>
                    ) : (
                      <>
                        {['결제완료', '입금대기'].map((status) => {
                          const filtered = orders.filter((o) => o.status === status)
                          const total = filtered.reduce((s, o) => s + (o.totalPrice || 0), 0)
                          return (
                            <tr key={status}>
                              <td>{status}</td>
                              <td>{filtered.length}건</td>
                              <td className="order-amount">{total.toLocaleString()}원</td>
                            </tr>
                          )
                        })}
                        <tr className="sales-total-row">
                          <td><strong>합계</strong></td>
                          <td><strong>{orders.length}건</strong></td>
                          <td className="order-amount"><strong>{orders.reduce((s, o) => s + (o.totalPrice || 0), 0).toLocaleString()}원</strong></td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeMenu === 'customers' && (
            <section className="admin-section">
              <div className="section-header">
                <h2>고객 관리</h2>
              </div>
              {users.length === 0 ? (
                <p className="empty-msg">등록된 고객이 없습니다.</p>
              ) : (
                <ul className="customer-list">
                  {users.map((u) => (
                    <li key={u._id} className="customer-card">
                      <div className="customer-name">{u.name}</div>
                      <div className="customer-email">{u.email}</div>
                      <span className={`customer-type ${u.user_type}`}>{u.user_type === 'admin' ? '관리자' : '고객'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>
      </div>
      </div>
    </div>
  )
}

export default AdminPage
