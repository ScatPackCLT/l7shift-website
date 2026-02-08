'use client'

import { useState, useEffect } from 'react'

interface Stats {
  hoursSaved: number
  multiplier: number
  projectsCompleted: number
  totalShiftHours: number
  totalTraditionalHours: number
}

export function TimeTracker() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/metrics/public')
      .then(res => res.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!stats || stats.hoursSaved === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        background: 'rgba(10, 10, 10, 0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          fontSize: 13,
        }}
      >
        <span style={{ color: '#888', fontWeight: 500 }}>
          The SymbAIotic Shift<sup style={{ fontSize: '60%' }}>&trade;</sup>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#00F0FF', fontWeight: 700, fontSize: 15 }}>
            {stats.hoursSaved.toLocaleString()}
          </span>
          <span style={{ color: '#888' }}>hours saved</span>
        </div>

        <div style={{
          width: 4, height: 4,
          background: '#FF00AA',
          transform: 'rotate(45deg)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#BFFF00', fontWeight: 700, fontSize: 15 }}>
            {stats.multiplier}x
          </span>
          <span style={{ color: '#888' }}>faster</span>
        </div>

        <div style={{
          width: 4, height: 4,
          background: '#00F0FF',
          transform: 'rotate(45deg)',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#FAFAFA', fontWeight: 700, fontSize: 15 }}>
            {stats.projectsCompleted}
          </span>
          <span style={{ color: '#888' }}>projects</span>
        </div>
      </div>
    </div>
  )
}
