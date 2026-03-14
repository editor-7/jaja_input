import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { getCategory } from '@/data/products'
import ShopNavbar from '@/components/ShopNavbar'
import ShopFooter from '@/components/ShopFooter'
import './MyProfilePage.css'

function MyProfilePage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, logout } = useAuth()
  const { groupedCart } = useCart()

  useEffect(() => {
    if (!isLoggedIn || !user) {
      navigate('/login')
    }
  }, [isLoggedIn, user, navigate])

  if (!isLoggedIn || !user) {
    return null
  }

  return (
    <div className="shop-page my-profile-page">
      <aside className="shop-sidebar">
        <ShopNavbar
          user={user}
          onLogout={logout}
          cartCount={groupedCart.filter((g) => getCategory(g) === '도시가스-자재').length}
        />
      </aside>
      <div className="shop-main">
        <main className="my-profile-main">
          <div className="my-profile-header">
            <Link to="/" className="my-profile-back-btn">← 홈</Link>
          </div>
          <section className="my-profile-content">
            <h1 className="my-profile-title">내 정보</h1>
            <div className="my-profile-info">
              <div className="info-row">
                <span className="info-label">이름</span>
                <span className="info-value">{user.name || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">이메일</span>
                <span className="info-value">{user.email || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">연락처</span>
                <span className="info-value">{user.phone || '미등록'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">주소</span>
                <span className="info-value">{user.address || '미등록'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">회원 유형</span>
                <span className="info-value">{user.user_type === 'admin' ? '관리자' : '고객'}</span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default MyProfilePage
