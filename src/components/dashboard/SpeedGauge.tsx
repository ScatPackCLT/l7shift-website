'use client'

import { useEffect, useState } from 'react'

interface SpeedGaugeProps {
  shiftHours: number
  traditionalHours: number
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const sizes = {
  sm: { width: 200, multiplierFont: 32, labelFont: 11, hoursFont: 12, strokeWidth: 12, needleLen: 60 },
  md: { width: 280, multiplierFont: 40, labelFont: 13, hoursFont: 14, strokeWidth: 14, needleLen: 85 },
  lg: { width: 360, multiplierFont: 52, labelFont: 15, hoursFont: 16, strokeWidth: 16, needleLen: 110 },
}

const START_ANGLE = 135
const END_ANGLE = 405
const ARC_DEGREES = 270
const MAX_MULTIPLIER = 10

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x},${start.y} A ${r},${r} 0 ${largeArc} 0 ${end.x},${end.y}`
}

export function SpeedGauge({
  shiftHours,
  traditionalHours,
  size = 'md',
  animated = true,
}: SpeedGaugeProps) {
  const [needleAngle, setNeedleAngle] = useState(START_ANGLE)
  const config = sizes[size]
  const cx = config.width / 2
  const cy = config.width / 2
  const radius = (config.width - config.strokeWidth * 2) / 2 - 10

  const multiplier = shiftHours > 0
    ? traditionalHours / shiftHours
    : traditionalHours > 0 ? traditionalHours : 1
  const clampedMultiplier = Math.min(Math.max(multiplier, 1), MAX_MULTIPLIER)
  const displayMultiplier = clampedMultiplier.toFixed(1)

  const targetAngle = START_ANGLE + ((clampedMultiplier - 1) / (MAX_MULTIPLIER - 1)) * ARC_DEGREES

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setNeedleAngle(targetAngle), 150)
      return () => clearTimeout(timer)
    } else {
      setNeedleAngle(targetAngle)
    }
  }, [targetAngle, animated])

  // Tick marks
  const ticks = []
  for (let i = 0; i <= 10; i++) {
    const angle = START_ANGLE + (i / 10) * ARC_DEGREES
    const outerPoint = polarToCartesian(cx, cy, radius + config.strokeWidth / 2 + 2, angle)
    const innerPoint = polarToCartesian(cx, cy, radius + config.strokeWidth / 2 + (i % 5 === 0 ? 12 : 7), angle)
    const isMajor = i % 5 === 0
    ticks.push(
      <line
        key={i}
        x1={outerPoint.x} y1={outerPoint.y}
        x2={innerPoint.x} y2={innerPoint.y}
        stroke={isMajor ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}
        strokeWidth={isMajor ? 2 : 1}
      />
    )
  }

  // Needle endpoint
  const needleTip = polarToCartesian(cx, cy, radius - 15, needleAngle)
  const needleBase1 = polarToCartesian(cx, cy, 6, needleAngle + 90)
  const needleBase2 = polarToCartesian(cx, cy, 6, needleAngle - 90)

  const savings = traditionalHours > 0
    ? Math.round(((traditionalHours - shiftHours) / traditionalHours) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <div style={{ position: 'relative', width: config.width, height: config.width * 0.75 }}>
        <svg
          width={config.width}
          height={config.width * 0.75}
          viewBox={`0 0 ${config.width} ${config.width * 0.85}`}
        >
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
              <stop offset="40%" stopColor="#FF00AA" />
              <stop offset="70%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#BFFF00" />
            </linearGradient>
            <filter id="needleGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="arcGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={describeArc(cx, cy, radius, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
          />

          {/* Colored arc */}
          <path
            d={describeArc(cx, cy, radius, START_ANGLE, END_ANGLE)}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            filter="url(#arcGlow)"
            opacity={0.9}
          />

          {/* Tick marks */}
          {ticks}

          {/* Needle */}
          <g
            style={{
              transition: animated ? 'all 1.5s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
            }}
            filter="url(#needleGlow)"
          >
            <polygon
              points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
              fill="#00F0FF"
            />
          </g>

          {/* Center hub */}
          <circle cx={cx} cy={cy} r={8} fill="#0A0A0A" stroke="#00F0FF" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={3} fill="#00F0FF" />
        </svg>

        {/* Center text overlay */}
        <div
          style={{
            position: 'absolute',
            top: '48%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: config.multiplierFont,
              fontWeight: 800,
              color: '#FAFAFA',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              textShadow: '0 0 30px rgba(0, 240, 255, 0.5)',
              lineHeight: 1,
            }}
          >
            {displayMultiplier}x
          </div>
          <div
            style={{
              fontSize: config.labelFont,
              fontWeight: 600,
              color: '#00F0FF',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              marginTop: 4,
            }}
          >
            Faster
          </div>
        </div>
      </div>

      {/* Bottom stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 40,
          marginTop: 8,
          width: '100%',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: config.hoursFont + 4, fontWeight: 700, color: '#00F0FF' }}>
            {shiftHours}h
          </div>
          <div style={{ fontSize: config.hoursFont - 2, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Shift
          </div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: config.hoursFont + 4, fontWeight: 700, color: '#FF6B6B' }}>
            {traditionalHours}h
          </div>
          <div style={{ fontSize: config.hoursFont - 2, color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Traditional
          </div>
        </div>
      </div>

      {/* Savings callout */}
      {savings > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 16,
            padding: '10px 20px',
            background: 'rgba(191, 255, 0, 0.1)',
            border: '1px solid rgba(191, 255, 0, 0.3)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ fontSize: config.hoursFont, fontWeight: 700, color: '#BFFF00' }}>
            {savings}% faster
          </span>
          <span style={{ fontSize: config.hoursFont - 2, color: '#BFFF00' }}>
            with The SymbAIotic Method
          </span>
        </div>
      )}
    </div>
  )
}
