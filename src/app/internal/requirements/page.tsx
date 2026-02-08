'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusPill } from '@/components/dashboard'

type RequirementStatus = 'draft' | 'review' | 'approved' | 'implemented'

interface Requirement {
  id: string
  projectId: string
  projectName: string
  clientName: string
  title: string
  phase: string
  status: RequirementStatus
  version: number
  createdAt: Date
  updatedAt: Date
  sentForReview?: Date
  signedOff: boolean
  signedAt?: Date
  signedBy?: string
  sectionsCount: number
}

// Mock requirements data
const mockRequirements: Requirement[] = [
  {
    id: '1',
    projectId: '1',
    projectName: 'Scat Pack CLT',
    clientName: 'Ken Leftwich',
    title: 'Phase 1: Core Platform Requirements',
    phase: 'Phase 1',
    status: 'review',
    version: 2,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    sentForReview: new Date(Date.now() - 1000 * 60 * 60 * 4),
    signedOff: false,
    sectionsCount: 3,
  },
  {
    id: '2',
    projectId: '1',
    projectName: 'Scat Pack CLT',
    clientName: 'Ken Leftwich',
    title: 'Phase 2: Crew Management Requirements',
    phase: 'Phase 2',
    status: 'draft',
    version: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    signedOff: false,
    sectionsCount: 2,
  },
  {
    id: '3',
    projectId: '1',
    projectName: 'Scat Pack CLT',
    clientName: 'Ken Leftwich',
    title: 'Brand Identity Guidelines',
    phase: 'Design',
    status: 'approved',
    version: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    signedOff: true,
    signedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    signedBy: 'Ken Leftwich',
    sectionsCount: 2,
  },
  {
    id: '4',
    projectId: '2',
    projectName: 'Pretty Paid Closet',
    clientName: 'Jazz',
    title: 'Platform Requirements',
    phase: 'Phase 1',
    status: 'draft',
    version: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    signedOff: false,
    sectionsCount: 4,
  },
  {
    id: '5',
    projectId: '3',
    projectName: 'Stitchwichs',
    clientName: 'Nicole',
    title: 'Shopify Optimization Requirements',
    phase: 'Discovery',
    status: 'draft',
    version: 1,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    signedOff: false,
    sectionsCount: 3,
  },
]

const statusConfig: Record<RequirementStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: '#888', bgColor: 'rgba(136, 136, 136, 0.1)' },
  review: { label: 'Awaiting Signoff', color: '#FF00AA', bgColor: 'rgba(255, 0, 170, 0.1)' },
  approved: { label: 'Approved', color: '#BFFF00', bgColor: 'rgba(191, 255, 0, 0.1)' },
  implemented: { label: 'Implemented', color: '#00F0FF', bgColor: 'rgba(0, 240, 255, 0.1)' },
}

type FilterStatus = 'all' | RequirementStatus

