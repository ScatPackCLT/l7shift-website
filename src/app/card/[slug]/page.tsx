'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import './card.css'

interface CardHolder {
  id: string
  slug: string
  name: string
  title: string | null
  company: string | null
  tagline: string | null
  email: string | null
  phone: string | null
  website: string | null
  bio: string | null
  avatar_type: 'initials' | 'photo'
  avatar_url: string | null
  socials: {
    linkedin?: string
    twitter?: string
    github?: string
    instagram?: string
  }
  theme: string
  tier: string
  animations_enabled: boolean
  show_branding: boolean
}

// Generate vCard content
function generateVCard(holder: CardHolder): string {
  // Split name into parts for N field
  const nameParts = holder.name.split(' ')
  const lastName = nameParts.pop() || ''
  const firstName = nameParts.join(' ')

  // Format phone for TEL field (remove formatting)
  const phoneClean = holder.phone?.replace(/[^\d+]/g, '') || ''

  // Include digital card URL in the note for cross-platform discovery
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://l7shift.com'
  const cardUrl = `${baseUrl}/card/${holder.slug}`

  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${lastName};${firstName};;;`,
    `FN:${holder.name}`,
    holder.company ? `ORG:${holder.company}` : '',
    holder.title ? `TITLE:${holder.title}` : '',
    phoneClean ? `TEL;TYPE=WORK,VOICE:${phoneClean}` : '',
    holder.email ? `EMAIL;TYPE=WORK,INTERNET:${holder.email}` : '',
    holder.website ? `URL;TYPE=WORK:${holder.website}` : '',
    `URL;TYPE=PREF:${cardUrl}`, // Digital card link
    holder.socials?.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${holder.socials.linkedin}` : '',
    holder.socials?.twitter ? `X-SOCIALPROFILE;TYPE=twitter:${holder.socials.twitter}` : '',
    holder.socials?.github ? `URL;TYPE=github:${holder.socials.github}` : '',
    holder.tagline ? `NOTE:${holder.tagline}\\n\\nDigital Card: ${cardUrl}` : `NOTE:Digital Card: ${cardUrl}`,
    'END:VCARD'
  ].filter(Boolean).join('\r\n')
}

