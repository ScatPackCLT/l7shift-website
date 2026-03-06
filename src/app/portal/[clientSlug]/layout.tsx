'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import { CursorWrapper } from '@/components/shared/CursorWrapper'
import { getClientConfig } from '@/lib/client-portal-config'

interface PortalLayoutProps {
  children: ReactNode
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

export default function PortalLayout({ children }: PortalLayoutProps) {
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()
  const clientSlug = params.clientSlug as string
  const config = getClientConfig(clientSlug)

  const [userName, setUserName] = useState('User')
  const [showDropdown, setShowDropdown] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const name = getCookie('l7_user_name')
    if (name) setUserName(decodeURIComponent(name))
  }, [])

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const navItems = [
    { href: `/portal/${clientSlug}`, icon: '📊', label: 'Dashboard' },
    { href: `/portal/${clientSlug}/deliverables`, icon: '📁', label: 'Deliverables' },
    { href: `/portal/${clientSlug}/requirements`, icon: '📝', label: 'Requirements' },
    { href: `/portal/${clientSlug}/activity`, icon: '🕐', label: 'Activity' },
    { href: `/portal/${clientSlug}/assets`, icon: '📤', label: 'Upload Assets' },
  ]

  return (
    <CursorWrapper>
    <div
      className="client-portal"
      style={{
        minHeight: '100vh',
        background: '#0A0A0A',
        color: '#FAFAFA',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Top Header */}
      <header
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(10, 10, 10, 0.95)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Logo & Client Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 500, color: '#FAFAFA' }}>L7</span>
            <span style={{ fontSize: 12, fontWeight: 300, color: '#888', letterSpacing: '0.15em' }}>SHIFT</span>
          </Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: config.primaryColor,
            }}
          >
            {config.name}
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="portal-desktop-nav" style={{ display: 'flex', gap: 4 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: isActive ? config.primaryColor : '#888',
                  background: isActive ? `${config.primaryColor}15` : 'transparent',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right side: user avatar + mobile hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* User Avatar & Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 600,
                color: '#0A0A0A',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {userName.charAt(0).toUpperCase()}
            </button>
            {showDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 42,
                  right: 0,
                  background: '#1A1A1A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  padding: 8,
                  minWidth: 160,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  zIndex: 200,
                }}
              >
                <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#FAFAFA' }}>{userName}</div>
                  <div style={{ fontSize: 11, color: '#666' }}>{config.name}</div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: '#888',
                    fontSize: 13,
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            className="portal-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              color: '#FAFAFA',
              fontSize: 22,
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div
          className="portal-mobile-nav"
          style={{
            position: 'fixed',
            top: 58,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(10, 10, 10, 0.98)',
            backdropFilter: 'blur(20px)',
            zIndex: 99,
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px 20px',
                  borderRadius: 12,
                  textDecoration: 'none',
                  color: isActive ? config.primaryColor : '#CCC',
                  background: isActive ? `${config.primaryColor}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? config.primaryColor + '33' : 'rgba(255,255,255,0.06)'}`,
                  fontSize: 16,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            style={{
              marginTop: 'auto',
              padding: '16px 20px',
              background: 'rgba(255,0,0,0.1)',
              border: '1px solid rgba(255,0,0,0.2)',
              borderRadius: 12,
              color: '#FF6B6B',
              fontSize: 16,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      {/* Main Content */}
      <main style={{ padding: '24px 16px', maxWidth: 1400, margin: '0 auto' }}>
        {children}
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: '20px 16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#555', fontSize: 11, letterSpacing: '0.1em', margin: 0 }}>
          POWERED BY{' '}
          <a href="https://l7shift.com" style={{ color: config.primaryColor, textDecoration: 'none' }}>
            L7 SHIFT
          </a>{' '}
          • THE SYMB<span style={{ fontWeight: 700 }}>AI</span>OTIC METHOD™
        </p>
      </footer>

      {/* Responsive CSS */}
      <style jsx global>{`
        .portal-desktop-nav { display: flex !important; }
        .portal-mobile-menu-btn { display: none !important; }

        @media (max-width: 768px) {
          .portal-desktop-nav { display: none !important; }
          .portal-mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </div>
    </CursorWrapper>
  )
}