export default function InternalRequirementsPage() {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [showNewModal, setShowNewModal] = useState(false)

  // Get unique projects
  const projects = Array.from(new Set(mockRequirements.map(r => r.projectId))).map(id => {
    const req = mockRequirements.find(r => r.projectId === id)!
    return { id, name: req.projectName }
  })

  const filteredRequirements = mockRequirements.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false
    if (projectFilter !== 'all' && r.projectId !== projectFilter) return false
    return true
  })

  // Stats
  const stats = {
    total: mockRequirements.length,
    draft: mockRequirements.filter(r => r.status === 'draft').length,
    awaitingSignoff: mockRequirements.filter(r => r.status === 'review').length,
    approved: mockRequirements.filter(r => r.status === 'approved' || r.status === 'implemented').length,
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
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
            Requirements Hub
          </h1>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
            Create, manage, and track client signoffs
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          style={{
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
            color: '#0A0A0A',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 18 }}>+</span>
          New Requirement Doc
        </button>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            padding: 20,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Documents
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#FAFAFA' }}>{stats.total}</div>
        </div>

        <div
          style={{
            padding: 20,
            background: 'rgba(136, 136, 136, 0.05)',
            border: '1px solid rgba(136, 136, 136, 0.2)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            In Draft
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#888' }}>{stats.draft}</div>
        </div>

        <div
          style={{
            padding: 20,
            background: 'rgba(255, 0, 170, 0.05)',
            border: '1px solid rgba(255, 0, 170, 0.2)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 11, color: '#FF00AA', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Awaiting Signoff
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#FF00AA' }}>{stats.awaitingSignoff}</div>
        </div>

        <div
          style={{
            padding: 20,
            background: 'rgba(191, 255, 0, 0.05)',
            border: '1px solid rgba(191, 255, 0, 0.2)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 11, color: '#BFFF00', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Approved
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#BFFF00' }}>{stats.approved}</div>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Status Filter */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['all', 'draft', 'review', 'approved', 'implemented'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                background: filter === f ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                border: filter === f ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid transparent',
                borderRadius: 6,
                color: filter === f ? '#00F0FF' : '#888',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {f === 'all' ? 'All' : f === 'review' ? 'Awaiting Signoff' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Project Filter */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6,
            color: '#FAFAFA',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          <option value="all">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Requirements Table */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Header Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
            gap: 16,
            padding: '12px 20px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 11,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span>Document</span>
          <span>Project</span>
          <span>Status</span>
          <span>Last Updated</span>
          <span>Actions</span>
        </div>

        {/* Rows */}
        {filteredRequirements.map((req) => (
          <div
            key={req.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 120px',
              gap: 16,
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              alignItems: 'center',
              transition: 'background 0.2s ease',
            }}
            className="requirement-row"
          >
            {/* Document Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span
                  style={{
                    padding: '2px 8px',
                    background: 'rgba(0, 240, 255, 0.1)',
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#00F0FF',
                  }}
                >
                  {req.phase}
                </span>
                <span style={{ fontSize: 11, color: '#666' }}>v{req.version}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>
                {req.title}
              </div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                {req.sectionsCount} section{req.sectionsCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Project */}
            <div>
              <div style={{ fontSize: 13, color: '#FAFAFA' }}>{req.projectName}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{req.clientName}</div>
            </div>

            {/* Status */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: statusConfig[req.status].bgColor,
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: statusConfig[req.status].color,
                }}
              >
                {req.status === 'approved' && '✓ '}
                {statusConfig[req.status].label}
              </div>
              {req.signedOff && req.signedAt && (
                <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                  by {req.signedBy} on {req.signedAt.toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Last Updated */}
            <div style={{ fontSize: 13, color: '#888' }}>
              {req.updatedAt.toLocaleDateString()}
              <div style={{ fontSize: 10, color: '#666' }}>
                {req.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                href={`/internal/requirements/${req.id}`}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#FAFAFA',
                  fontSize: 11,
                  fontWeight: 500,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                Edit
              </Link>
              {req.status === 'draft' && (
                <button
                  style={{
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                    border: 'none',
                    borderRadius: 6,
                    color: '#0A0A0A',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Send
                </button>
              )}
            </div>
          </div>
        ))}

        {filteredRequirements.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: '#666',
            }}
          >
            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📄</span>
            <p style={{ fontSize: 15, margin: 0 }}>No requirements found</p>
            <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
              Try adjusting your filters or create a new document
            </p>
          </div>
        )}
      </div>

      {/* New Document Modal */}
      {showNewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowNewModal(false)}
        >
          <div
            style={{
              background: '#0A0A0A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 600, color: '#FAFAFA' }}>
              New Requirement Document
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Project Select */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8 }}>
                  Project
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    color: '#FAFAFA',
                    fontSize: 14,
                  }}
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8 }}>
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Phase 1: Core Requirements"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    color: '#FAFAFA',
                    fontSize: 14,
                  }}
                />
              </div>

              {/* Phase */}
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 8 }}>
                  Phase / Category
                </label>
                <input
                  type="text"
                  placeholder="e.g., Phase 1, Design, Discovery"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    color: '#FAFAFA',
                    fontSize: 14,
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  onClick={() => setShowNewModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#888',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#0A0A0A',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .requirement-row:hover {
          background: rgba(0, 240, 255, 0.03) !important;
        }
      `}</style>
    </div>
  )
}
