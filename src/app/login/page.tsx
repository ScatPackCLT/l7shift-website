'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CursorWrapper } from '@/components/shared/CursorWrapper'
import { TurnstileWidget } from '@/components/shared/Turnstile'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Validate redirect to prevent open redirect attacks
  const rawRedirect = searchParams.get('redirect') || '/internal'
  // Only allow internal paths starting with /
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect
    : '/internal'
  const urlError = searchParams.get('error')

  useEffect(() => {
    if (urlError === 'unauthorized') {
      setError('You do not have permission to access that page.')
    } else if (urlError === 'session_expired') {
      setError('Your session has expired. Please sign in again.')
    }
  }, [urlError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captchaToken: turnstileToken,
          captchaType: 'turnstile',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        setIsLoading(false)
        return
      }

      // Determine redirect based on role
      let finalRedirect = redirect
      if (data.role === 'client' && data.clientSlug) {
        finalRedirect = `/portal/${data.clientSlug}`
      }

      router.push(finalRedirect)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#FAFAFA',
              margin: 0,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            L7<span style={{ color: '#00F0FF' }}>.</span>
          </h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>
            Sign in to continue
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                color: '#888',
                fontSize: 13,
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#FAFAFA',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ marginBottom: 32 }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                color: '#888',
                fontSize: 13,
                marginBottom: 8,
                fontWeight: 500,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '14px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#FAFAFA',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(255, 0, 0, 0.1)',
                border: '1px solid rgba(255, 0, 0, 0.3)',
                borderRadius: 8,
                marginBottom: 24,
                color: '#FF6B6B',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* Turnstile Widget */}
          <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
            <TurnstileWidget
              onVerify={(token) => setTurnstileToken(token)}
              onExpired={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: isLoading ? '#333' : '#00F0FF',
              border: 'none',
              borderRadius: 8,
              color: '#0A0A0A',
              fontSize: 15,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Security notice */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ color: '#555', fontSize: 11 }}>
            Protected by enterprise-grade security
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a
            href="/"
            style={{
              color: '#666',
              fontSize: 13,
              textDecoration: 'none',
            }}
          >
            Back to L7 Shift
          </a>
        </div>
      </div>
    </div>
  )
}

function LoginFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ color: '#888', fontSize: 14 }}>Loading...</div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <CursorWrapper>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </CursorWrapper>
  )
}
