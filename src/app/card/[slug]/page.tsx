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
  cardBg: '#0D0D0D',
}

// Card holder data
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

// Animated particle background
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

    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string }[] = []
    const colors = [brandColors.electricCyan, brandColors.hotMagenta, brandColors.acidLime]

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
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
        ctx.globalAlpha = 0.3
        ctx.fill()
        ctx.globalAlpha = 1
      })

      // Draw connections
      particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach((p2) => {
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 180) {
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.08 * (1 - dist / 180)})`
            ctx.lineWidth = 0.5
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
      <div className="loading-screen">
        <div className="loading-text">Loading...</div>
        <style jsx>{`
          .loading-screen {
            min-height: 100dvh;
            background: ${brandColors.voidBlack};
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .loading-text {
            color: ${brandColors.gray};
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  if (!holder) {
    return (
      <div className="not-found">
        <h1>Card not found</h1>
        <p>The requested digital card does not exist.</p>
        <style jsx>{`
          .not-found {
            min-height: 100dvh;
            background: ${brandColors.voidBlack};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: ${brandColors.white};
          }
          h1 { font-size: 24px; font-weight: 700; }
          p { color: ${brandColors.gray}; }
        `}</style>
      </div>
    )
  }

  return (
    <div className="card-page">
      <AnimatedBackground />

      {/* Scanline effect */}
      <div className="scanline" />

      {/* Noise texture overlay */}
      <div className="noise" />

      {/* Top gradient bar */}
      <div className="gradient-bar" />

      {/* Card Container */}
      <div className="card">
        {/* Broken Square watermark */}
        <div className="broken-square">
          <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M15 15 L85 15 L85 40" className="sq-path" />
            <path d="M85 60 L85 85 L15 85 L15 15" className="sq-path" />
          </svg>
        </div>

        {/* Corner accents */}
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        {/* L7 Logo */}
        <div className="logo">
          L7 <span className="logo-light">SHIFT</span>
        </div>

        {/* Profile Avatar */}
        <div className="avatar-container">
          <div className="avatar-glow" />
          <div className="avatar-ring">
            <div className="avatar-inner">
              {holder.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
        </div>

        {/* Name with glitch effect */}
        <h1 className="name" data-text={holder.name}>
          {holder.name}
        </h1>

        {/* Title */}
        <p className="title">{holder.title}</p>

        {/* Company */}
        <p className="company">{holder.company}</p>

        {/* Tagline */}
        <p className="tagline">"{holder.tagline}"</p>

        {/* Gradient divider */}
        <div className="divider" />

        {/* Social Icons */}
        <div className="socials">
          {holder.socials.linkedin && (
            <a href={holder.socials.linkedin} target="_blank" rel="noopener noreferrer" className="social-icon">
              <LinkedInIcon />
            </a>
          )}
          {holder.socials.twitter && (
            <a href={holder.socials.twitter} target="_blank" rel="noopener noreferrer" className="social-icon">
              <XIcon />
            </a>
          )}
          {holder.socials.github && (
            <a href={holder.socials.github} target="_blank" rel="noopener noreferrer" className="social-icon">
              <GitHubIcon />
            </a>
          )}
        </div>

        {/* Contact Links */}
        <div className="contacts">
          <a href={`mailto:${holder.email}`} className="contact-link">
            <span className="contact-icon cyan"><EmailIcon /></span>
            <span>{holder.email}</span>
          </a>
          <a href={`tel:${holder.phone}`} className="contact-link">
            <span className="contact-icon magenta"><PhoneIcon /></span>
            <span>{holder.phone}</span>
          </a>
          <a href={holder.website} target="_blank" rel="noopener noreferrer" className="contact-link">
            <span className="contact-icon lime"><WebIcon /></span>
            <span>{holder.website.replace('https://', '')}</span>
          </a>
        </div>

        {/* Save Contact Button */}
        <button onClick={() => downloadVCard(holder)} className="save-btn">
          <span className="btn-text">Save Contact</span>
          <span className="btn-shine" />
        </button>

        {/* Footer */}
        <div className="footer">
          Powered by <span className="footer-brand">ShiftCards™</span>
        </div>
      </div>

      <style jsx>{`
        .card-page {
          min-height: 100dvh;
          background: ${brandColors.voidBlack};
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          position: relative;
          overflow: hidden;
        }

        /* Scanline effect */
        .scanline {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, transparent, ${brandColors.electricCyan}, transparent);
          opacity: 0.6;
          pointer-events: none;
          z-index: 100;
          animation: scanline 6s linear infinite;
        }

        @keyframes scanline {
          0% { transform: translateY(-10px); }
          100% { transform: translateY(100vh); }
        }

        /* Noise texture */
        .noise {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
        }

        /* Top gradient bar */
        .gradient-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta}, ${brandColors.acidLime});
          z-index: 101;
        }

        /* Card */
        .card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 380px;
          background: ${brandColors.cardBg};
          border-radius: 16px;
          padding: 36px 28px;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow:
            0 25px 50px -12px rgba(0,0,0,0.6),
            0 0 0 1px rgba(255,255,255,0.03) inset,
            0 0 80px -20px rgba(0, 240, 255, 0.15);
          overflow: hidden;
        }

        /* Broken Square watermark */
        .broken-square {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 280px;
          height: 280px;
          opacity: 0.03;
          color: ${brandColors.white};
          pointer-events: none;
        }

        .sq-path {
          stroke-dasharray: 200;
          animation: draw 8s ease-in-out infinite;
        }

        @keyframes draw {
          0%, 100% { stroke-dashoffset: 0; opacity: 1; }
          50% { stroke-dashoffset: 100; opacity: 0.5; }
        }

        /* Corner accents */
        .corner {
          position: absolute;
          width: 20px;
          height: 20px;
          border-color: ${brandColors.electricCyan};
          border-style: solid;
          opacity: 0.4;
        }
        .corner-tl { top: 12px; left: 12px; border-width: 2px 0 0 2px; }
        .corner-tr { top: 12px; right: 12px; border-width: 2px 2px 0 0; }
        .corner-bl { bottom: 12px; left: 12px; border-width: 0 0 2px 2px; }
        .corner-br { bottom: 12px; right: 12px; border-width: 0 2px 2px 0; }

        /* Logo */
        .logo {
          text-align: center;
          margin-bottom: 24px;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 4px;
          color: ${brandColors.gray};
        }
        .logo-light { font-weight: 300; }

        /* Avatar */
        .avatar-container {
          position: relative;
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }

        .avatar-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(0,240,255,0.3) 0%, transparent 70%);
          animation: glow-pulse 3s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }

        .avatar-ring {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta}, ${brandColors.acidLime}, ${brandColors.electricCyan});
          padding: 3px;
          animation: ring-spin 8s linear infinite;
        }

        @keyframes ring-spin {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }

        .avatar-inner {
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

        /* Name with glitch effect */
        .name {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          color: ${brandColors.white};
          text-align: center;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          letter-spacing: -0.5px;
          position: relative;
        }

        .name::before,
        .name::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }

        .name::before {
          color: ${brandColors.electricCyan};
          z-index: -1;
          animation: glitch 3s ease-in-out infinite;
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
        }

        .name::after {
          color: ${brandColors.hotMagenta};
          z-index: -2;
          animation: glitch 3s ease-in-out infinite reverse;
          clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
        }

        @keyframes glitch {
          0%, 90%, 100% { transform: translate(0); }
          92% { transform: translate(-2px, 1px); }
          94% { transform: translate(2px, -1px); }
          96% { transform: translate(-1px, -1px); }
          98% { transform: translate(1px, 1px); }
        }

        /* Title */
        .title {
          margin: 10px 0 4px;
          font-size: 11px;
          font-weight: 700;
          color: ${brandColors.electricCyan};
          text-align: center;
          letter-spacing: 2px;
          text-transform: uppercase;
          text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
        }

        /* Company */
        .company {
          margin: 0;
          font-size: 13px;
          color: ${brandColors.gray};
          text-align: center;
        }

        /* Tagline */
        .tagline {
          margin: 16px 0 0;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          text-align: center;
          font-style: italic;
          line-height: 1.5;
        }

        /* Divider */
        .divider {
          margin: 24px auto;
          width: 60%;
          height: 1px;
          background: linear-gradient(90deg, transparent, ${brandColors.electricCyan}40, ${brandColors.hotMagenta}40, transparent);
        }

        /* Social Icons */
        .socials {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin-bottom: 24px;
        }

        .social-icon {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${brandColors.white};
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .social-icon:hover {
          border-color: ${brandColors.electricCyan};
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.4), 0 0 40px rgba(0, 240, 255, 0.2);
          transform: translateY(-4px) scale(1.05);
          color: ${brandColors.electricCyan};
        }

        /* Contact Links */
        .contacts {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 24px;
        }

        .contact-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          color: ${brandColors.white};
          text-decoration: none;
          font-size: 14px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .contact-link::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          transition: left 0.5s ease;
        }

        .contact-link:hover::before {
          left: 100%;
        }

        .contact-link:hover {
          border-color: rgba(0, 240, 255, 0.3);
          background: rgba(0, 240, 255, 0.03);
          transform: translateX(4px);
        }

        .contact-icon {
          display: flex;
          opacity: 0.9;
        }
        .contact-icon.cyan { color: ${brandColors.electricCyan}; }
        .contact-icon.magenta { color: ${brandColors.hotMagenta}; }
        .contact-icon.lime { color: ${brandColors.acidLime}; }

        /* Save Button */
        .save-btn {
          width: 100%;
          padding: 18px 24px;
          background: linear-gradient(135deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta});
          border: none;
          border-radius: 12px;
          color: ${brandColors.voidBlack};
          font-size: 15px;
          font-weight: 700;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .btn-text {
          position: relative;
          z-index: 1;
        }

        .btn-shine {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.6s ease;
        }

        .save-btn:hover {
          transform: translateY(-3px);
          box-shadow:
            0 15px 35px rgba(0, 240, 255, 0.3),
            0 5px 15px rgba(255, 0, 170, 0.2);
        }

        .save-btn:hover .btn-shine {
          left: 100%;
        }

        /* Footer */
        .footer {
          margin-top: 24px;
          text-align: center;
          font-size: 11px;
          color: rgba(255,255,255,0.25);
        }

        .footer-brand {
          background: linear-gradient(90deg, ${brandColors.electricCyan}, ${brandColors.hotMagenta});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-weight: 600;
        }

        /* Mobile adjustments */
        @media (max-width: 400px) {
          .card {
            padding: 28px 20px;
          }
          .name {
            font-size: 24px;
          }
          .avatar-ring {
            width: 90px;
            height: 90px;
          }
          .avatar-inner {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  )
}
