'use client'

import { useState, useEffect } from 'react'
import { useCountUp } from '@/hooks/useCountUp'

interface Stats {
  hoursSaved: number
  multiplier: number
  projectsCompleted: number
}

export function StatsTickerSection() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/metrics/public')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => setStats({ hoursSaved: 0, multiplier: 1, projectsCompleted: 0 }))
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
        padding: '48px 0',
        borderTop: '1px solid var(--carbon-gray)',
        borderBottom: '1px solid var(--carbon-gray)',
        background: 'linear-gradient(90deg, rgba(0,240,255,0.03) 0%, rgba(255,0,170,0.03) 50%, rgba(191,255,0,0.03) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle scan line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,240,255,0.3), transparent)',
        }}
      />

      <div
        ref={multiRef}
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 60,
          padding: '0 40px',
        }}
      >
        {/* Hours Saved */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span
            className="number-glow"
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#00F0FF',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              lineHeight: 1,
              textShadow: '0 0 30px rgba(0, 240, 255, 0.5)',
            }}
          >
            {stats ? hoursSaved.toLocaleString() : '---'}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: '#FAFAFA',
              lineHeight: 1.4,
            }}
          >
            hours saved through<br />
            <span style={{ color: '#00F0FF', fontWeight: 600 }}>
              The SymbAIotic Shift<sup style={{ fontSize: '60%' }}>&trade;</sup>
            </span>
          </span>
        </div>

        {/* Diamond separator */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, background: '#FF00AA', transform: 'rotate(45deg)' }} />
          <div style={{ width: 6, height: 6, background: '#BFFF00', transform: 'rotate(45deg)' }} />
          <div style={{ width: 6, height: 6, background: '#00F0FF', transform: 'rotate(45deg)' }} />
        </div>

        {/* Speed Multiplier */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span
            className="number-glow"
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#BFFF00',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
              lineHeight: 1,
              textShadow: '0 0 30px rgba(191, 255, 0, 0.5)',
            }}
          >
            {stats ? `${multiplier}x` : '---'}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: '#FAFAFA',
              lineHeight: 1.4,
            }}
          >
            faster than<br />
            <span style={{ color: '#888' }}>traditional agencies</span>
          </span>
        </div>
      </div>

      {/* Bottom scan line */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(191,255,0,0.3), transparent)',
        }}
      />
    </section>
  )
}
