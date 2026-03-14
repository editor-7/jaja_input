export const ORDER_STORAGE_KEY = 'shop_order_list'

export const getCartStorageKey = (userId) => `shop_cart_${userId || 'guest'}`

/** 로그인 사용자별 품목 수량 입력값 저장 (다음 로그인 시 이어서 작성) */
export const getListQtysStorageKey = (userId) => `shop_listQtys_${userId || 'guest'}`
