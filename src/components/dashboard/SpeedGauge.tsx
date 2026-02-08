'use client'

import { useEffect, useState } from 'react'

interface SpeedGaugeProps {
  shiftHours: number
  traditionalHours: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const sizes = {
  sm: { width: 220, fontSize: 28, labelSize: 10, hoursSize: 13, stroke: 14 },
  md: { width: 300, fontSize: 38, labelSize: 12, hoursSize: 15, stroke: 16 },
  lg: { width: 340, fontSize: 48, labelSize: 14, hoursSize: 17, stroke: 18 },
}

const START_DEG = 135
const SWEEP_DEG = 270
const MAX_X = 10

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polarToXY(cx, cy, r, end)
  const e = polarToXY(cx, cy, r, start)
  const large = end - start > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`
}

export function SpeedGauge({ shiftHours, traditionalHours, size = 'md', animated = true }: SpeedGaugeProps) {
  const [angle, setAngle] = useState(START_DEG)
  const cfg = sizes[size]
  const cx = cfg.width / 2
  const cy = cfg.width / 2
  const r = cfg.width / 2 - cfg.stroke - 16

  const multiplier = shiftHours > 0 ? traditionalHours / shiftHours : 1
  const clamped = Math.min(Math.max(multiplier, 1), MAX_X)
  const targetDeg = START_DEG + ((clamped - 1) / (MAX_X - 1)) * SWEEP_DEG
  const savings = traditionalHours > 0
    ? Math.round(((traditionalHours - shiftHours) / traditionalHours) * 100)
    : 0

  useEffect(() => {
    if (animated) {
      const t = setTimeout(() => setAngle(targetDeg), 200)
      return () => clearTimeout(t)
    }
    setAngle(targetDeg)
  }, [targetDeg, animated])

  // Build tick marks
  const ticks = Array.from({ length: 19 }, (_, i) => {
    const deg = START_DEG + (i / 18) * SWEEP_DEG
    const major = i % 3 === 0
    const outer = polarToXY(cx, cy, r + cfg.stroke / 2 + 4, deg)
    const inner = polarToXY(cx, cy, r + cfg.stroke / 2 + (major ? 14 : 8), deg)
    return (
      <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
        stroke={major ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'}
        strokeWidth={major ? 1.5 : 1} />
    )
  })

  // Scale labels at key positions
  const labels = [1, 3, 5, 7, 10].map((val) => {
    const deg = START_DEG + ((val - 1) / (MAX_X - 1)) * SWEEP_DEG
    const pos = polarToXY(cx, cy, r + cfg.stroke / 2 + 24, deg)
    return (
      <text key={val} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.3)" fontSize={9} fontWeight={500}>
        {val}x
      </text>
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: cfg.width, height: cfg.width * 0.7 }}>
        <svg width={cfg.width} height={cfg.width * 0.7}
          viewBox={`0 ${cfg.width * 0.08} ${cfg.width} ${cfg.width * 0.7}`}>
          <defs>
            <linearGradient id="gaugeArc" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#FF6B6B" />
              <stop offset="35%" stopColor="#FF00AA" />
              <stop offset="65%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#BFFF00" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" />
              <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Background track */}
          <path d={arcPath(cx, cy, r, START_DEG, START_DEG + SWEEP_DEG)}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={cfg.stroke} strokeLinecap="round" />

          {/* Gradient arc */}
          <path d={arcPath(cx, cy, r, START_DEG, START_DEG + SWEEP_DEG)}
            fill="none" stroke="url(#gaugeArc)" strokeWidth={cfg.stroke} strokeLinecap="round"
            opacity={0.85} filter="url(#glow)" />

          {ticks}
          {labels}

          {/* Needle - drawn pointing UP from center, rotated via CSS */}
          <g style={{
            transformOrigin: `${cx}px ${cy}px`,
            transform: `rotate(${angle}deg)`,
            transition: animated ? 'transform 1.8s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
          }}>
            {/* Needle body - points from center upward (to 12 o'clock = -90deg in SVG space) */}
            <line x1={cx} y1={cy} x2={cx} y2={cy - r + 20}
              stroke="#FAFAFA" strokeWidth={2.5} strokeLinecap="round" filter="url(#glow)" />
            {/* Needle tip dot */}
            <circle cx={cx} cy={cy - r + 20} r={3} fill="#00F0FF" filter="url(#glow)" />
          </g>

          {/* Center hub */}
          <circle cx={cx} cy={cy} r={10} fill="#0A0A0A" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} />
          <circle cx={cx} cy={cy} r={4} fill="#00F0FF" />
        </svg>

        {/* Center multiplier text */}
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '10%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: cfg.fontSize,
            fontWeight: 800,
            color: '#FAFAFA',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            textShadow: '0 0 24px rgba(0, 240, 255, 0.4)',
            lineHeight: 1,
          }}>
            {clamped.toFixed(1)}x
          </div>
          <div style={{
            fontSize: cfg.labelSize,
            fontWeight: 600,
            color: '#00F0FF',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginTop: 2,
          }}>
            Faster
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 32,
        padding: '12px 24px',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: cfg.hoursSize + 2, fontWeight: 700, color: '#00F0FF' }}>{shiftHours}h</div>
          <div style={{ fontSize: cfg.hoursSize - 3, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Shift</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: cfg.hoursSize + 2, fontWeight: 700, color: '#FF6B6B' }}>{traditionalHours}h</div>
          <div style={{ fontSize: cfg.hoursSize - 3, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Traditional</div>
        </div>
        {savings > 0 && (
          <>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: cfg.hoursSize + 2, fontWeight: 700, color: '#BFFF00' }}>{savings}%</div>
              <div style={{ fontSize: cfg.hoursSize - 3, color: '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Saved</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
