import { useState, useRef, useEffect, useMemo } from 'react'
import {
  getCategory,
  getDisplayItemName,
  getMainCategory,
  getRemarkDisplay,
  getShopCategoryTabLabel,
  getSpecFromProduct,
  PE_PIPE_TABS,
  EXPOSED_PIPE_TABS,
} from '@/data/products'
import { downloadCartAsExcel } from '@/utils/exportCartToExcel'
import { downloadOrderListAsExcel } from '@/utils/exportOrderListToExcel'
import { getListQtysStorageKey } from '@/utils/constants'
import './ShopBody.css'

function ShopBody({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  pePipeFilter = '전체',
  onPePipeFilterChange,
  exposedPipeFilter = '전체',
  onExposedPipeFilterChange,
  onGoCart,
  categories = [],
  showOrderList,
  onShowOrderList,
  onCloseOrderList,
  orderList,
  onDeleteOrder,
  onUpdateOrder,
  onAddOrder,
  onAddCartAsOrder,
  deliveryInfo,
  onDeliveryInfoChange,
  showPayment,
  paymentStep,
  paymentMethod,
  onPaymentStepChange,
  onPaymentMethodChange,
  onPaymentClose,
  onPaymentComplete,
  products = [],
  filteredProducts = [],
  allFilteredCount = (filteredProducts && filteredProducts.length) ?? 0,
  productPage = 1,
  totalPages = 1,
  onProductPageChange,
  productsLoading,
  productsLoadError,
  onRetryProducts,
  wishlist,
  toggleWishlist,
  addToCart,
  setProductQty,
  cartAddMode = false,
  groupedCart = [],
  changeCartQty,
  removeFromCart,
  clearCart,
  totalPrice,
  saveOrder,
  addedMsg,
  onShowPayment,
  user,
}) {
  const [listQtys, setListQtys] = useState({})
  const [lastSpaceAddedId, setLastSpaceAddedId] = useState(null)
  const qtyInputRefs = useRef([])
  const [gridCols, setGridCols] = useState(5)
  const ROWS_PER_PAGE = 10
  const [editingOrderId, setEditingOrderId] = useState(null)
  const [editOrderForm, setEditOrderForm] = useState(null)
  const [orderEditProductSearch, setOrderEditProductSearch] = useState('')
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false)

  const userId = user?._id ?? null

  useEffect(() => {
    if (!userId) return
    try {
      const key = getListQtysStorageKey(userId)
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') setListQtys(parsed)
      }
    } catch (e) {}
  }, [userId])

  useEffect(() => {
    if (!userId || Object.keys(listQtys).length === 0) return
    try {
      localStorage.setItem(getListQtysStorageKey(userId), JSON.stringify(listQtys))
    } catch (e) {}
  }, [userId, listQtys])

  useEffect(() => {
    const handler = () => {
      setListQtys({})
      if (userId) try { localStorage.setItem(getListQtysStorageKey(userId), '{}') } catch (e) {}
    }
    window.addEventListener('clearListQtys', handler)
    return () => window.removeEventListener('clearListQtys', handler)
  }, [userId])

  useEffect(() => {
    const updateCols = () => {
      const w = window.innerWidth
      if (w >= 1920) setGridCols(12)
      else if (w >= 1600) setGridCols(10)
      else if (w >= 1281) setGridCols(8)
      else if (w >= 901) setGridCols(7)
      else if (w >= 521) setGridCols(5)
      else setGridCols(1)
    }
    updateCols()
    window.addEventListener('resize', updateCols)
    return () => window.removeEventListener('resize', updateCols)
  }, [])
  const getListQty = (id) => listQtys[id] ?? 0
  const setListQty = (id, n) => setListQtys((prev) => ({ ...prev, [id]: Math.max(0, Math.min(99, n)) }))

  /* 품명(표시 이름)이 바뀔 때마다 새 그룹 → 검정/파랑/초록 순서 */
  const groupColorIndices = useMemo(() => {
    const list = Array.isArray(filteredProducts) ? filteredProducts : []
    const arr = []
    let g = 0
    list.forEach((p, i) => {
      const prev = i > 0 ? list[i - 1] : null
      const namePrev = prev ? getDisplayItemName(prev) : ''
      const nameCur = getDisplayItemName(p)
      if (!prev || namePrev !== nameCur) g++
      arr[i] = (g - 1) % 5
    })
    return arr
  }, [filteredProducts])

  const syncCartForProduct = (p, newQty) => {
    // 일반 모드: 정확 수량 동기화 / 공통·인건비만 모드: 기존 누적 담기 유지
    if (cartAddMode) {
      if (newQty >= 1) addToCart(p, newQty)
      else if (typeof setProductQty === 'function') setProductQty(p, 0)
      return
    }
    if (typeof setProductQty === 'function') {
      setProductQty(p, newQty)
      return
    }
    if (newQty >= 1) addToCart(p, newQty)
  }

  useEffect(() => {
    if (!isMobileCartOpen) return
    const onEsc = (e) => {
      if (e.key === 'Escape') setIsMobileCartOpen(false)
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [isMobileCartOpen])

  return (
    <>
      {addedMsg && <div className="added-msg">{addedMsg}</div>}
      <div className="shop-layout">
        <main className="shop-main">
        {showOrderList ? (
          <div className="order-list-view">
            <div className="order-list-header">
              <h2>내 구매 리스트</h2>
              <div className="order-list-header-actions">
                {user && onAddCartAsOrder && groupedCart?.length > 0 && (
                  <button
                    type="button"
                    className="back-to-list-btn order-list-cart-add-btn"
                    onClick={() => onAddCartAsOrder()}
                    title="현재 장바구니를 구매내역에 추가"
                  >
                    장바구니 → 구매내역 추가
                  </button>
                )}
                {user && onAddOrder && (
                  <button
                    type="button"
                    className="back-to-list-btn order-list-add-btn"
                    onClick={() => {
                      const newId = onAddOrder()
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
                  onClick={() => downloadOrderListAsExcel(orderList)}
                  disabled={orderList.length === 0}
                  title="구매 내역 엑셀 다운로드"
                >
                  엑셀 다운로드
                </button>
                <button type="button" className="back-to-list-btn" onClick={onCloseOrderList}>
                  ← 자재 목록으로
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
                      {(products || [])
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
                        onUpdateOrder(editingOrderId, {
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
                        if (isEmpty && onDeleteOrder) onDeleteOrder(editingOrderId)
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
            {orderList.length === 0 && !editingOrderId ? (
              <p className="empty-orders">
                {user ? '구매 내역이 없습니다.' : '로그인 후 구매 내역을 확인할 수 있습니다.'}
              </p>
            ) : editingOrderId ? null : (
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
                      {onUpdateOrder && onDeleteOrder && (
                        <div className="order-item-actions">
                          <button type="button" className="order-edit-btn" onClick={() => { setEditingOrderId(order.id); setEditOrderForm({ ...order, items: (order.items || []).map((i) => ({ ...i })), delivery: { ...(order.delivery || {}) } }) }}>수정</button>
                          <button type="button" className="order-delete-btn" onClick={() => { if (window.confirm('이 주문을 삭제하시겠습니까?')) onDeleteOrder(order.id) }}>삭제</button>
                        </div>
                      )}
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
              <button type="button" className="back-to-cart-btn" onClick={onPaymentClose}>
                ← 나가기
              </button>
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
                  onChange={(e) => onDeliveryInfoChange((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <label>연락처</label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={deliveryInfo.phone}
                  onChange={(e) => onDeliveryInfoChange((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="form-row">
                <label>주소</label>
                <input
                  type="text"
                  placeholder="주소를 입력하세요"
                  value={deliveryInfo.address}
                  onChange={(e) => onDeliveryInfoChange((p) => ({ ...p, address: e.target.value }))}
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
                  onChange={() => onPaymentMethodChange('card')}
                />
                신용/체크카드
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={() => onPaymentMethodChange('transfer')}
                />
                계좌이체
              </label>
              <label className="payment-option">
                <input
                  type="radio"
                  name="payment"
                  value="deposit"
                  checked={paymentMethod === 'deposit'}
                  onChange={() => onPaymentMethodChange('deposit')}
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
                  onPaymentStepChange(2)
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
                    <p><strong>입금 은행</strong> 000-000000-00000</p>
                    <p><strong>예금주</strong> (주)도시가스자재몰</p>
                    <p><strong>입금금액</strong> {totalPrice.toLocaleString()}원</p>
                    <p className="bank-note">입금 후 아래 버튼을 눌러주세요.</p>
                  </div>
                )}
                <div className="step2-buttons">
                  <button type="button" className="back-step-btn" onClick={() => onPaymentStepChange(1)}>
                    ← 이전 단계
                  </button>
                  <button type="button" className="back-to-cart-btn" onClick={onPaymentClose}>
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
                      onPaymentComplete()
                    }}
                  >
                    {paymentMethod === 'card' ? '결제 완료' : '입금 확인 요청'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="shop-toolbar">
              <div className="filter-col">
                <div className="filter-row">
                  {Array.isArray(categories) && categories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={categoryFilter === c ? 'active' : ''}
                      onClick={() => onCategoryChange(c)}
                    >
                      {getShopCategoryTabLabel(c)}
                    </button>
                  ))}
                </div>
                {categoryFilter === 'PE' && typeof onPePipeFilterChange === 'function' && (
                  <div className="filter-row filter-row-sub" role="group" aria-label="PE 세부">
                    {PE_PIPE_TABS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={pePipeFilter === t ? 'active' : ''}
                        onClick={() => onPePipeFilterChange(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
                {categoryFilter === '노출관' && typeof onExposedPipeFilterChange === 'function' && (
                  <div className="filter-row filter-row-sub" role="group" aria-label="노출관 세부">
                    {EXPOSED_PIPE_TABS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={exposedPipeFilter === t ? 'active' : ''}
                        onClick={() => onExposedPipeFilterChange(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="toolbar-right">
                <input
                  type="text"
                  placeholder="검색"
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="toolbar-search"
                />
                <button
                  type="button"
                  className="toolbar-search-btn"
                  aria-label="검색"
                >
                  🔍
                </button>
                <button type="button" className="toolbar-order-btn" onClick={onShowOrderList}>
                  구매내역
                </button>
                <button
                  type="button"
                  className="toolbar-cart-btn"
                  onClick={() => {
                    if (window.innerWidth <= 900) {
                      setIsMobileCartOpen(true)
                      return
                    }
                    if (onGoCart) onGoCart()
                    else window.location.assign('/cart')
                  }}
                >
                  장바구니 보기
                </button>
              </div>
            </div>
            <section className="section-banner">
              <div className="section-banner-header">
                <h2>자재 목록 {!productsLoading && !productsLoadError && allFilteredCount > 0 && `(${allFilteredCount}종)`}</h2>
                {onRetryProducts && (
                  <button type="button" className="refresh-products-btn" onClick={onRetryProducts} title="상품 목록 새로고침">
                    새로고침
                  </button>
                )}
              </div>
              <div className="product-list-wrap">
                <div className="product-list-header-row">
                  <span className="col-name">품목</span>
                  <span className="col-spec">규격</span>
                  <span className="col-qty">수량</span>
                  <span className="col-unit">단위</span>
                  <span className="col-price">단가</span>
                  <span className="col-remark">비고</span>
                  <span className="col-space-arrow" aria-label="스페이스 담기 표시" />
                </div>
                {(Array.isArray(filteredProducts) ? filteredProducts : []).map((p, rowIndex) => {
                  const colorIndex = groupColorIndices[rowIndex] ?? 0
                  return (
                  <div key={p._id || p.name} className={`product-list-row group-color-${colorIndex}`}>
                    <span className="col-name">
                      <span className="list-name">{getDisplayItemName(p)}</span>
                    </span>
                    <span className="col-spec">{getSpecFromProduct(p) || '—'}</span>
                    <span className="col-qty">
                      <span className="list-qty-stepper">
                        <button
                          type="button"
                          className="list-qty-btn"
                          onClick={() => {
                            const next = Math.max(0, getListQty(p._id || p.name) - 1)
                            setListQty(p._id || p.name, next)
                            syncCartForProduct(p, next)
                          }}
                          aria-label="수량 감소"
                        >
                          −
                        </button>
                        <input
                          ref={(el) => { qtyInputRefs.current[rowIndex] = el }}
                          type="number"
                          min={0}
                          max={99}
                          className="list-qty-input"
                          value={getListQty(p._id || p.name)}
                          onFocus={(e) => e.target.select()}
                          onBlur={(e) => {
                            const v = Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0
                            const clamped = Math.max(0, Math.min(99, v))
                            setListQty(p._id || p.name, clamped)
                            syncCartForProduct(p, clamped)
                          }}
                          onChange={(e) => {
                            const v = Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0
                            const clamped = Math.max(0, Math.min(99, v))
                            setListQty(p._id || p.name, clamped)
                            syncCartForProduct(p, clamped)
                          }}
                          onKeyDown={(e) => {
                            const total = (Array.isArray(filteredProducts) ? filteredProducts : []).length
                            if (e.key === ' ') {
                              e.preventDefault()
                              const qty = getListQty(p._id || p.name)
                              syncCartForProduct(p, qty > 0 ? qty : 1)
                              if (qty <= 0) setListQty(p._id || p.name, 1)
                              setLastSpaceAddedId(p._id || p.name)
                              setTimeout(() => setLastSpaceAddedId(null), 1500)
                            }
                            if (e.key === 'ArrowRight') {
                              e.preventDefault()
                              const next = Math.min(total - 1, rowIndex + 1)
                              qtyInputRefs.current[next]?.focus()
                            }
                            if (e.key === 'ArrowLeft') {
                              e.preventDefault()
                              const next = Math.max(0, rowIndex - 1)
                              qtyInputRefs.current[next]?.focus()
                            }
                            if (e.key === 'ArrowDown') {
                              e.preventDefault()
                              const next = Math.min(total - 1, rowIndex + gridCols)
                              qtyInputRefs.current[next]?.focus()
                            }
                            if (e.key === 'ArrowUp') {
                              e.preventDefault()
                              const next = Math.max(0, rowIndex - gridCols)
                              qtyInputRefs.current[next]?.focus()
                            }
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              if (rowIndex + 1 < total) qtyInputRefs.current[rowIndex + 1]?.focus()
                            }
                            if (e.key === 'PageDown') {
                              e.preventDefault()
                              const next = Math.min(total - 1, rowIndex + ROWS_PER_PAGE)
                              qtyInputRefs.current[next]?.focus()
                            }
                            if (e.key === 'PageUp') {
                              e.preventDefault()
                              const next = Math.max(0, rowIndex - ROWS_PER_PAGE)
                              qtyInputRefs.current[next]?.focus()
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="list-qty-btn"
                          onClick={() => {
                            const next = Math.min(99, getListQty(p._id || p.name) + 1)
                            setListQty(p._id || p.name, next)
                            syncCartForProduct(p, next)
                          }}
                          aria-label="수량 증가"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          className="list-qty-add-btn"
                          onClick={() => {
                            const qty = getListQty(p._id || p.name) || 1
                            setListQty(p._id || p.name, qty)
                            syncCartForProduct(p, qty)
                          }}
                          title="수량만큼 장바구니에 담기"
                        >
                          담기
                        </button>
                      </span>
                      {getListQty(p._id || p.name) > 0 && (
                        <span className="qty-cell-arrow" title="수량 입력됨">→</span>
                      )}
                    </span>
                    <span className="col-unit">{p.unit || p.size || '—'}</span>
                    <span className="col-price">{p.price != null ? p.price.toLocaleString() : ''}원</span>
                    <span className="col-remark">{getRemarkDisplay(p)}</span>
                    <span className="col-space-arrow">
                      {lastSpaceAddedId === (p._id || p.name) && <span className="space-arrow" title="스페이스로 담음">→</span>}
                    </span>
                  </div>
                  ); })}
              </div>
              {allFilteredCount > 0 && totalPages > 1 && onProductPageChange && (
                <nav className="product-pagination" aria-label="상품 페이지">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => onProductPageChange(Math.max(1, productPage - 1))}
                    disabled={productPage <= 1}
                    aria-label="이전 페이지"
                  >
                    ← 이전
                  </button>
                  <span className="pagination-info">
                    {productPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => onProductPageChange(Math.min(totalPages, productPage + 1))}
                    disabled={productPage >= totalPages}
                    aria-label="다음 페이지"
                  >
                    다음 →
                  </button>
                </nav>
              )}
            </section>

            {allFilteredCount === 0 && (
              <div className="empty-result">
                {productsLoading ? (
                  <p>상품 로딩 중...</p>
                ) : productsLoadError ? (
                  <>
                    <p>상품을 불러올 수 없습니다. 서버가 실행 중인지 확인해 주세요.</p>
                    {onRetryProducts && (
                      <button type="button" className="retry-btn" onClick={onRetryProducts}>
                        다시 시도
                      </button>
                    )}
                  </>
                ) : (
                  '등록된 상품이 없습니다.'
                )}
              </div>
            )}

            <section id="cart-section" className="cart-section">
              <h2>장바구니</h2>
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
                <strong className="cart-total">{totalPrice > 0 ? `총 합계: ${totalPrice.toLocaleString()}원` : ''}</strong>
                <div>
                  <button type="button" onClick={() => downloadCartAsExcel(groupedCart, totalPrice)} disabled={groupedCart.length === 0}>
                    엑셀 다운로드
                  </button>
                  <button type="button" onClick={clearCart} disabled={groupedCart.length === 0}>
                    장바구니 비우기
                  </button>
                  {totalPrice > 0 && (
                    <button
                      type="button"
                      className="btn-purchase"
                      onClick={() => onShowPayment()}
                    >
                      구매하기
                    </button>
                  )}
                </div>
              </div>
            </section>

            <div
              className={`mobile-cart-overlay ${isMobileCartOpen ? 'open' : ''}`}
              onClick={() => setIsMobileCartOpen(false)}
              aria-hidden={!isMobileCartOpen}
            />
            <aside className={`mobile-cart-panel ${isMobileCartOpen ? 'open' : ''}`} aria-label="모바일 장바구니">
              <div className="mobile-cart-panel-header">
                <h3>장바구니</h3>
                <button type="button" className="mobile-cart-close-btn" onClick={() => setIsMobileCartOpen(false)}>
                  닫기
                </button>
              </div>
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
                <strong className="cart-total">{totalPrice > 0 ? `총 합계: ${totalPrice.toLocaleString()}원` : ''}</strong>
                <div>
                  <button type="button" onClick={() => downloadCartAsExcel(groupedCart, totalPrice)} disabled={groupedCart.length === 0}>
                    엑셀 다운로드
                  </button>
                  <button type="button" onClick={clearCart} disabled={groupedCart.length === 0}>
                    장바구니 비우기
                  </button>
                </div>
              </div>
            </aside>
          </>
        )}
        </main>
      </div>
    </>
  )
}

export default ShopBody
