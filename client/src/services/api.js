// 로컬: /api → Vite proxy → localhost:5000
// 프로덕션(Vercel): VITE_API_URL 비우면 같은 도메인 /api → 루트·client 의 vercel.json routes 프록시
// 프로덕션(직접 호출): VITE_API_URL — Cloudtype은 호스트만이 아니라
//   .../조직/프로젝트/스테이지/서비스 까지 포함해야 함. 예:
//   https://port-0-xxx.sel3.cloudtype.app/gas0044/jaja_input/main/jaja-input
// (끝에 /api 를 넣지 않음. 아래에서 /api 를 붙임. 잘못 넣었으면 제거)
function normalizeViteApiBaseUrl(raw) {
  if (!raw) return ''
  let s = String(raw).trim().replace(/\/+$/, '')
  if (s.endsWith('/api')) {
    s = s.slice(0, -4).replace(/\/+$/, '')
  }
  return s
}

const API_BASE_RAW = import.meta.env.VITE_API_URL
  ? normalizeViteApiBaseUrl(import.meta.env.VITE_API_URL)
  : ''
const API_BASE = API_BASE_RAW ? `${API_BASE_RAW}/api` : '/api'

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`

  const includeAuth = options.auth !== false
  const config = {
    cache: 'no-store',
    headers: {
      ...(includeAuth ? getAuthHeaders() : {}),
      ...options.headers,
    },
    ...options,
  }

  // JSON body가 있는 경우에만 Content-Type을 설정
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
    config.body = JSON.stringify(options.body)
  }
  let res, text
  try {
    res = await fetch(url, config)
    text = await res.text()
  } catch (err) {
    const msg = err?.message || String(err)
    throw { status: 0, message: msg.includes('fetch') || msg.includes('Network') ? '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해 주세요.' : msg }
  }
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  // Cloudtype 라우팅 환경에 따라 /api prefix가 없는 경우가 있어 products GET에 한해 1회 폴백
  if (
    res.status === 404 &&
    options.method === 'GET' &&
    options.auth === false &&
    API_BASE_RAW &&
    (endpoint === '/products' || endpoint.startsWith('/products/'))
  ) {
    try {
      const fallbackRes = await fetch(`${API_BASE_RAW}${endpoint}`, config)
      const fallbackText = await fallbackRes.text()
      if (fallbackRes.ok) {
        return fallbackText ? JSON.parse(fallbackText) : {}
      }
    } catch (e) {}
  }

  if (!res.ok) {
    const serverMessage = data.message || data.error || data.msg || (typeof text === 'string' && text.length < 200 ? text : null)
    const defaultMessage =
      res.status === 401 ? '비밀번호가 올바르지 않습니다.' :
      res.status === 400 ? '입력 정보를 확인해 주세요.' :
      res.status === 500 ? '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' :
      `요청에 실패했습니다. (${res.status})`
    throw { status: res.status, message: serverMessage || defaultMessage }
  }
  return data
}

export const userApi = {
  create: (userData) => request('/users', { method: 'POST', body: userData }),
  login: (credentials) => request('/users/login', { method: 'POST', body: credentials }),
  getAll: () => request('/users', { method: 'GET' }),
  getById: (id) => request(`/users/${id}`, { method: 'GET' }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/users/${id}`, { method: 'DELETE' }),
}

export const productApi = {
  // products 조회(GET)는 public 라우트이므로 preflight를 줄이기 위해 Authorization/Content-Type을 보내지 않음
  getAll: () => request('/products', { method: 'GET', auth: false }),
  getById: (id) => request(`/products/${id}`, { method: 'GET', auth: false }),
  create: (data) => request('/products', { method: 'POST', body: data }),
  update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  delete: (id) => request(`/products/${id}`, { method: 'DELETE' }),
}
