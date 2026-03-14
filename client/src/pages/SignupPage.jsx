import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

function SignupPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeAll, setAgreeAll] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleAgreeAll = (e) => {
    const checked = e.target.checked
    setAgreeAll(checked)
    setAgreeTerms(checked)
    setAgreePrivacy(checked)
    setAgreeMarketing(checked)
  }


  const validatePassword = (password) => {
    if (password.length < 8) return false
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    return hasLetter && hasNumber && hasSpecial
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!agreeTerms || !agreePrivacy) {
      setError('필수 약관에 동의해 주세요.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (!validatePassword(formData.password)) {
      setError('비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다.')
      return
    }

    setIsLoading(true)
    try {
      await userApi.create({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        user_type: 'customer',
      })
      const { token, user } = await userApi.login({
        email: formData.email,
        password: formData.password,
      })
      login(token, user)
      setSuccess(true)
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (err) {
      const message = err?.message || (typeof err === 'string' ? err : '회원가입에 실패했습니다.')
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-back-row">
          <button type="button" onClick={() => navigate(-1)} className="back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            뒤로가기
          </button>
          <Link to="/" className="back-btn home-btn">홈</Link>
        </div>
        <h1 className="signup-title">회원가입</h1>
        <p className="signup-subtitle">새로운 계정을 만들어 쇼핑을 시작하세요</p>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="field-group">
            <label htmlFor="name" className="field-label">이름</label>
            <div className="input-group">
              <input
                type="text"
                id="name"
                name="name"
                placeholder="이름을 입력하세요"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="email" className="field-label">이메일</label>
            <div className="input-group">
              <input
                type="email"
                id="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="password" className="field-label">비밀번호</label>
            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                placeholder="비밀번호를 입력하세요"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            <p className="password-hint">8자 이상, 영문, 숫자, 특수문자 포함</p>
          </div>

          <div className="field-group">
            <label htmlFor="confirmPassword" className="field-label">비밀번호 확인</label>
            <div className="input-group">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="비밀번호를 다시 입력하세요"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showConfirmPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="consent-section">
            <label className="consent-item consent-all">
              <input
                type="checkbox"
                checked={agreeAll}
                onChange={handleAgreeAll}
              />
              <span>전체 동의</span>
            </label>
            <label className="consent-item">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  const checked = e.target.checked
                  setAgreeTerms(checked)
                  setAgreeAll(checked && agreePrivacy)
                }}
              />
              <span>이용약관 동의 (필수)</span>
              <button type="button" className="view-link" onClick={(e) => e.preventDefault()}>보기</button>
            </label>
            <label className="consent-item">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => {
                  const checked = e.target.checked
                  setAgreePrivacy(checked)
                  setAgreeAll(agreeTerms && checked)
                }}
              />
              <span>개인정보처리방침 동의 (필수)</span>
              <button type="button" className="view-link" onClick={(e) => e.preventDefault()}>보기</button>
            </label>
            <label className="consent-item">
              <input
                type="checkbox"
                checked={agreeMarketing}
                onChange={(e) => setAgreeMarketing(e.target.checked)}
              />
              <span>마케팅 정보 수신 동의 (선택)</span>
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && (
            <div className="success-message">
              <span className="success-icon">✓</span>
              <p>회원가입이 완료되었습니다!</p>
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading || success}
          >
            {isLoading ? '처리 중...' : success ? '완료' : '회원가입'}
          </button>
        </form>
      </div>

      <style>{`
        .signup-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #faf8f5 0%, #f5ebe6 100%);
          padding: 2rem;
        }
        @media (max-width: 480px) {
          .signup-page { padding: 1rem; }
          .signup-container { padding: 1.5rem; }
          .submit-btn { min-height: 48px; }
        }
        .signup-container {
          max-width: 480px;
          margin: 0 auto;
          background: #fff;
          border-radius: 16px;
          padding: 2.5rem;
          box-shadow: 0 4px 24px rgba(92, 74, 74, 0.08);
          border: 1px solid var(--color-border);
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          margin-bottom: 1.5rem;
          color: var(--color-soft-brown);
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn:hover {
          border-color: var(--color-rose-gold);
          color: var(--color-rose-gold);
          background: var(--color-blush);
        }
        .signup-title {
          font-family: var(--font-heading);
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--color-charcoal);
        }
        .signup-subtitle {
          color: var(--color-muted);
          font-size: 0.95rem;
          margin-bottom: 2rem;
        }
        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .field-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-soft-brown);
        }
        .input-group {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--color-blush);
          border: 1px solid var(--color-border);
          border-radius: 10px;
          padding: 0 1rem;
          transition: all 0.2s;
        }
        .input-group:focus-within {
          border-color: var(--color-rose-gold);
          background: #fff;
        }
        .input-group input {
          flex: 1;
          border: none;
          background: none;
          padding: 0.875rem 0;
          font-size: 0.95rem;
          outline: none;
        }
        .input-group input::placeholder {
          color: var(--color-muted);
        }
        .toggle-password {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          font-size: 1rem;
          opacity: 0.6;
        }
        .password-hint {
          font-size: 0.8rem;
          color: #888;
          margin: 0.25rem 0 0 0;
        }
        .consent-section {
          margin-top: 0.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }
        .consent-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          cursor: pointer;
          font-size: 0.9rem;
          color: var(--color-soft-brown);
        }
        .consent-all {
          font-weight: 600;
          padding-bottom: 0.75rem;
        }
        .consent-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--color-rose-gold);
          cursor: pointer;
        }
        .view-link {
          margin-left: auto;
          background: none;
          border: none;
          color: var(--color-muted);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0;
        }
        .view-link:hover {
          text-decoration: underline;
        }
        .form-error {
          color: #c75c5c;
          font-size: 0.9rem;
        }
        .success-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: var(--color-blush);
          border: 1px solid var(--color-rose);
          border-radius: 12px;
          color: var(--color-rose-gold);
          font-size: 0.95rem;
        }
        .success-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: var(--color-rose-gold);
          color: #fff;
          border-radius: 50%;
          font-weight: bold;
          font-size: 0.9rem;
        }
        .success-message p {
          margin: 0;
          font-weight: 500;
        }
        .submit-btn {
          margin-top: 1rem;
          padding: 0.875rem;
          background: linear-gradient(135deg, var(--color-rose-gold) 0%, var(--color-dusty-rose) 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

export default SignupPage
