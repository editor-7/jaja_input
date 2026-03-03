import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ShopNavbar.css'

function ShopNavbar({ user, onLogout, cartCount = 0 }) {
  const [showLogoModal, setShowLogoModal] = useState(false)

  return (
    <header className="shop-header">
        <div className="shop-header-inner">
          <div className="shop-logo">
            <button type="button" className="logo-img-btn" onClick={() => setShowLogoModal(true)} aria-label="로고 크게 보기">
              <img src="/jpg/jpg_01.png" alt="Mrs. Park Kambanew" className="logo-img" loading="eager" decoding="async" />
            </button>
            <Link to="/" className="shop-logo-text">
              <h1>Mrs. Park Kambanew</h1>
            </Link>
          </div>
          {showLogoModal && (
            <div className="logo-modal-overlay" onClick={() => setShowLogoModal(false)}>
              <img src="/jpg/jpg_01.png" alt="Mrs. Park Kambanew" className="logo-modal-img" onClick={(e) => e.stopPropagation()} />
            </div>
          )}
          <nav className="shop-nav-actions">
            <button type="button" className="nav-cart">
              🛒 {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
            {user?.user_type === 'admin' && (
              <Link to="/admin" className="nav-admin">관리</Link>
            )}
            {user ? (
              <>
                <span className="nav-user">{user.name}님</span>
                <button type="button" className="nav-logout" onClick={onLogout}>로그아웃</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-login">로그인</Link>
                <Link to="/signup" className="nav-signup">회원가입</Link>
              </>
            )}
          </nav>
        </div>
      </header>
  )
}

export default ShopNavbar
