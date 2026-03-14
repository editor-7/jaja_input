import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { getCategory } from '@/data/products'
import ShopNavbar from '@/components/ShopNavbar'
import ShopFooter from '@/components/ShopFooter'
import './GreetingPage.css'

function GreetingPage() {
  const { user, isLoggedIn, logout } = useAuth()
  const { groupedCart } = useCart()

  return (
    <div className="greeting-page">
      <ShopNavbar
        user={isLoggedIn ? user : null}
        onLogout={logout}
        cartCount={groupedCart.filter((g) => getCategory(g) === '도시가스-자재').length}
      />

      <main className="greeting-main">
        <div className="greeting-header">
          <Link to="/" className="greeting-back-btn">← 홈</Link>
        </div>
        <article className="greeting-content">
          <h1 className="greeting-title">도시가스 자재 · 인건비 견적</h1>
          <div className="greeting-body">
            <p>도시가스 공사에 필요한 자재비·노무비 단가를 한곳에서 확인하고 견적을 내실 수 있습니다.</p>
            <p>PEM관, PLP관 등 배관 자재와 용접공·배관공·가스기사 등 인건비 단가를 품목별·규격별로 정리해 두었습니다.</p>
            <p>원하시는 품목을 장바구니에 담아 수량을 입력하면 금액이 자동으로 계산되며, 주문·결제 후 견적서로 활용하실 수 있습니다.</p>
            <p className="greeting-closing">편리하게 견적을 작성하고 문의하시면 됩니다.</p>
          </div>
        </article>
      </main>

      <ShopFooter />
    </div>
  )
}

export default GreetingPage
