import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { getCategory } from '@/data/products'
import { ORDER_STORAGE_KEY } from '@/utils/constants'
import { isDuplicateOrder, validatePayment } from '@/utils/orderUtils'
import { downloadCartAsExcel } from '@/utils/exportCartToExcel'
import ShopNavbar from '@/components/ShopNavbar'
import ShopFooter from '@/components/ShopFooter'
import './CartPage.css'

function CartPage() {
  const { user, isLoggedIn, logout } = useAuth()
  const {
    groupedCart,
    totalPrice,
    changeCartQty,
    removeFromCart,
    clearCart,
  } = useCart()

  const [showOrderList, setShowOrderList] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [orderList, setOrderList] = useState([])
  const [deliveryInfo, setDeliveryInfo] = useState({ name: '', phone: '', address: '' })
  const [showPayment, setShowPayment] = useState(false)
  const [paymentStep, setPaymentStep] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY)
      if (saved) setOrderList(JSON.parse(saved))
    } catch (e) {}
  }, [])

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

  const handlePaymentComplete = () => {
    clearCart(true)
    setShowPayment(false)
    setPaymentStep(1)
    setPaymentMethod('')
  }

  const handleShowPayment = () => {
    if (!isLoggedIn || !user) {
      setToastMsg('회원가입 후 구매 가능합니다.')
      setTimeout(() => setToastMsg(''), 3000)
      return
    }
    setShowPayment(true)
    setPaymentStep(1)
    setPaymentMethod('')
  }

  return (
    <div className="cart-page">
      <ShopNavbar
        user={isLoggedIn ? user : null}
        onLogout={logout}
        cartCount={groupedCart.filter((g) => getCategory(g) === '도시가스-자재').length}
      />

      {toastMsg && <div className="cart-toast-msg">{toastMsg}</div>}
      <main className="cart-page-main">
        {showOrderList ? (
          <div className="order-list-view">
            <div className="order-list-header">
              <h2>내 구매 리스트</h2>
              <div className="order-list-actions">
                <Link to="/" className="back-to-list-btn">← 홈</Link>
                <button type="button" className="back-to-list-btn" onClick={() => setShowOrderList(false)}>
                  장바구니로
                </button>
              </div>
            </div>
            {orderList.length === 0 ? (
              <p className="empty-orders">구매 내역이 없습니다.</p>
            ) : (
              <ul className="order-list">
                {orderList.map((order) => (
                  <li key={order.id} className="order-item">
                    <div className="order-meta">
                      <span className="order-date">
                        {new Date(order.createdAt).toLocaleString('ko-KR')}
                      </span>
                      <span className={`order-status status-${order.status === '결제완료' ? 'done' : 'wait'}`}>
                        {order.status}
                      </span>
                    </div>
                    <ul className="order-items">
                      {order.items.map((g, i) => (
                        <li key={i}>
                          {g.name} × {g.count}개 — {(g.price * g.count).toLocaleString()}원
                        </li>
                      ))}
                    </ul>
                    <div className="order-total">
                      총 {order.totalPrice.toLocaleString()}원 ({order.paymentMethod === 'card' ? '카드결제' : order.paymentMethod === 'transfer' ? '계좌이체' : '무통장입금'})
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : showPayment ? (
          <div className="payment-mode">
            <div className="payment-mode-header">
              <div className="payment-header-actions">
                <Link to="/" className="back-to-cart-btn">← 홈</Link>
                <button
                  type="button"
                  className="back-to-cart-btn"
                  onClick={() => {
                    setShowPayment(false)
                    setPaymentStep(1)
                    setPaymentMethod('')
                  }}
                >
                  나가기
                </button>
              </div>
              <h2>결제하기</h2>
            </div>
            <div className="payment-summary">
              <h3>주문 내역</h3>
              <ul>
                {groupedCart.map((g, idx) => (
                  <li key={idx}>
                    <span>{g.name}</span>
                    <span>{g.count}개</span>
                    <span>{(g.price * g.count).toLocaleString()}원</span>
                  </li>
                ))}
              </ul>
              <div className="payment-total">
                <strong>총 결제금액</strong>
                <strong>{totalPrice.toLocaleString()}원</strong>
              </div>
            </div>
            <div className="payment-delivery">
              <h3>배송 정보</h3>
              <div className="form-row">
                <label>수령인</label>
                <input
                  type="text"
                  placeholder="이름"
                  value={deliveryInfo.name}
                  onChange={(e) => setDeliveryInfo((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <label>연락처</label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={deliveryInfo.phone}
                  onChange={(e) => setDeliveryInfo((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <label>주소</label>
                <input
                  type="text"
                  placeholder="주소를 입력하세요"
                  value={deliveryInfo.address}
                  onChange={(e) => setDeliveryInfo((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
            </div>
            <div className="payment-method">
              <h3>결제 수단 선택</h3>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                신용/체크카드
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={() => setPaymentMethod('transfer')}
                />
                계좌이체
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="deposit"
                  checked={paymentMethod === 'deposit'}
                  onChange={() => setPaymentMethod('deposit')}
                />
                무통장입금
              </label>
            </div>

            {paymentStep === 1 ? (
              <button
                type="button"
                className="btn-confirm-payment"
                onClick={() => {
                  if (!paymentMethod) {
                    alert('결제 수단을 선택해주세요.')
                    return
                  }
                  setPaymentStep(2)
                }}
              >
                결제 진행하기
              </button>
            ) : (
              <div className="payment-step2">
                {paymentMethod === 'card' && (
                  <div className="card-form">
                    <h3>카드 정보 입력</h3>
                    <div className="form-row">
                      <label>카드번호</label>
                      <input type="text" placeholder="0000-0000-0000-0000" maxLength={19} />
                    </div>
                    <div className="form-row">
                      <label>유효기간</label>
                      <input type="text" placeholder="MM/YY" maxLength={5} />
                    </div>
                    <div className="form-row">
                      <label>CVC</label>
                      <input type="password" placeholder="뒷면 3자리" maxLength={4} />
                    </div>
                  </div>
                )}
                {(paymentMethod === 'transfer' || paymentMethod === 'deposit') && (
                  <div className="bank-info">
                    <h3>입금하실 계좌</h3>
                    <p><strong>하나은행</strong> 589-910014-42404</p>
                    <p><strong>예금주</strong> (주)Mrs. Park Kambanew</p>
                    <p><strong>입금금액</strong> {totalPrice.toLocaleString()}원</p>
                    <p className="bank-note">입금 후 아래 버튼을 눌러주세요.</p>
                  </div>
                )}
                <div className="step2-buttons">
                  <button type="button" className="back-step-btn" onClick={() => setPaymentStep(1)}>
                    ← 이전 단계
                  </button>
                  <button
                    type="button"
                    className="back-to-cart-btn"
                    onClick={() => {
                      setShowPayment(false)
                      setPaymentStep(1)
                      setPaymentMethod('')
                    }}
                  >
                    나가기
                  </button>
                  <button
                    type="button"
                    className="btn-confirm-payment"
                    onClick={() => {
                      if (!user) {
                        alert('결제를 완료하려면 회원가입이 필요합니다.')
                        return
                      }
                      const status = paymentMethod === 'card' ? '결제완료' : '입금대기'
                      const result = saveOrder(groupedCart, totalPrice, paymentMethod, status)
                      if (!result.ok) {
                        alert(result.message)
                        return
                      }
                      if (paymentMethod === 'card') {
                        alert('결제가 완료되었습니다.')
                      } else {
                        alert('입금 요청이 접수되었습니다.\n입금 확인 후 주문이 처리됩니다.')
                      }
                      handlePaymentComplete()
                    }}
                  >
                    {paymentMethod === 'card' ? '결제 완료' : '입금 확인 요청'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-page-header">
              <Link to="/" className="cart-back-btn">← 홈</Link>
              <h1 className="cart-page-title">장바구니</h1>
            </div>

            {groupedCart.length === 0 ? (
              <div className="cart-empty">
                <p>장바구니가 비어 있습니다.</p>
                <Link to="/" className="btn-continue-shopping">쇼핑 계속하기</Link>
              </div>
            ) : (
              <>
                <ul className="cart-list">
                  {groupedCart.map((g, idx) => (
                    <li key={idx} className="cart-item">
                      <div className="cart-item-info">
                        <strong>{g.name}</strong>
                        <span>{g.size} / {g.unit}</span>
                        <span className="cart-item-unit-price">단가 {g.price.toLocaleString()}원</span>
                      </div>
                      <div className="cart-item-actions">
                        <button type="button" onClick={() => changeCartQty(idx, -1)}>-</button>
                        <span className="cart-item-count">{g.count}개</span>
                        <button type="button" onClick={() => changeCartQty(idx, 1)}>+</button>
                        <span className="cart-item-price">{(g.price * g.count).toLocaleString()}원</span>
                        <button type="button" className="cart-remove" onClick={() => removeFromCart(idx)}>×</button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="cart-footer">
                  <strong className="cart-total">
                    총 합계: {totalPrice.toLocaleString()}원
                  </strong>
                  <div>
                    <button type="button" onClick={() => downloadCartAsExcel(groupedCart, totalPrice)}>
                      엑셀 다운로드
                    </button>
                    <button type="button" onClick={clearCart}>
                      장바구니 비우기
                    </button>
                    <button type="button" className="btn-purchase" onClick={handleShowPayment}>
                      구매하기
                    </button>
                    <button type="button" className="btn-order-list" onClick={() => setShowOrderList(true)}>
                      구매내역
                    </button>
                  </div>
                </div>
                <Link to="/" className="btn-continue-shopping">← 쇼핑 계속하기</Link>
              </>
            )}
          </div>
        )}
      </main>

      <ShopFooter />
    </div>
  )
}

export default CartPage
