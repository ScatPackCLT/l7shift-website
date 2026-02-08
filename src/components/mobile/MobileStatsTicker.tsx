'use client'

import { useState, useEffect } from 'react'
import { useCountUp } from '@/hooks/useCountUp'

interface Stats {
  hoursSaved: number
  multiplier: number
}

export function MobileStatsTicker() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/metrics/public')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats({ hoursSaved: 0, multiplier: 1 }))
  }, [])

  const { count: hoursSaved, ref: hoursRef } = useCountUp({
    end: stats?.hoursSaved || 0,
    duration: 2500,
    startOnView: true,
  })

  const { count: multiplier, ref: multiRef } = useCountUp({
    end: stats?.multiplier || 0,
    duration: 2000,
    decimals: 1,
    startOnView: true,
  })

  return (
    <section
      ref={hoursRef}
      style={{
        padding: '40px 24px',
        borderTop: '1px solid var(--carbon-gray)',
        borderBottom: '1px solid var(--carbon-gray)',
        background: 'linear-gradient(180deg, rgba(0,240,255,0.03) 0%, rgba(255,0,170,0.03) 100%)',
        textAlign: 'center',
      }}
    >
      {/* Hours Saved */}
      <div style={{ marginBottom: 24 }}>
        <div
          className="number-glow"
          style={{
            fontSize: 'clamp(40px, 10vw, 56px)',
            fontWeight: 800,
            color: '#00F0FF',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            lineHeight: 1,
            textShadow: '0 0 30px rgba(0, 240, 255, 0.5)',
          }}
        >
          {stats ? hoursSaved.toLocaleString() : '---'}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#FAFAFA',
            marginTop: 8,
          }}
        >
          hours saved through{' '}
          <span style={{ color: '#00F0FF', fontWeight: 600 }}>
            The SymbAIotic Shift<sup style={{ fontSize: '60%' }}>&trade;</sup>
          </span>
        </div>
      </div>

      {/* Divider */}
      <div
        ref={multiRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 24,
        }}
      >
        <div style={{ width: 5, height: 5, background: '#FF00AA', transform: 'rotate(45deg)' }} />
        <div style={{ width: 5, height: 5, background: '#BFFF00', transform: 'rotate(45deg)' }} />
        <div style={{ width: 5, height: 5, background: '#00F0FF', transform: 'rotate(45deg)' }} />
      </div>

      {/* Speed Multiplier */}
      <div>
        <div
          className="number-glow"
          style={{
            fontSize: 'clamp(40px, 10vw, 56px)',
            fontWeight: 800,
            color: '#BFFF00',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            lineHeight: 1,
            textShadow: '0 0 30px rgba(191, 255, 0, 0.5)',
          }}
        >
          {stats ? `${multiplier}x` : '---'}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#FAFAFA',
            marginTop: 8,
          }}
        >
          faster than <span style={{ color: '#888' }}>traditional agencies</span>
        </div>
      </div>
    </section>
  )
}
