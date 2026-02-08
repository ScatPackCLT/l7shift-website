'use client'

interface ActivityItem {
  id: string
  type: 'task_created' | 'task_shipped' | 'task_updated' | 'deliverable_uploaded' | 'deliverable_approved' | 'feedback_added' | 'feedback_received' | 'requirement_created' | 'requirement_approved' | 'milestone_reached' | 'project_update' | 'comment_added'
  title: string
  description?: string
  actor: string
  actorType: 'internal' | 'client' | 'system'
  timestamp: Date | string
  metadata?: Record<string, unknown>
}

interface ActivityFeedProps {
  items: ActivityItem[]
  maxItems?: number
  showTimestamps?: boolean
  compact?: boolean
}

const activityConfig: Record<ActivityItem['type'], { icon: string; color: string; verb: string }> = {
  task_created: { icon: '\u2795', color: '#00F0FF', verb: 'created' },
  task_shipped: { icon: '\uD83D\uDE80', color: '#BFFF00', verb: 'shipped' },
  task_updated: { icon: '\u270F\uFE0F', color: '#888', verb: 'updated' },
  deliverable_uploaded: { icon: '\uD83D\uDCC1', color: '#FF00AA', verb: 'uploaded' },
  deliverable_approved: { icon: '\u2705', color: '#BFFF00', verb: 'approved' },
  feedback_added: { icon: '\uD83D\uDCAC', color: '#FFAA00', verb: 'commented on' },
  feedback_received: { icon: '\uD83D\uDCAC', color: '#FFAA00', verb: 'received feedback on' },
  requirement_created: { icon: '\uD83D\uDCDD', color: '#00F0FF', verb: 'created' },
  requirement_approved: { icon: '\u2705', color: '#BFFF00', verb: 'approved' },
  milestone_reached: { icon: '\uD83C\uDFC6', color: '#BFFF00', verb: 'reached' },
  project_update: { icon: '\uD83D\uDCE2', color: '#00F0FF', verb: 'updated' },
  comment_added: { icon: '\uD83D\uDCAC', color: '#00F0FF', verb: 'commented on' },
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return then.toLocaleDateString()
}

export function ActivityFeed({
  items,
  maxItems = 10,
  showTimestamps = true,
  compact = false,
}: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems)

  if (displayItems.length === 0) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: '#666',
          fontSize: 14,
        }}
      >
        No recent activity
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 8 : 12,
      }}
    >
      {displayItems.map((item, index) => {
        const config = activityConfig[item.type]

        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: compact ? 8 : 12,
              background: index === 0 ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
              borderRadius: 8,
              borderLeft: index === 0 ? `2px solid ${config.color}` : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: compact ? 28 : 36,
                height: compact ? 28 : 36,
                borderRadius: '50%',
                background: `${config.color}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: compact ? 14 : 16,
                flexShrink: 0,
              }}
            >
              {config.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Title line */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 4,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: compact ? 12 : 13,
                    color: '#FAFAFA',
                    fontWeight: 500,
                  }}
                >
                  {item.actor}
                </span>
                <span
                  style={{
                    fontSize: compact ? 12 : 13,
                    color: '#888',
                  }}
                >
                  {config.verb}
                </span>
                <span
                  style={{
                    fontSize: compact ? 12 : 13,
                    color: config.color,
                    fontWeight: 500,
                  }}
                >
                  {item.title}
                </span>
              </div>

              {/* Description */}
              {!compact && item.description && (
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 12,
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.description}
                </p>
              )}

              {/* Timestamp */}
              {showTimestamps && (
                <span
                  style={{
                    fontSize: 11,
                    color: '#555',
                    marginTop: 2,
                    display: 'block',
                  }}
                >
                  {formatRelativeTime(item.timestamp)}
                </span>
              )}
            </div>
          </div>
        )
      })}

      {items.length > maxItems && (
        <button
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 6,
            color: '#888',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#00F0FF'
            e.currentTarget.style.color = '#00F0FF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
            e.currentTarget.style.color = '#888'
          }}
        >
          View all activity ({items.length - maxItems} more)
        </button>
      )}
    </div>
  )
}
