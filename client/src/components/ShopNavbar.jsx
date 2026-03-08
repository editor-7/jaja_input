import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import './ShopNavbar.css'

function ShopNavbar({ user, onLogout, cartCount = 0 }) {
  const [showLogoModal, setShowLogoModal] = useState(false)

  return (
    <header className="shop-header">
        <div className="shop-header-inner">
          <div className="shop-logo">
            <button type="button" className="logo-img-btn" onClick={(e) => { e.stopPropagation(); setShowLogoModal(true) }} aria-label="로고 크게 보기">
              <img src="/jpg/jpg_01.png?v=3" alt="도시가스 자재몰" className="logo-img" loading="eager" decoding="async" />
            </button>
            <Link to="/" className="shop-logo-text">
              <h1>도시가스<br />자재몰</h1>
            </Link>
          </div>
          {showLogoModal && createPortal(
            <div className="logo-modal-overlay" onClick={() => setShowLogoModal(false)} role="dialog" aria-modal="true">
              <img src="/jpg/jpg_01.png?v=3" alt="도시가스 자재몰" className="logo-modal-img" onClick={(e) => e.stopPropagation()} />
            </div>,
            document.body
          )}
          <nav className="shop-nav-actions">
            <Link to="/greeting" className="nav-greeting">인사말</Link>
            <Link to="/cart" className="nav-cart" aria-label="장바구니 보기">
              <span className="nav-cart-icon">🛒</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>
            {user?.user_type === 'admin' && (
              <Link to="/admin" className="nav-admin">관리</Link>
            )}
            {user ? (
              <>
                <Link to="/my-profile" className="nav-user">{user.name}님</Link>
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
