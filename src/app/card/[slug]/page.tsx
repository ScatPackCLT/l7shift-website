'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'

// Brand colors from brand guide
const brandColors = {
  voidBlack: '#0A0A0A',
  electricCyan: '#00F0FF',
  hotMagenta: '#FF00AA',
  acidLime: '#BFFF00',
  white: '#FFFFFF',
  gray: '#888888',
  darkGray: '#1A1A1A',
  mediumGray: '#2A2A2A',
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
    photo: '/ken-profile.jpg',
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
  photo?: string
  socials: {
    linkedin?: string
    twitter?: string
    github?: string
    instagram?: string
  }
  calendly?: string
}

// Broken Square SVG - signature L7 visual element
function BrokenSquare({ size = 300, opacity = 0.06, animated = true }: { size?: number; opacity?: number; animated?: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        opacity,
        pointerEvents: 'none',
      }}
      className={animated ? 'broken-square-animated' : ''}
    >
      <svg viewBox="0 0 100 100" fill="none" stroke={brandColors.white} strokeWidth="0.5">
        <path d="M10 10 L90 10 L90 40" className="square-path" />
        <path d="M90 60 L90 90 L10 90 L10 10" className="square-path" />
      </svg>
    </div>
  )
}

// Gradient Bar - brand element
function GradientBar() {
  return (
    <div
      style={{
        height: 3,
        background: `linear-gradient(90deg, ${brandColors.electricCyan} 0%, ${brandColors.hotMagenta} 100%)`,
        width: '100%',
        borderRadius: 2,
      }}
    />
  )
}

// Section Label - brand typography
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: 4,
        textTransform: 'uppercase',
        color: brandColors.gray,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  )
}

// Animated background with particles
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

    // Particles
    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string }[] = []
    const colors = [brandColors.electricCyan, brandColors.hotMagenta, brandColors.acidLime]

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 1.5 + 0.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    let animationId: number

    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = 0.4
        ctx.fill()
        ctx.globalAlpha = 1
      })

      // Draw subtle connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.05 * (1 - dist / 120)})`
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
      }}
    />
  )
}

// Glitch text effect - from brand guide
function GlitchText({ text }: { text: string }) {
  return (
    <span className="glitch-text" data-text={text}>
      {text}
    </span>
  )
}

// Social icon with glow effect
function SocialIcon({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="social-icon"
    >
      {icon}
    </a>
  )
}

