import { useState } from 'react'
import { getCategory, getDisplayItemName, getRemarkDisplay, getSpecFromProduct } from '@/data/products'
import './ShopBody.css'

function ShopBody({
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
  showOrderList,
  onShowOrderList,
  onCloseOrderList,
  orderList,
  deliveryInfo,
  onDeliveryInfoChange,
  showPayment,
  paymentStep,
  paymentMethod,
  onPaymentStepChange,
  onPaymentMethodChange,
  onPaymentClose,
  onPaymentComplete,
  filteredProducts,
  allFilteredCount = filteredProducts?.length ?? 0,
  productPage = 1,
  totalPages = 1,
  onProductPageChange,
  productsLoading,
  productsLoadError,
  onRetryProducts,
  wishlist,
  toggleWishlist,
  addToCart,
  groupedCart,
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
  const getListQty = (id) => listQtys[id] ?? 1
  const setListQty = (id, n) => setListQtys((prev) => ({ ...prev, [id]: Math.max(1, Math.min(99, n)) }))

  return (
    <>
      {addedMsg && <div className="added-msg">{addedMsg}</div>}
      <div className="shop-layout">
        <main className="shop-main">
        {showOrderList ? (
          <div className="order-list-view">
            <div className="order-list-header">
              <h2>내 구매 리스트</h2>
              <button type="button" className="back-to-list-btn" onClick={onCloseOrderList}>
                ← 자재 목록으로
              </button>
            </div>
            {orderList.length === 0 ? (
              <p className="empty-orders">
                {user ? '구매 내역이 없습니다.' : '로그인 후 구매 내역을 확인할 수 있습니다.'}
              </p>
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
              <div className="filter-row">
                <button
                  type="button"
                  className={categoryFilter === 'all' ? 'active' : ''}
                  onClick={() => onCategoryChange('all')}
                >
                  전체
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={categoryFilter === c ? 'active' : ''}
                    onClick={() => onCategoryChange(c)}
                  >
                    {getRemarkDisplay({ category: c })}
                  </button>
                ))}
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
                  <span className="col-cart" aria-hidden="true" />
                </div>
                {filteredProducts.map((p) => (
                  <div key={p._id || p.name} className="product-list-row">
                    <span className="col-name">
                      <span className="list-name">{getDisplayItemName(p)}</span>
                    </span>
                    <span className="col-spec">{getSpecFromProduct(p) || '—'}</span>
                    <span className="col-qty">
                      <span className="list-qty-stepper">
                        <button
                          type="button"
                          className="list-qty-btn"
                          onClick={() =>
                            setListQty(p._id || p.name, getListQty(p._id || p.name) - 1)
                          }
                          aria-label="수량 감소"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          className="list-qty-input"
                          value={getListQty(p._id || p.name)}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = Number(String(e.target.value).replace(/[^0-9]/g, '')) || 0
                            setListQty(p._id || p.name, v)
                          }}
                        />
                        <button
                          type="button"
                          className="list-qty-btn"
                          onClick={() =>
                            setListQty(p._id || p.name, getListQty(p._id || p.name) + 1)
                          }
                          aria-label="수량 증가"
                        >
                          +
                        </button>
                      </span>
                    </span>
                    <span className="col-unit">{p.unit || p.size || '—'}</span>
                    <span className="col-price">{p.price != null ? p.price.toLocaleString() : ''}원</span>
                    <span className="col-remark">{getRemarkDisplay(p)}</span>
                    <span className="col-cart">
                      <button
                        type="button"
                        className="product-cart-btn list-cart-btn"
                        onClick={() => addToCart(p, getListQty(p._id || p.name))}
                        title="장바구니 담기"
                        aria-label="장바구니 담기"
                      >
                        🛒
                      </button>
                    </span>
                  </div>
                ))}
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
          </>
        )}
        </main>
      </div>
    </>
  )
}

export default ShopBody
