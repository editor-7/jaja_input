import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { userApi, productApi } from '@/services/api'
import { ORDER_STORAGE_KEY } from '@/utils/constants'
import { skuSort } from '@/utils/productUtils'
import ShopNavbar from '@/components/ShopNavbar'
import ImageUpload from '@/components/ImageUpload'
import './AdminPage.css'

function AdminPage() {
  const { user, isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('orders')
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [productForm, setProductForm] = useState({ sku: '', name: '', desc: '', category: '', price: '', img: '/jpg/01.jpg' })
  const [editingId, setEditingId] = useState(null)
  const [productMsg, setProductMsg] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [productCategoryFilter, setProductCategoryFilter] = useState('all')
  const [productSortBy, setProductSortBy] = useState('sku')

  useEffect(() => {
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
  }, [isLoggedIn, user, navigate])

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

  if (!isLoggedIn || user?.user_type !== 'admin') {
    return null
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
        category: fresh.category || '',
        price: fresh.price ?? '',
        img: fresh.img || '/jpg/01.jpg',
      })
    } catch {
      setProductForm({
        sku: p.sku ?? '',
        name: p.name || '',
        desc: p.desc || '',
        category: p.category || '',
        price: p.price ?? '',
        img: p.img || '/jpg/01.jpg',
      })
    }
  }

  const handleProductSubmit = async (e) => {
    e.preventDefault()
    setProductMsg('')
    const skuVal = String(productForm.sku ?? '').trim()
    const payload = {
      sku: skuVal,
      name: productForm.name.trim(),
      desc: productForm.desc.trim() || `정성스럽게 구운 ${productForm.name.trim()}`,
      category: productForm.category.trim() || productForm.name.trim(),
      price: Number(productForm.price) || 0,
      img: productForm.img.trim() || '/jpg/01.jpg',
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
          category: updated.category || '',
          price: updated.price ?? '',
          img: updated.img || '/jpg/01.jpg',
        })
      } else {
        await productApi.create(payload)
        setProductMsg('상품이 등록되었습니다.')
        setProductForm({ sku: '', name: '', desc: '', category: '', price: '', img: '/jpg/01.jpg' })
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
    if (productSortBy === 'sku') list.sort(skuSort)
    else if (productSortBy === 'name') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    else if (productSortBy === 'priceAsc') list.sort((a, b) => (a.price || 0) - (b.price || 0))
    else if (productSortBy === 'priceDesc') list.sort((a, b) => (b.price || 0) - (a.price || 0))
    else if (productSortBy === 'createdAt') list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    return list
  })()

  const productCategories = (() => {
    const sorted = [...products].sort(skuSort)
    const seen = new Set()
    return sorted
      .map((p) => p.category || p.name)
      .filter(Boolean)
      .filter((c) => {
        if (seen.has(c)) return false
        seen.add(c)
        return true
      })
  })()

  const handleProductDelete = async (id) => {
    if (!window.confirm('이 상품을 삭제하시겠습니까?')) return
    try {
      await productApi.delete(id)
      setProducts((prev) => prev.filter((p) => String(p._id) !== String(id)))
      if (editingId && String(editingId) === String(id)) {
        setEditingId(null)
        setProductForm({ sku: '', name: '', desc: '', category: '', price: '', img: '/jpg/01.jpg' })
      }
      setProductMsg('상품이 삭제되었습니다.')
      setTimeout(() => setProductMsg(''), 3000)
    } catch (err) {
      setProductMsg(err?.message || '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="admin-page">
      <ShopNavbar user={user} onLogout={logout} cartCount={0} />
      <header className="admin-header">
        <div className="admin-header-inner">
          <h1>관리자 모드</h1>
          <Link to="/" className="admin-back-btn">
            제과점으로 돌아가기
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
                    placeholder="예: 깜바뉴"
                    required
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
                  <label>카테고리</label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))}
                    placeholder="예: 클래식"
                  />
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
                <div className="form-row">
                  <label>이미지</label>
                  <ImageUpload
                    value={productForm.img}
                    onChange={(url) => setProductForm((p) => ({ ...p, img: url || '/jpg/01.jpg' }))}
                    placeholder="/jpg/01.jpg"
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
                        setProductForm({ sku: '', name: '', desc: '', category: '', price: '', img: '/jpg/01.jpg' })
                        setProductMsg('')
                      }}
                    >
                      취소
                    </button>
                  )}
                </div>
              </form>
              {productMsg && <p className="product-msg">{productMsg}</p>}
              {products.length > 0 && (
                <div className="product-list-admin">
                  <h3>등록된 상품 ({products.length})</h3>
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
                </div>
              )}
            </section>
          )}

          {activeMenu === 'productList' && (
            <section className="admin-section">
              <div className="section-header">
                <h2>상품관리 ({managedProducts.length}{managedProducts.length !== products.length ? ` / ${products.length}` : ''})</h2>
                <button type="button" className="task-btn" onClick={() => { setProductMsg(''); setActiveMenu('product') }}>
                  + 새상품 등록
                </button>
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
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="product-search-input"
                    />
                    <select
                      value={productCategoryFilter}
                      onChange={(e) => setProductCategoryFilter(e.target.value)}
                      className="product-filter-select"
                    >
                      <option value="all">전체 카테고리</option>
                      {productCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={productSortBy}
                      onChange={(e) => setProductSortBy(e.target.value)}
                      className="product-sort-select"
                    >
                      <option value="sku">ID(SKU)순</option>
                      <option value="createdAt">최신순</option>
                      <option value="name">이름순</option>
                      <option value="priceAsc">가격 낮은순</option>
                      <option value="priceDesc">가격 높은순</option>
                    </select>
                  </div>
                  <div className="product-list-table">
                    <div className="product-list-header">
                      <span>이미지</span>
                      <span>SKU</span>
                      <span>상품명</span>
                      <span>카테고리</span>
                      <span>가격</span>
                      <span>관리</span>
                    </div>
                    {managedProducts.map((p) => (
                      <div key={p._id} className="product-list-row">
                        <div className="product-list-img">
                          <img src={p.img || '/jpg/01.jpg'} alt={p.name} onError={(e) => { e.target.style.display = 'none' }} />
                        </div>
                        <span className="product-list-sku">{p.sku || '-'}</span>
                        <span className="product-list-name">{p.name}</span>
                        <span className="product-list-category">{p.category || '-'}</span>
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
  )
}

export default AdminPage
