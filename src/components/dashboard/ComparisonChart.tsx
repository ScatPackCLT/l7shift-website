'use client'

interface ComparisonChartProps {
  shiftHours: number
  traditionalHours: number
  showSavings?: boolean
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
}

const sizes = {
  sm: { barHeight: 16, fontSize: 11, gap: 6 },
  md: { barHeight: 24, fontSize: 13, gap: 8 },
  lg: { barHeight: 32, fontSize: 15, gap: 10 },
}

export function ComparisonChart({
  shiftHours,
  traditionalHours,
  showSavings = true,
  size = 'md',
  animated = true,
}: ComparisonChartProps) {
  const sizeConfig = sizes[size]
  const maxHours = Math.max(shiftHours, traditionalHours, 1)
  const claudePercent = (shiftHours / maxHours) * 100
  const traditionalPercent = (traditionalHours / maxHours) * 100
  const savings = traditionalHours > 0
    ? Math.round(((traditionalHours - shiftHours) / traditionalHours) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: sizeConfig.gap, width: '100%' }}>
      {/* Claude Hours */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
            fontSize: sizeConfig.fontSize,
          }}
        >
          <span style={{ color: '#00F0FF', fontWeight: 500 }}>Shift Hours</span>
          <span style={{ color: '#FAFAFA', fontWeight: 700 }}>{shiftHours}h</span>
        </div>
        <div
          style={{
            height: sizeConfig.barHeight,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: sizeConfig.barHeight / 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: animated ? `${claudePercent}%` : '0%',
              background: 'linear-gradient(90deg, #00F0FF 0%, #00A0FF 100%)',
              borderRadius: sizeConfig.barHeight / 2,
              transition: animated ? 'width 1s ease-out' : 'none',
              boxShadow: '0 0 12px rgba(0, 240, 255, 0.4)',
            }}
          />
        </div>
      </div>

      {/* Traditional Hours */}
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 4,
            fontSize: sizeConfig.fontSize,
          }}
        >
          <span style={{ color: '#FF6B6B', fontWeight: 500 }}>Traditional Estimate</span>
          <span style={{ color: '#FF6B6B', fontWeight: 700 }}>{traditionalHours}h</span>
        </div>
        <div
          style={{
            height: sizeConfig.barHeight,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: sizeConfig.barHeight / 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: animated ? `${traditionalPercent}%` : '0%',
              background: 'linear-gradient(90deg, #FF6B6B 0%, #FF4444 100%)',
              borderRadius: sizeConfig.barHeight / 2,
              transition: animated ? 'width 1s ease-out 0.3s' : 'none',
              boxShadow: '0 0 12px rgba(255, 68, 68, 0.4)',
            }}
          />
        </div>
      </div>

      {/* Savings callout */}
      {showSavings && savings > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 8,
            padding: '12px 16px',
            background: 'rgba(191, 255, 0, 0.1)',
            border: '1px solid rgba(191, 255, 0, 0.3)',
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <span
              style={{
                fontSize: sizeConfig.fontSize + 4,
                fontWeight: 700,
                color: '#BFFF00',
              }}
            >
              {savings}%
            </span>
            <span
              style={{
                fontSize: sizeConfig.fontSize,
                color: '#BFFF00',
                marginLeft: 6,
              }}
            >
              faster with The SymbAIotic Method
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
