import { Link } from 'react-router-dom'

function ShopNavbar({ user, onLogout, cartCount = 0 }) {
  return (
    <>
      <header className="shop-header">
        <div className="shop-header-inner">
          <Link to="/" className="shop-logo">
            <span className="logo-icon">✦</span>
            <h1>Mrs. Park Kambanew</h1>
            <span className="logo-tagline">마음을 담은 빵</span>
          </Link>
          <div className="shop-header-right">
            <button type="button" className="header-cart-btn">
              <span className="cart-icon">🛒</span>
              <span>장바구니</span>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
            {user?.user_type === 'admin' && (
              <Link to="/admin" className="admin-btn">
                관리
              </Link>
            )}
            <div className="shop-header-user">
              {user ? (
                <>
                  <span className="user-name">{user.name}님 환영합니다</span>
                  <button type="button" className="logout-btn" onClick={onLogout}>
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="nav-login-btn">로그인</Link>
                  <Link to="/signup" className="nav-signup-btn">회원가입</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <style>{`
        .shop-header {
          background: linear-gradient(135deg, #faf8f5 0%, #f5ebe6 50%, #efe4de 100%);
          color: var(--color-charcoal);
          padding: 0.6rem 1rem;
          border-bottom: 1px solid var(--color-border);
          box-shadow: var(--shadow-soft);
        }
        .shop-header-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .shop-logo {
          text-decoration: none;
          color: var(--color-charcoal);
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
        }
        .logo-icon {
          font-size: 1.2rem;
          color: var(--color-rose-gold);
          letter-spacing: 0.1em;
        }
        .shop-header h1 {
          margin: 0;
          font-family: var(--font-heading);
          font-size: 1.25rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .logo-tagline {
          font-size: 0.8rem;
          color: var(--color-muted);
          font-weight: 400;
          margin-left: 0.25rem;
        }
        .shop-header-right {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .header-cart-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          font-size: 0.95rem;
          font-weight: 500;
          background: #fff;
          color: var(--color-rose-gold);
          border: 1px solid var(--color-border);
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: var(--shadow-soft);
        }
        .header-cart-btn:hover {
          background: var(--color-blush);
          border-color: var(--color-rose);
          transform: translateY(-1px);
        }
        .cart-icon { font-size: 1rem; }
        .cart-count {
          background: var(--color-rose-gold);
          color: #fff;
          font-size: 0.75rem;
          min-width: 1.25rem;
          height: 1.25rem;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .admin-btn {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          background: var(--color-charcoal);
          color: #fff;
          border: none;
          border-radius: 8px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .admin-btn:hover {
          background: var(--color-soft-brown);
          color: #fff;
          transform: translateY(-1px);
        }
        .shop-header-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .user-name {
          font-weight: 500;
          font-size: 0.9rem;
          color: var(--color-soft-brown);
        }
        .logout-btn {
          padding: 0.35rem 0.85rem;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-muted);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: var(--color-blush);
          color: var(--color-charcoal);
        }
        .nav-login-btn {
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, var(--color-rose-gold) 0%, var(--color-dusty-rose) 100%);
          color: #fff;
          text-decoration: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .nav-login-btn:hover { opacity: 0.95; color: #fff; }
        .nav-signup-btn {
          padding: 0.5rem 1rem;
          background: #fff;
          color: var(--color-charcoal);
          text-decoration: none;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }
        .nav-signup-btn:hover { background: var(--color-blush); }
        @media (max-width: 768px) {
          .shop-header { padding: 0.75rem 1rem; }
          .shop-header-inner { flex-wrap: wrap; gap: 0.5rem; }
          .shop-logo { flex-wrap: wrap; gap: 0.25rem; }
          .logo-tagline { display: none; }
          .shop-header h1 { font-size: 1.2rem; }
          .shop-header-right { gap: 0.5rem; flex-wrap: wrap; }
          .header-cart-btn span:not(.cart-icon):not(.cart-count) { display: none; }
          .header-cart-btn { padding: 0.5rem 0.75rem; }
          .user-name { display: none; }
          .nav-login-btn, .nav-signup-btn { padding: 0.4rem 0.75rem; font-size: 0.85rem; }
        }
        @media (max-width: 480px) {
          .shop-header h1 { font-size: 1rem; }
          .logo-icon { font-size: 1rem; }
        }
      `}</style>
    </>
  )
}

export default ShopNavbar
