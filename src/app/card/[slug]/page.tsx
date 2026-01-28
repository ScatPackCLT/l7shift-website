'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

// Brand colors from brand guide
const brandColors = {
  voidBlack: '#0A0A0A',
  electricCyan: '#00F0FF',
  hotMagenta: '#FF00AA',
  acidLime: '#BFFF00',
  white: '#FAFAFA',
  gray: '#888888',
  darkGray: '#1A1A1A',
  cardBg: '#111111',
}

// Card holder data - later this could come from Supabase
const cardHolders: Record<string, CardHolder> = {
  ken: {
    name: 'Ken Leftwich',
    title: 'Founder & Chief Architect',
    company: 'L7 Shift',
    tagline: 'Digital transformation for the non-conformist.',
    email: 'ken@l7shift.com',
    phone: '(704) 839-9448',
    website: 'https://l7shift.com',
    socials: {
      linkedin: 'https://linkedin.com/in/kenleftwich',
      twitter: 'https://x.com/CharlotteAgency',
      github: 'https://github.com/ScatPackCLT',
    },
  },
}

interface CardHolder {
  name: string
  title: string
  company: string
  tagline: string
  email: string
  phone: string
  website: string
  socials: {
    linkedin?: string
    twitter?: string
    github?: string
  }
}

// Subtle animated background
function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Particles - fewer and more subtle
    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string }[] = []
    const colors = [brandColors.electricCyan, brandColors.hotMagenta, brandColors.acidLime]

    for (let i = 0; i < 25; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animationId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = 0.15
        ctx.fill()
        ctx.globalAlpha = 1
      })

      // Draw very subtle connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.03 * (1 - dist / 150)})`
            ctx.stroke()
          }
        })
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}

// Generate vCard for download
function generateVCard(holder: CardHolder): string {
  return `BEGIN:VCARD
VERSION:3.0
FN:${holder.name}
ORG:${holder.company}
TITLE:${holder.title}
EMAIL:${holder.email}
TEL:${holder.phone}
URL:${holder.website}
${holder.socials.linkedin ? `X-SOCIALPROFILE;TYPE=linkedin:${holder.socials.linkedin}` : ''}
${holder.socials.twitter ? `X-SOCIALPROFILE;TYPE=twitter:${holder.socials.twitter}` : ''}
END:VCARD`
}

function downloadVCard(holder: CardHolder) {
  const vcard = generateVCard(holder)
  const blob = new Blob([vcard], { type: 'text/vcard' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${holder.name.replace(/\s+/g, '_')}.vcf`
  a.click()
  URL.revokeObjectURL(url)
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

  useEffect(() => {
    setMounted(true)
  }, [])

  const holder = cardHolders[slug]

  if (!mounted) {
    return (
      <div style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        background: brandColors.voidBlack,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: brandColors.white
      }}>
        <div style={{ opacity: 0.5 }}>Loading...</div>
      </div>
    )
  }

  if (!holder) {
    return (
      <div style={{
        minHeight: '100vh',
        minHeight: '100dvh',
        background: brandColors.voidBlack,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: brandColors.white,
        flexDirection: 'column',
        gap: 16,
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Card not found</h1>
        <p style={{ color: brandColors.gray }}>The requested digital card does not exist.</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      background: brandColors.voidBlack,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
    }}>
      {/* Subtle animated background */}
      <AnimatedBackground />

      {/* Top gradient bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta})`,
        zIndex: 100,
      }} />

      {/* Card Container */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: 380,
        background: brandColors.cardBg,
        borderRadius: 20,
        padding: '32px 24px',
        border: `1px solid rgba(255,255,255,0.08)`,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        {/* L7 Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: 24,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: 3,
          color: brandColors.gray,
        }}>
          L7 <span style={{ fontWeight: 300 }}>SHIFT</span>
        </div>

        {/* Profile Avatar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 20,
        }}>
          <div style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta})`,
            padding: 3,
            boxShadow: `0 0 30px rgba(0, 240, 255, 0.3), 0 0 60px rgba(255, 0, 170, 0.2)`,
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: brandColors.darkGray,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: brandColors.white,
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}>
              {holder.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
        </div>

        {/* Name */}
        <h1 style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 700,
          color: brandColors.white,
          textAlign: 'center',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          letterSpacing: -0.5,
        }}>
          {holder.name}
        </h1>

        {/* Title */}
        <p style={{
          margin: '8px 0 4px',
          fontSize: 12,
          fontWeight: 600,
          color: brandColors.electricCyan,
          textAlign: 'center',
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}>
          {holder.title}
        </p>

        {/* Company */}
        <p style={{
          margin: 0,
          fontSize: 13,
          color: brandColors.gray,
          textAlign: 'center',
        }}>
          {holder.company}
        </p>

        {/* Tagline */}
        <p style={{
          margin: '16px 0 0',
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}>
          "{holder.tagline}"
        </p>

        {/* Divider */}
        <div style={{
          margin: '24px 0',
          height: 1,
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
        }} />

        {/* Social Icons */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          marginBottom: 24,
        }}>
          {holder.socials.linkedin && (
            <a
              href={holder.socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: brandColors.white,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <LinkedInIcon />
            </a>
          )}
          {holder.socials.twitter && (
            <a
              href={holder.socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: brandColors.white,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <XIcon />
            </a>
          )}
          {holder.socials.github && (
            <a
              href={holder.socials.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: brandColors.white,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
            >
              <GitHubIcon />
            </a>
          )}
        </div>

        {/* Contact Links */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 24,
        }}>
          <a
            href={`mailto:${holder.email}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: brandColors.white,
              textDecoration: 'none',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ color: brandColors.electricCyan, opacity: 0.8 }}><EmailIcon /></span>
            <span>{holder.email}</span>
          </a>

          <a
            href={`tel:${holder.phone}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: brandColors.white,
              textDecoration: 'none',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ color: brandColors.hotMagenta, opacity: 0.8 }}><PhoneIcon /></span>
            <span>{holder.phone}</span>
          </a>

          <a
            href={holder.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: brandColors.white,
              textDecoration: 'none',
              fontSize: 14,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ color: brandColors.acidLime, opacity: 0.8 }}><WebIcon /></span>
            <span>{holder.website.replace('https://', '')}</span>
          </a>
        </div>

        {/* Save Contact Button */}
        <button
          onClick={() => downloadVCard(holder)}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: `linear-gradient(135deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta})`,
            border: 'none',
            borderRadius: 12,
            color: brandColors.voidBlack,
            fontSize: 15,
            fontWeight: 700,
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Save Contact
        </button>

        {/* Footer */}
        <div style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
        }}>
          Powered by{' '}
          <span style={{
            background: `linear-gradient(90deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 600,
          }}>
            ShiftCards™
          </span>
        </div>
      </div>
    </div>
  )
}
