import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { userApi, productApi } from '@/services/api'
import { ORDER_STORAGE_KEY } from '@/utils/constants'
import ShopNavbar from '@/components/ShopNavbar'
import './AdminPage.css'

function AdminPage() {
  const { user, isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const [activeMenu, setActiveMenu] = useState('orders')
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [productForm, setProductForm] = useState({ name: '', desc: '', category: '', price: '', img: '/jpg/01.jpg' })
  const [productMsg, setProductMsg] = useState('')

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
      setProducts(data)
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
        setOrders(list.slice(0, 10))
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

  const handleProductSubmit = async (e) => {
    e.preventDefault()
    setProductMsg('')
    try {
      await productApi.create({
        name: productForm.name.trim(),
        desc: productForm.desc.trim() || `정성스럽게 구운 ${productForm.name.trim()}`,
        category: productForm.category.trim() || productForm.name.trim(),
        price: Number(productForm.price) || 0,
        img: productForm.img.trim() || '/jpg/01.jpg',
      })
      setProductForm({ name: '', desc: '', category: '', price: '', img: '/jpg/01.jpg' })
      setProductMsg('상품이 등록되었습니다.')
      loadProducts()
    } catch (err) {
      setProductMsg(err.message || '등록에 실패했습니다.')
    }
  }

  const handleProductDelete = async (id) => {
    if (!window.confirm('이 상품을 삭제하시겠습니까?')) return
    try {
      await productApi.delete(id)
      setProductMsg('상품이 삭제되었습니다.')
      loadProducts()
    } catch (err) {
      setProductMsg(err.message || '삭제에 실패했습니다.')
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
              <h2>새상품 등록</h2>
              <form onSubmit={handleProductSubmit} className="product-form">
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
                  <label>이미지 경로</label>
                  <input
                    type="text"
                    value={productForm.img}
                    onChange={(e) => setProductForm((p) => ({ ...p, img: e.target.value }))}
                    placeholder="/jpg/01.jpg"
                  />
                </div>
                <button type="submit" className="submit-btn">등록하기</button>
              </form>
              {productMsg && <p className="product-msg">{productMsg}</p>}
              {products.length > 0 && (
                <div className="product-list-admin">
                  <h3>등록된 상품 ({products.length})</h3>
                  <ul>
                    {products.map((p) => (
                      <li key={p._id} className="product-item-admin">
                        <span>{p.name}</span>
                        <span>{p.price?.toLocaleString()}원</span>
                        <button type="button" className="delete-btn" onClick={() => handleProductDelete(p._id)}>삭제</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {activeMenu === 'orders' && (
            <section className="admin-section">
              <div className="section-header">
                <h2>최근 주문</h2>
                <button type="button" className="view-all-btn">전체보기</button>
              </div>
              {orders.length === 0 ? (
                <p className="empty-msg">최근 주문이 없습니다.</p>
              ) : (
                <ul className="order-list">
                  {orders.map((order) => (
                    <li key={order.id} className="order-card">
                      <div className="order-id">ORD-{String(order.id).slice(-6)}</div>
                      <div className="order-customer">{order.userName || '-'}</div>
                      <div className="order-date">
                        {order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : '-'}
                      </div>
                      <span
                        className="order-status"
                        style={{ background: statusColors[order.status] || statusColors.처리중 }}
                      >
                        {statusText(order.status)}
                      </span>
                      <div className="order-amount">
                        {order.totalPrice ? `${order.totalPrice.toLocaleString()}원` : '0원'}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {activeMenu === 'sales' && (
            <section className="admin-section">
              <h2>매출 분석</h2>
              <p className="placeholder-msg">매출 분석 기능 준비 중입니다.</p>
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
