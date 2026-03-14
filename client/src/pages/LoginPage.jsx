import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { userApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해 주세요.')
      return
    }

    setIsLoading(true)
    try {
      const { token, user } = await userApi.login(formData)
      login(token, user)
      setSuccess(true)
      setTimeout(() => navigate('/'), 1500)
    } catch (err) {
      const message = err?.message || (typeof err === 'string' ? err : '로그인에 실패했습니다.')
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = (provider) => {
    alert(`${provider} 로그인은 준비 중입니다.`)
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-back-row">
          <button type="button" onClick={() => navigate(-1)} className="back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            뒤로가기
          </button>
          <Link to="/" className="back-btn home-btn">홈</Link>
        </div>
        <h1 className="login-title">로그인</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field-group">
            <label htmlFor="email" className="field-label">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              className="input-field"
              placeholder="example@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field-group">
            <div className="field-label-row">
              <label htmlFor="password" className="field-label">비밀번호</label>
              <Link to="/forgot-password" className="forgot-link">비밀번호 찾기</Link>
            </div>
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                className="input-field"
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
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">로그인 성공! 메인으로 이동합니다.</p>}

          <button type="submit" className="login-btn" disabled={isLoading || success}>
            {isLoading ? '처리 중...' : success ? '성공!' : '로그인'}
          </button>
        </form>

        <p className="or-separator">또는</p>

        <div className="social-buttons">
          <button type="button" className="social-btn" onClick={() => handleSocialLogin('Google')}>
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 로그인
          </button>
          <button type="button" className="social-btn" onClick={() => handleSocialLogin('Apple')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple로 로그인
          </button>
        </div>

        <p className="signup-prompt">
          계정이 없으신가요? <Link to="/signup" className="signup-link">회원가입</Link>
        </p>

        <p className="legal-text">
          계정 생성 시{' '}
          <a href="#" className="legal-link" onClick={(e) => e.preventDefault()}>이용약관</a>
          {' '}및{' '}
          <a href="#" className="legal-link" onClick={(e) => e.preventDefault()}>개인정보처리방침</a>
          에 동의하게 됩니다.
        </p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #faf8f5 0%, #f5ebe6 100%);
          padding: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 480px) {
          .login-page { padding: 1rem; }
        }
        .login-container {
          max-width: 400px;
          width: 100%;
          background: #fff;
          padding: 2.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 24px rgba(92, 74, 74, 0.08);
          border: 1px solid var(--color-border);
        }
        @media (max-width: 480px) {
          .login-container { padding: 1.5rem; }
          .login-btn { min-height: 48px; }
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
        .login-title {
          font-family: var(--font-heading);
          font-size: 1.75rem;
          font-weight: 600;
          color: var(--color-charcoal);
          margin-bottom: 2rem;
          text-align: center;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .field-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .field-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--color-soft-brown);
        }
        .forgot-link {
          font-size: 0.85rem;
          color: var(--color-muted);
          text-decoration: none;
        }
        .forgot-link:hover {
          color: var(--color-rose-gold);
          text-decoration: underline;
        }
        .input-field {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: var(--color-rose-gold);
        }
        .input-field::placeholder {
          color: var(--color-muted);
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-wrapper .input-field {
          padding-right: 2.75rem;
        }
        .toggle-password {
          position: absolute;
          right: 0.75rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #9ca3af;
          padding: 0.25rem;
          display: flex;
        }
        .toggle-password:hover {
          color: var(--color-charcoal);
        }
        .form-error {
          color: #c75c5c;
          font-size: 0.9rem;
          margin: 0;
        }
        .form-success {
          color: var(--color-rose-gold);
          font-size: 0.9rem;
          margin: 0;
        }
        .login-btn {
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
        .login-btn:hover:not(:disabled) {
          opacity: 0.95;
          transform: translateY(-1px);
        }
        .login-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .or-separator {
          text-align: center;
          color: var(--color-muted);
          margin: 1.5rem 0 1rem;
          font-size: 0.9rem;
        }
        .social-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .social-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #fff;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          font-size: 0.95rem;
          color: var(--color-soft-brown);
          cursor: pointer;
          transition: all 0.2s;
        }
        .social-btn:hover {
          border-color: var(--color-rose);
          background: var(--color-blush);
        }
        .signup-prompt {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.95rem;
          color: var(--color-muted);
        }
        .signup-link {
          color: var(--color-rose-gold);
          font-weight: 500;
          text-decoration: none;
        }
        .signup-link:hover {
          text-decoration: underline;
        }
        .legal-text {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.8rem;
          color: var(--color-muted);
        }
        .legal-link {
          color: var(--color-rose-gold);
          text-decoration: none;
        }
        .legal-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  )
}

export default LoginPage
