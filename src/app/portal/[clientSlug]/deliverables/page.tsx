'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { StatusPill } from '@/components/dashboard'
import {
  getProjectBySlug,
  getProjectDeliverables,
  approveDeliverable,
  CLIENT_SLUG_MAP,
} from '@/lib/portal-utils'
import type { Deliverable, DeliverableStatus } from '@/lib/database.types'

const typeIcons: Record<string, string> = {
  design: '🎨',
  document: '📄',
  prototype: '🔗',
  code: '💻',
  image: '🖼️',
  video: '🎬',
}

const typeColors: Record<string, string> = {
  design: '#FF00AA',
  document: '#00F0FF',
  prototype: '#BFFF00',
  code: '#FFAA00',
  image: '#FF6B6B',
  video: '#9B59B6',
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

type StatusPillStatus = 'backlog' | 'active' | 'review' | 'shipped' | 'pending' | 'approved' | 'rejected' | 'draft' | 'implemented' | 'on_hold' | 'completed' | 'cancelled'

function getStatusForPill(status: DeliverableStatus): StatusPillStatus {
  if (status === 'in_review') return 'review'
  if (status === 'uploaded') return 'pending'
  return status as StatusPillStatus
}

export default function DeliverablesPage() {
  const params = useParams()
  const clientSlug = params.clientSlug as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const config = CLIENT_SLUG_MAP[clientSlug] || {
    primaryColor: '#00F0FF',
    accentColor: '#BFFF00',
  }

  useEffect(() => {
    loadData()
  }, [clientSlug])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      const projectData = await getProjectBySlug(clientSlug)
      if (!projectData) {
        setError('Project not found')
        setLoading(false)
        return
      }

      setProjectId(projectData.project.id)

      const items = await getProjectDeliverables(projectData.project.id)
      setDeliverables(items)
    } catch (err) {
      console.error('Error loading deliverables:', err)
      setError('Failed to load deliverables')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(deliverableId: string) {
    if (!projectId) return

    setApprovingId(deliverableId)
    try {
      const success = await approveDeliverable(deliverableId, 'Client')
      if (success) {
        await loadData()
      }
    } catch (err) {
      console.error('Error approving deliverable:', err)
    } finally {
      setApprovingId(null)
    }
  }

  const filteredDeliverables = deliverables.filter((d) => {
    if (filter === 'all') return true
    if (filter === 'pending') return d.status === 'in_review' || d.status === 'pending'
    if (filter === 'approved') return d.status === 'approved'
    return true
  })

  const pendingCount = deliverables.filter(d => d.status === 'in_review' || d.status === 'pending').length

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: config.primaryColor,
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ color: '#888', fontSize: 14 }}>Loading deliverables...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: '#FAFAFA', fontSize: 20, marginBottom: 8 }}>{error}</h2>
        <Link
          href={`/portal/${clientSlug}`}
          style={{ color: config.primaryColor, textDecoration: 'none', fontSize: 14 }}
        >
          Return to dashboard
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              color: '#FAFAFA',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            Deliverables
          </h1>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
            Review and approve project deliverables
          </p>
        </div>

        {pendingCount > 0 && (
          <div
            style={{
              padding: '12px 20px',
              background: 'rgba(255, 0, 170, 0.1)',
              border: '1px solid rgba(255, 0, 170, 0.3)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20 }}>👀</span>
            <span style={{ color: '#FF00AA', fontSize: 14, fontWeight: 600 }}>
              {pendingCount} awaiting your review
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 24,
        }}
      >
        {(['all', 'pending', 'approved'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 16px',
              background: filter === f ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
              border: filter === f ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              color: filter === f ? '#00F0FF' : '#888',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              textTransform: 'capitalize',
            }}
          >
            {f === 'pending' ? 'Needs Review' : f}
          </button>
        ))}
      </div>

      {/* Deliverables Grid */}
      {filteredDeliverables.length === 0 ? (
        <div
          style={{
            padding: 60,
            textAlign: 'center',
            color: '#666',
          }}
        >
          <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📭</span>
          <p style={{ fontSize: 15 }}>
            {deliverables.length === 0
              ? 'No deliverables yet'
              : 'No deliverables found for this filter'}
          </p>
          {deliverables.length === 0 && (
            <p style={{ fontSize: 13, color: '#555' }}>
              Deliverables will appear here as we complete work on your project.
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {filteredDeliverables.map((deliverable) => {
            const typeColor = typeColors[deliverable.type] || '#888'
            const typeIcon = typeIcons[deliverable.type] || '📁'

            return (
              <div
                key={deliverable.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: deliverable.status === 'in_review'
                    ? '1px solid rgba(255, 0, 170, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 16,
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Thumbnail / Icon Area */}
                <div
                  style={{
                    height: 140,
                    background: deliverable.thumbnail_url
                      ? `url(${deliverable.thumbnail_url}) center/cover`
                      : `linear-gradient(135deg, ${typeColor}22, ${typeColor}11)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  {!deliverable.thumbnail_url && (
                    <span style={{ fontSize: 48 }}>{typeIcon}</span>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 600,
                        color: '#FAFAFA',
                      }}
                    >
                      {deliverable.name}
                    </h3>
                    <StatusPill
                      status={getStatusForPill(deliverable.status)}
                      size="sm"
                    />
                  </div>

                  {deliverable.description && (
                    <p
                      style={{
                        margin: '0 0 16px',
                        fontSize: 13,
                        color: '#888',
                        lineHeight: 1.5,
                      }}
                    >
                      {deliverable.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 12,
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#666' }}>
                      v{deliverable.version} • {formatDate(deliverable.uploaded_at)}
                    </span>

                    {(deliverable.status === 'in_review' || deliverable.status === 'pending') && (
                      <button
                        onClick={() => handleApprove(deliverable.id)}
                        disabled={approvingId === deliverable.id}
                        style={{
                          padding: '6px 14px',
                          background: approvingId === deliverable.id
                            ? 'rgba(0, 240, 255, 0.3)'
                            : 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                          border: 'none',
                          borderRadius: 6,
                          color: '#0A0A0A',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: approvingId === deliverable.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {approvingId === deliverable.id ? 'Approving...' : 'Approve →'}
                      </button>
                    )}

                    {deliverable.status === 'approved' && deliverable.url && (
                      <a
                        href={deliverable.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 14px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: 'none',
                          borderRadius: 6,
                          color: '#888',
                          fontSize: 11,
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