// Download vCard file
function downloadVCard(holder: CardHolder) {
  const vcard = generateVCard(holder)
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${holder.name.replace(/\s+/g, '_')}.vcf`
  a.click()
  URL.revokeObjectURL(url)
}

// Save directly to contacts (iOS/Android) - opens native contact picker
function saveToContacts(holder: CardHolder) {
  const vcard = generateVCard(holder)
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  // On mobile, this triggers the native "Add to Contacts" flow
  window.location.href = url
}

// Google Wallet icon
const GoogleWalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 18v1a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v1h-9a2 2 0 00-2 2v8a2 2 0 002 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
  </svg>
)

// Apple Wallet icon
const AppleWalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)

// Detect iOS device
function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Detect Android device
function isAndroid(): boolean {
  if (typeof window === 'undefined') return false
  return /Android/.test(navigator.userAgent)
}

// Icons
const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

const EmailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M22 6L12 13L2 6"/>
  </svg>
)

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
  </svg>
)

const WebIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
)

export default function DigitalCard() {
  const params = useParams()
  const slug = params.slug as string
  const [mounted, setMounted] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
  const [appleWalletLoading, setAppleWalletLoading] = useState(false)
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'other'>('other')
  const [holder, setHolder] = useState<CardHolder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)

    // Detect device type for wallet button display
    if (isIOS()) {
      setDeviceType('ios')
    } else if (isAndroid()) {
      setDeviceType('android')
    } else {
      setDeviceType('other')
    }

    // Fetch card data from Supabase API
    async function fetchCard() {
      try {
        const res = await fetch(`/api/shiftcards/${slug}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('not_found')
          } else {
            setError('error')
          }
          return
        }
        const data = await res.json()
        setHolder(data)
      } catch {
        setError('error')
      } finally {
        setLoading(false)
      }
    }

    fetchCard()
  }, [slug])

  const handleGoogleWallet = async () => {
    setWalletLoading(true)
    try {
      const res = await fetch(`/api/wallet/google?id=${slug}`)
      const data = await res.json()

      if (data.saveUrl) {
        window.location.href = data.saveUrl
      } else if (data.error === 'Google Wallet not configured') {
        alert('Google Wallet is coming soon! Use "Save Contact" for now.')
      } else {
        alert('Unable to add to Google Wallet. Please try "Save Contact" instead.')
      }
    } catch {
      alert('Unable to add to Google Wallet. Please try "Save Contact" instead.')
    } finally {
      setWalletLoading(false)
    }
  }

  const handleAppleWallet = async () => {
    setAppleWalletLoading(true)
    try {
      const res = await fetch(`/api/wallet/apple?id=${slug}`)

      // Check if we got a .pkpass file or an error
      const contentType = res.headers.get('content-type')

      if (contentType?.includes('application/vnd.apple.pkpass')) {
        // Download the pass file
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${holder?.name.replace(/\s+/g, '_') || 'ShiftCard'}.pkpass`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // API returned JSON (not configured or error)
        const data = await res.json()
        if (data.configured === false) {
          alert('Apple Wallet is being configured. Use "Save Contact" for now.')
        } else {
          alert(data.error || 'Unable to add to Apple Wallet. Please try "Save Contact" instead.')
        }
      }
    } catch {
      alert('Unable to add to Apple Wallet. Please try "Save Contact" instead.')
    } finally {
      setAppleWalletLoading(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="card-page">
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    )
  }

  if (error === 'not_found' || !holder) {
    return (
      <div className="card-page">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Card not found</h1>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-page">
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Unable to load card</h1>
        <p style={{ color: '#666', marginTop: 8 }}>Please try again later.</p>
      </div>
    )
  }

  return (
    <div className="card-page">
      <div className="shift-card">
        {/* Top gradient bar */}
        <div className="gradient-bar" />

        {/* Corner accents */}
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        {/* Broken square watermark */}
        {/* Broken Square - Full Card Frame with Animated Gradient */}
        <div className="broken-square">
          <svg viewBox="0 0 100 100" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="brokenSquareGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F0FF">
                  <animate attributeName="stop-color" values="#00F0FF;#FF00AA;#BFFF00;#00F0FF" dur="4s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#FF00AA">
                  <animate attributeName="stop-color" values="#FF00AA;#BFFF00;#00F0FF;#FF00AA" dur="4s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#BFFF00">
                  <animate attributeName="stop-color" values="#BFFF00;#00F0FF;#FF00AA;#BFFF00" dur="4s" repeatCount="indefinite" />
                </stop>
              </linearGradient>
            </defs>
            {/* Top edge + right side partial */}
            <path d="M0 0 L100 0 L100 30" stroke="url(#brokenSquareGradient)" strokeWidth="0.5" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
            {/* Gap/break in right side */}
            {/* Right side continues + bottom + left side back to top */}
            <path d="M100 70 L100 100 L0 100 L0 0" stroke="url(#brokenSquareGradient)" strokeWidth="0.5" strokeLinecap="square" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        {/* Scanline */}
        <div className="scanline" />

        {/* Noise overlay */}
        <div className="noise" />

        {/* Content */}
        <div className="card-content">
          {/* L7 Logo - Animated */}
          <div className="logo-container">
            <div className="logo">
              <span className="logo-l7" data-text="L7">L7</span>
              <span className="logo-shift">SHIFT</span>
            </div>
            <div className="logo-bar" />
            <span className="logo-tagline">Break the Square</span>
          </div>

          {/* Avatar */}
          <div className="avatar-wrapper">
            <div className="avatar-glow" />
            <div className="avatar-ring">
              <div className="avatar-inner">
                {holder.name.split(' ').map(n => n[0]).join('')}
              </div>
            </div>
          </div>

          {/* Name with glitch */}
          <h1 className="name" data-text={holder.name}>
            {holder.name}
          </h1>

          {/* Title - highlight AI in SymbAIote */}
          {holder.title && (
            <p className="title" data-text={holder.title}>
              {holder.title.includes('SymbAIote') ? (
                <>
                  {holder.title.split('SymbAIote')[0]}
                  Symb<span className="title-ai">AI</span>ote
                  {holder.title.split('SymbAIote')[1]}
                </>
              ) : holder.title}
            </p>
          )}

          {/* Company */}
          {holder.company && <p className="company">{holder.company}</p>}

          {/* Tagline */}
          {holder.tagline && <p className="tagline">"{holder.tagline}"</p>}

          {/* Divider */}
          <div className="divider" />

          {/* Social Icons */}
          <div className="socials">
            {holder.socials?.linkedin && (
              <a href={holder.socials.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon">
                <LinkedInIcon />
              </a>
            )}
            {holder.socials?.twitter && (
              <a href={holder.socials.twitter} target="_blank" rel="noopener noreferrer" className="social-icon">
                <XIcon />
              </a>
            )}
            {holder.socials?.github && (
              <a href={holder.socials.github} target="_blank" rel="noopener noreferrer" className="social-icon">
                <GitHubIcon />
              </a>
            )}
          </div>

          {/* Contact Links */}
          <div className="contacts">
            {holder.email && (
              <a href={`mailto:${holder.email}`} className="contact-link">
                <span className="contact-icon cyan"><EmailIcon /></span>
                <span>{holder.email}</span>
              </a>
            )}
            {holder.phone && (
              <a href={`tel:${holder.phone}`} className="contact-link">
                <span className="contact-icon magenta"><PhoneIcon /></span>
                <span>{holder.phone}</span>
              </a>
            )}
            {holder.website && (
              <a href={holder.website} target="_blank" rel="noopener noreferrer" className="contact-link">
                <span className="contact-icon lime"><WebIcon /></span>
                <span>{holder.website.replace('https://', '')}</span>
              </a>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button onClick={() => downloadVCard(holder)} className="save-btn">
              <span className="btn-text">Save Contact</span>
              <span className="btn-glow" />
            </button>

            {/* Show Apple Wallet for iOS, Google Wallet for Android, both for desktop */}
            {(deviceType === 'ios' || deviceType === 'other') && (
              <button
                onClick={handleAppleWallet}
                className="wallet-btn apple-wallet"
                disabled={appleWalletLoading}
              >
                <AppleWalletIcon />
                <span>{appleWalletLoading ? 'Loading...' : 'Add to Apple Wallet'}</span>
              </button>
            )}

            {(deviceType === 'android' || deviceType === 'other') && (
              <button
                onClick={handleGoogleWallet}
                className="wallet-btn google-wallet"
                disabled={walletLoading}
              >
                <GoogleWalletIcon />
                <span>{walletLoading ? 'Loading...' : 'Add to Google Wallet'}</span>
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="footer">
            Powered by <span className="footer-brand">ShiftCards™</span>
          </div>
        </div>
      </div>
    </div>
  )
}
