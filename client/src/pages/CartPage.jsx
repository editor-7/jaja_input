import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCart } from '@/contexts/CartContext'
import { getCategory, getDisplayItemName, getSpecFromProduct } from '@/data/products'
import { productApi } from '@/services/api'
import { ORDER_STORAGE_KEY } from '@/utils/constants'
import { isDuplicateOrder, validatePayment } from '@/utils/orderUtils'
import { downloadCartAsExcel } from '@/utils/exportCartToExcel'
import { downloadOrderListAsExcel } from '@/utils/exportOrderListToExcel'
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
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [editOrderForm, setEditOrderForm] = useState(null)
  const [orderEditProducts, setOrderEditProducts] = useState([])
  const [orderEditProductSearch, setOrderEditProductSearch] = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ORDER_STORAGE_KEY)
      if (saved) setOrderList(JSON.parse(saved))
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (showOrderList && editingOrderId != null) {
      productApi.getAll().then((data) => {
        const list = Array.isArray(data) ? data : data?.data || data?.products || []
        setOrderEditProducts(Array.isArray(list) ? list : [])
      }).catch(() => setOrderEditProducts([]))
    }
  }, [showOrderList, editingOrderId])

  const myOrderList = useMemo(() => {
    if (!user?._id) return []
    return orderList.filter((o) => o.userId && String(o.userId) === String(user._id))
  }, [orderList, user?._id])

  const deleteOrder = useCallback((orderId) => {
    setOrderList((prev) => {
      const next = prev.filter((o) => o.id !== orderId)
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const updateOrder = useCallback((orderId, updated) => {
    setOrderList((prev) => {
      const next = prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o))
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const addOrder = useCallback(() => {
    if (!user?._id) return null
    const order = {
      id: Date.now(),
      userId: user._id,
      userName: user.name || '',
      items: [],
      totalPrice: 0,
      paymentMethod: '',
      status: '입금대기',
      createdAt: new Date().toISOString(),
      delivery: { name: '', phone: '', address: '' },
    }
    setOrderList((prev) => {
      const next = [order, ...prev]
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
    return order.id
  }, [user?._id, user?.name])

  /** 현재 장바구니를 구매내역에 추가 */
  const addCartAsOrder = useCallback(() => {
    if (!user?._id || !groupedCart?.length) return
    const order = {
      id: Date.now(),
      userId: user._id,
      userName: user.name || '',
      items: groupedCart.map((g) => ({ name: g.name, count: g.count, price: g.price })),
      totalPrice: totalPrice || 0,
      paymentMethod: '',
      status: '입금대기',
      createdAt: new Date().toISOString(),
      delivery: { ...deliveryInfo },
    }
    setOrderList((prev) => {
      const next = [order, ...prev]
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [user?._id, user?.name, groupedCart, totalPrice, deliveryInfo])

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
    <div className="shop-page cart-page">
      <aside className="shop-sidebar">
        <ShopNavbar
          user={isLoggedIn ? user : null}
          onLogout={logout}
          cartCount={groupedCart.length}
        />
      </aside>
      <div className="shop-main">
      {toastMsg && <div className="cart-toast-msg">{toastMsg}</div>}
      <main className="cart-page-main">
        {showOrderList ? (
          <div className="order-list-view">
            <div className="order-list-header">
              <h2>내 구매 리스트</h2>
              <div className="order-list-actions">
                {user && groupedCart.length > 0 && (
                  <button
                    type="button"
                    className="back-to-list-btn order-list-cart-add-btn"
                    onClick={() => addCartAsOrder()}
                    title="현재 장바구니를 구매내역에 추가"
                  >
                    장바구니 → 구매내역 추가
                  </button>
                )}
                {user && (
                  <button
                    type="button"
                    className="back-to-list-btn order-list-add-btn"
                    onClick={() => {
                      const newId = addOrder()
                      if (newId != null) {
                        setEditingOrderId(newId)
                        setEditOrderForm({
                          id: newId,
                          items: [],
                          totalPrice: 0,
                          status: '입금대기',
                          paymentMethod: '',
                          delivery: { name: '', phone: '', address: '' },
                          createdAt: new Date().toISOString(),
                        })
                      }
                    }}
                  >
                    + 주문 추가
                  </button>
                )}
                <button
                  type="button"
                  className="back-to-list-btn"
                  onClick={() => downloadOrderListAsExcel(myOrderList)}
                  disabled={myOrderList.length === 0}
                  title="구매 내역 엑셀 다운로드"
                >
                  엑셀 다운로드
                </button>
                <Link to="/" className="back-to-list-btn">← 홈</Link>
                <button type="button" className="back-to-list-btn" onClick={() => setShowOrderList(false)}>
                  장바구니로
                </button>
              </div>
            </div>
            {editingOrderId != null && editOrderForm && (() => {
              const recalcTotal = (items) => items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.count) || 0), 0)
              const updateItems = (fn) => setEditOrderForm((f) => {
                const nextItems = fn(f.items || [])
                return { ...f, items: nextItems, totalPrice: recalcTotal(nextItems) }
              })
              return (
                <div className="order-edit-panel">
                  <h3>{editOrderForm.id ? '주문 수정' : '새 주문'}</h3>
                  <div className="order-edit-section">
                    <label>수령인</label>
                    <input
                      type="text"
                      value={editOrderForm.delivery?.name ?? ''}
                      onChange={(e) => setEditOrderForm((f) => ({ ...f, delivery: { ...f.delivery, name: e.target.value } }))}
                      placeholder="이름"
                    />
                  </div>
                  <div className="order-edit-section">
                    <label>연락처</label>
                    <input
                      type="text"
                      value={editOrderForm.delivery?.phone ?? ''}
                      onChange={(e) => setEditOrderForm((f) => ({ ...f, delivery: { ...f.delivery, phone: e.target.value } }))}
                      placeholder="010-0000-0000"
                    />
                  </div>
                  <div className="order-edit-section">
                    <label>주소</label>
                    <input
                      type="text"
                      value={editOrderForm.delivery?.address ?? ''}
                      onChange={(e) => setEditOrderForm((f) => ({ ...f, delivery: { ...f.delivery, address: e.target.value } }))}
                      placeholder="주소"
                    />
                  </div>
                  <div className="order-edit-section">
                    <label>상태</label>
                    <select
                      value={editOrderForm.status ?? ''}
                      onChange={(e) => setEditOrderForm((f) => ({ ...f, status: e.target.value }))}
                    >
                      <option value="입금대기">입금대기</option>
                      <option value="결제완료">결제완료</option>
                      <option value="처리중">처리중</option>
                      <option value="배송중">배송중</option>
                      <option value="배송완료">배송완료</option>
                    </select>
                  </div>
                  <div className="order-edit-section">
                    <label>결제수단</label>
                    <select
                      value={editOrderForm.paymentMethod ?? ''}
                      onChange={(e) => setEditOrderForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                    >
                      <option value="">선택</option>
                      <option value="card">카드결제</option>
                      <option value="transfer">계좌이체</option>
                      <option value="deposit">무통장입금</option>
                    </select>
                  </div>
                  <div className="order-edit-section order-edit-product-picker">
                    <label>상품에서 선택하여 추가</label>
                    <input
                      type="text"
                      className="order-edit-product-search"
                      placeholder="품목명·규격 검색"
                      value={orderEditProductSearch}
                      onChange={(e) => setOrderEditProductSearch(e.target.value)}
                    />
                    <ul className="order-edit-product-list">
                      {orderEditProducts
                        .filter((p) => {
                          const q = (orderEditProductSearch || '').trim().toLowerCase()
                          if (!q) return true
                          const name = (p.name || '').toLowerCase()
                          const spec = (getSpecFromProduct(p) || '').toLowerCase()
                          const sku = (p.sku || '').toLowerCase()
                          return name.includes(q) || spec.includes(q) || sku.includes(q)
                        })
                        .slice(0, 80)
                        .map((p) => {
                          const displayName = getDisplayItemName(p)
                          const spec = getSpecFromProduct(p) || ''
                          const itemName = spec ? `${displayName} ${spec}` : displayName
                          const price = p.price != null ? p.price : 0
                          return (
                            <li key={p._id || p.sku || itemName} className="order-edit-product-item">
                              <span className="order-edit-product-name">{itemName}</span>
                              <span className="order-edit-product-price">{price.toLocaleString()}원</span>
                              <button
                                type="button"
                                className="order-edit-product-add-btn"
                                onClick={() => updateItems((list) => [...list, { name: itemName, count: 1, price }])}
                              >
                                추가
                              </button>
                            </li>
                          )
                        })}
                    </ul>
                  </div>
                  <div className="order-edit-section order-edit-items">
                    <label>품목 (수량 변경·삭제)</label>
                    {(editOrderForm.items || []).map((item, i) => (
                      <div key={i} className="order-edit-item-row">
                        <input
                          type="text"
                          value={item.name ?? ''}
                          onChange={(e) => updateItems((list) => list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                          placeholder="품목명"
                        />
                        <input
                          type="number"
                          min={0}
                          value={item.count ?? 0}
                          onChange={(e) => updateItems((list) => list.map((x, j) => j === i ? { ...x, count: Number(e.target.value) || 0 } : x))}
                          placeholder="수량"
                        />
                        <input
                          type="number"
                          min={0}
                          value={item.price ?? 0}
                          onChange={(e) => updateItems((list) => list.map((x, j) => j === i ? { ...x, price: Number(e.target.value) || 0 } : x))}
                          placeholder="단가"
                        />
                        <button type="button" className="order-edit-item-remove" onClick={() => updateItems((list) => list.filter((_, j) => j !== i))}>삭제</button>
                      </div>
                    ))}
                    <button type="button" className="order-edit-add-item" onClick={() => updateItems((list) => [...list, { name: '', count: 0, price: 0 }])}>
                      + 직접 입력 (품목명·수량·단가)
                    </button>
                  </div>
                  <div className="order-edit-total">
                    총액: {(editOrderForm.totalPrice ?? 0).toLocaleString()}원
                  </div>
                  <div className="order-edit-actions">
                    <button
                      type="button"
                      className="order-edit-save-btn"
                      onClick={() => {
                        updateOrder(editingOrderId, {
                          items: editOrderForm.items,
                          delivery: editOrderForm.delivery,
                          status: editOrderForm.status,
                          paymentMethod: editOrderForm.paymentMethod,
                          totalPrice: editOrderForm.totalPrice,
                        })
                        setEditingOrderId(null)
                        setEditOrderForm(null)
                      }}
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      className="order-edit-cancel-btn"
                      onClick={() => {
                        const isEmpty = !editOrderForm.items?.length && !(editOrderForm.totalPrice > 0)
                        if (isEmpty) deleteOrder(editingOrderId)
                        setEditingOrderId(null)
                        setEditOrderForm(null)
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              )
            })()}
            {myOrderList.length === 0 && !editingOrderId ? (
              <p className="empty-orders">구매 내역이 없습니다.</p>
            ) : editingOrderId ? null : (
              <ul className="order-list">
                {myOrderList.map((order) => (
                  <li key={order.id} className="order-item">
                    <div className="order-meta">
                      <span className="order-date">
                        {new Date(order.createdAt).toLocaleString('ko-KR')}
                      </span>
                      <span className={`order-status status-${order.status === '결제완료' ? 'done' : 'wait'}`}>
                        {order.status}
                      </span>
                      <div className="order-item-actions">
                        <button type="button" className="order-edit-btn" onClick={() => { setEditingOrderId(order.id); setEditOrderForm({ ...order, items: (order.items || []).map((i) => ({ ...i })), delivery: { ...(order.delivery || {}) } }) }}>수정</button>
                        <button type="button" className="order-delete-btn" onClick={() => { if (window.confirm('이 주문을 삭제하시겠습니까?')) deleteOrder(order.id) }}>삭제</button>
                      </div>
                    </div>
                    <ul className="order-items">
                      {(order.items || []).map((g, i) => (
                        <li key={i}>
                          {g.name} × {g.count}개 — {(g.price * g.count).toLocaleString()}원
                        </li>
                      ))}
                    </ul>
                    <div className="order-total">
                      총 {order.totalPrice.toLocaleString()}원 ({order.paymentMethod === 'card' ? '카드결제' : order.paymentMethod === 'transfer' ? '계좌이체' : order.paymentMethod === 'deposit' ? '무통장입금' : '-'})
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
    </div>
  )
}

export default CartPage
