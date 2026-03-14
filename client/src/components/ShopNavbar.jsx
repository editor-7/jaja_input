import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import './ShopNavbar.css'

function ShopNavbar({ user, onLogout, cartCount = 0 }) {
  const [showLogoModal, setShowLogoModal] = useState(false)
  const navigate = useNavigate()
  const { clearCart } = useCart()

  return (
    <header className="shop-header" role="banner">
        <div className="shop-header-inner">
          <div className="shop-logo">
            <div className="shop-logo-top">
              <Link to="/" className="logo-img-btn" aria-label="메인으로">
                <img src="/jpg/jpg_01.png?v=3" alt="도시가스 자재몰" className="logo-img" loading="eager" decoding="async" />
              </Link>
              <button type="button" className="logo-zoom-btn" onClick={(e) => { e.preventDefault(); setShowLogoModal(true) }} aria-label="로고 크게 보기" title="로고 크게 보기">
                🔍
              </button>
            </div>
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
          <nav className="shop-nav-actions" aria-label="메인 메뉴">
            <Link to="/" className="nav-home">홈</Link>
            <Link to="/greeting" className="nav-greeting">인사말</Link>
            <a
              href="/cart"
              className="nav-cart"
              aria-label="장바구니 보기"
              onClick={(e) => { e.preventDefault(); navigate('/cart') }}
            >
              <span className="nav-cart-icon">🛒</span>
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </a>
            {user?.user_type === 'admin' && (
              <Link to="/admin" className="nav-admin">
                관리
              </Link>
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
            <button
              type="button"
              className="nav-cart-clear"
              onClick={() => clearCart()}
              title="장바구니 비우기"
              aria-label="장바구니 비우기"
            >
              <span className="nav-cart-clear-full">장바구니 비우기</span>
              <span className="nav-cart-clear-short">비우기</span>
            </button>
          </nav>
        </div>
      </header>
  )
}

export default ShopNavbar