// Generate vCard for download
function generateVCard(holder: CardHolder): string {
  const vcard = `BEGIN:VCARD
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
  return vcard
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

// LinkedIn icon SVG
const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

// X/Twitter icon SVG
const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

// GitHub icon SVG
const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
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
        background: brandColors.voidBlack,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: brandColors.white
      }}>
        <div className="loading-pulse">Loading...</div>
      </div>
    )
  }

  if (!holder) {
    return (
      <div style={{
        minHeight: '100vh',
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
    <div className="digital-card-page">
      {/* Animated Background */}
      <AnimatedBackground />

      {/* Broken Square - signature L7 element */}
      <BrokenSquare size={400} opacity={0.04} animated />

      {/* Scanline overlay */}
      <div className="scanline" />

      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Top gradient bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <GradientBar />
      </div>

      {/* Card Content */}
      <div className="card-content">
        {/* L7 Logo */}
        <div className="l7-logo">
          L7 <span className="logo-light">SHIFT</span>
        </div>

        {/* Profile Photo with animated ring */}
        <div className="profile-ring">
          <div className="profile-inner">
            {holder.name.split(' ').map(n => n[0]).join('')}
          </div>
        </div>

        {/* Name with glitch effect */}
        <h1 className="name">
          <GlitchText text={holder.name} />
        </h1>

        {/* Title */}
        <p className="title">{holder.title}</p>

        {/* Company */}
        <p className="company">{holder.company}</p>

        {/* Tagline */}
        <p className="tagline">"{holder.tagline}"</p>

        {/* Gradient divider */}
        <div className="divider">
          <GradientBar />
        </div>

        {/* Social Icons */}
        <div className="socials">
          {holder.socials.linkedin && (
            <SocialIcon href={holder.socials.linkedin} icon={<LinkedInIcon />} label="LinkedIn" />
          )}
          {holder.socials.twitter && (
            <SocialIcon href={holder.socials.twitter} icon={<XIcon />} label="X" />
          )}
          {holder.socials.github && (
            <SocialIcon href={holder.socials.github} icon={<GitHubIcon />} label="GitHub" />
          )}
        </div>

        {/* Contact Section */}
        <div className="contact-section">
          <SectionLabel>Connect</SectionLabel>

          <a href={`mailto:${holder.email}`} className="contact-link">
            <span className="contact-icon">✉</span>
            <span>{holder.email}</span>
          </a>

          <a href={`tel:${holder.phone}`} className="contact-link">
            <span className="contact-icon">☎</span>
            <span>{holder.phone}</span>
          </a>

          <a href={holder.website} target="_blank" rel="noopener noreferrer" className="contact-link">
            <span className="contact-icon">◈</span>
            <span>{holder.website.replace('https://', '')}</span>
          </a>
        </div>

        {/* Action Buttons */}
        <div className="actions">
          <button onClick={() => downloadVCard(holder)} className="btn-primary">
            Save Contact
          </button>

          {holder.calendly && (
            <a href={holder.calendly} target="_blank" rel="noopener noreferrer" className="btn-secondary">
              Schedule a Call
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="footer">
          <span>Break the</span>
          <span className="footer-gradient">Square</span>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .digital-card-page {
          min-height: 100vh;
          background: ${brandColors.voidBlack};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px 40px;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .digital-card-page, .digital-card-page * {
          cursor: auto !important;
        }
        .digital-card-page a, .digital-card-page button {
          cursor: pointer !important;
        }

        .scanline {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${brandColors.electricCyan}, transparent);
          opacity: 0.4;
          pointer-events: none;
          z-index: 100;
          animation: scanline 8s linear infinite;
        }

        .noise-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          opacity: 0.025;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        .card-content {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .l7-logo {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 2px;
          color: ${brandColors.white};
          opacity: 0.6;
          margin-bottom: 8px;
        }

        .logo-light {
          font-weight: 300;
        }

        .profile-ring {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta});
          padding: 3px;
          animation: pulse-glow 4s ease-in-out infinite;
        }

        .profile-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: ${brandColors.darkGray};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 700;
          color: ${brandColors.white};
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }

        .name {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: ${brandColors.white};
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          letter-spacing: -0.5px;
          text-align: center;
        }

        .glitch-text {
          position: relative;
          display: inline-block;
        }

        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }

        .glitch-text::before {
          color: ${brandColors.electricCyan};
          z-index: -1;
          animation: glitch 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          transform: translate(-2px, -1px);
        }

        .glitch-text::after {
          color: ${brandColors.hotMagenta};
          z-index: -2;
          animation: glitch 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse infinite;
          clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
          transform: translate(2px, 1px);
        }

        .title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: ${brandColors.electricCyan};
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .company {
          margin: -8px 0 0;
          font-size: 12px;
          color: ${brandColors.gray};
        }

        .tagline {
          margin: 0;
          font-size: 13px;
          color: ${brandColors.gray};
          font-style: italic;
          text-align: center;
          opacity: 0.8;
        }

        .divider {
          width: 50%;
          margin: 4px 0;
        }

        .socials {
          display: flex;
          gap: 16px;
        }

        .social-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${brandColors.white};
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .social-icon:hover {
          border-color: ${brandColors.electricCyan};
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.3), 0 0 40px rgba(0, 240, 255, 0.1);
          transform: translateY(-3px);
          color: ${brandColors.electricCyan};
        }

        .contact-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .contact-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: ${brandColors.white};
          text-decoration: none;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .contact-link:hover {
          border-color: rgba(0, 240, 255, 0.4);
          background: rgba(0, 240, 255, 0.03);
        }

        .contact-icon {
          opacity: 0.5;
          font-size: 16px;
        }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          margin-top: 8px;
        }

        .btn-primary {
          width: 100%;
          padding: 16px 24px;
          background: linear-gradient(135deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta});
          border: none;
          border-radius: 8px;
          color: ${brandColors.voidBlack};
          font-size: 15px;
          font-weight: 700;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 240, 255, 0.25), 0 0 20px rgba(255, 0, 170, 0.15);
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-secondary {
          width: 100%;
          padding: 14px 24px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          color: ${brandColors.white};
          font-size: 14px;
          font-weight: 600;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          text-decoration: none;
          text-align: center;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          border-color: ${brandColors.electricCyan};
          color: ${brandColors.electricCyan};
        }

        .footer {
          margin-top: 24px;
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: ${brandColors.gray};
          opacity: 0.5;
        }

        .footer-gradient {
          background: linear-gradient(90deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 600;
        }

        .broken-square-animated .square-path {
          animation: draw-square 4s ease-in-out infinite;
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(0, 240, 255, 0.2), 0 0 30px rgba(255, 0, 170, 0.1);
          }
          50% {
            box-shadow: 0 0 25px rgba(0, 240, 255, 0.4), 0 0 50px rgba(255, 0, 170, 0.2);
          }
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 1px); }
          40% { transform: translate(-1px, -1px); }
          60% { transform: translate(1px, 1px); }
          80% { transform: translate(1px, -1px); }
          100% { transform: translate(0); }
        }

        @keyframes draw-square {
          0%, 100% { stroke-dashoffset: 0; opacity: 0.04; }
          50% { stroke-dashoffset: 50; opacity: 0.08; }
        }

        .loading-pulse {
          animation: loading 1.5s ease-in-out infinite;
        }

        @keyframes loading {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @media (max-width: 480px) {
          .name {
            font-size: 24px;
          }
          .profile-ring {
            width: 90px;
            height: 90px;
          }
          .profile-inner {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  )
}
