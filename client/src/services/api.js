const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api'

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  }
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body)
  }
  const res = await fetch(url, config)
  const text = await res.text()
  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  if (!res.ok) {
    const serverMessage = data.message || data.error || data.msg
    const defaultMessage =
      res.status === 401 ? '비밀번호가 올바르지 않습니다.' :
      res.status === 400 ? '입력 정보를 확인해 주세요.' :
      '요청에 실패했습니다.'
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
