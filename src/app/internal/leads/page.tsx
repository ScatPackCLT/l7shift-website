'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Lead types (matches Supabase leads table)
type LeadStatus = 'incoming' | 'qualified' | 'contacted' | 'nurturing' | 'converted' | 'disqualified'
type LeadTier = 'SOFTBALL' | 'MEDIUM' | 'HARD' | 'DISQUALIFY' | null

interface Lead {
  id: string
  name: string
  email: string
  company: string | null
  status: LeadStatus
  tier: LeadTier
  source: string | null
  answers: Record<string, unknown> | null
  ai_assessment: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

// Status configuration with L7 Shift brand colors
const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  incoming: { label: 'Incoming', color: '#FFAA00', bgColor: 'rgba(255, 170, 0, 0.15)' },
  qualified: { label: 'Qualified', color: '#BFFF00', bgColor: 'rgba(191, 255, 0, 0.15)' },
  contacted: { label: 'Contacted', color: '#00F0FF', bgColor: 'rgba(0, 240, 255, 0.15)' },
  nurturing: { label: 'Nurturing', color: '#FF00AA', bgColor: 'rgba(255, 0, 170, 0.15)' },
  converted: { label: 'Converted', color: '#BFFF00', bgColor: 'rgba(191, 255, 0, 0.15)' },
  disqualified: { label: 'Disqualified', color: '#888', bgColor: 'rgba(136, 136, 136, 0.15)' },
}

// Tier configuration
const tierConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  SOFTBALL: { label: 'Softball', color: '#BFFF00', bgColor: 'rgba(191, 255, 0, 0.15)', icon: '🎯' },
  MEDIUM: { label: 'Medium', color: '#00F0FF', bgColor: 'rgba(0, 240, 255, 0.15)', icon: '🎾' },
  HARD: { label: 'Hard', color: '#FF00AA', bgColor: 'rgba(255, 0, 170, 0.15)', icon: '🏋️' },
  DISQUALIFY: { label: 'Disqualify', color: '#888', bgColor: 'rgba(136, 136, 136, 0.15)', icon: '❌' },
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatSource(source: string | null): string {
  if (!source) return 'Unknown'
  const sourceMap: Record<string, string> = {
    website: 'Website',
    referral: 'Referral',
    linkedin: 'LinkedIn',
    cold_outreach: 'Cold Outreach',
    organic: 'Organic',
  }
  return sourceMap[source] || source.charAt(0).toUpperCase() + source.slice(1)
}

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | LeadStatus>('all')
  const [tierFilter, setTierFilter] = useState<'all' | LeadTier>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewLeadModal, setShowNewLeadModal] = useState(false)

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    try {
      const res = await fetch('/api/leads')
      const json = await res.json()
      if (json.success && json.data) {
        setLeads(json.data)
      } else {
        console.error('Error fetching leads:', json.error)
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    // Status filter
    if (statusFilter !== 'all' && lead.status !== statusFilter) return false

    // Tier filter
    if (tierFilter !== 'all') {
      if (tierFilter === null && lead.tier !== null) return false
      if (tierFilter !== null && lead.tier !== tierFilter) return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        lead.name.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        (lead.company?.toLowerCase().includes(query) ?? false)
      )
    }
    return true
  })

  // Stats calculation
  const stats = {
    total: leads.length,
    incoming: leads.filter((l) => l.status === 'incoming').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    softballs: leads.filter((l) => l.tier === 'SOFTBALL').length,
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ color: '#888' }}>Loading leads...</div>
      </div>
    )
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
            Leads
          </h1>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
            Manage incoming leads and pipeline
          </p>
        </div>

        <button
          onClick={() => setShowNewLeadModal(true)}
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
          New Lead
        </button>
      </div>

      {/* Stats Row */}
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
            Total Leads
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#FAFAFA' }}>{stats.total}</div>
        </div>

        <div
          style={{
            padding: 20,
            background: 'rgba(255, 170, 0, 0.05)',
            border: '1px solid rgba(255, 170, 0, 0.2)',
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 11, color: '#FFAA00', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Incoming
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#FFAA00' }}>{stats.incoming}</div>
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
            Qualified
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#BFFF00' }}>{stats.qualified}</div>
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
            Softballs
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#BFFF00' }}>
            {stats.softballs}
            <span style={{ fontSize: 16, marginLeft: 4 }}>🎯</span>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        {/* Left side filters */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | LeadStatus)}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                color: '#FAFAFA',
                fontSize: 13,
                cursor: 'pointer',
                minWidth: 140,
              }}
            >
              <option value="all">All Statuses</option>
              <option value="incoming">Incoming</option>
              <option value="qualified">Qualified</option>
              <option value="contacted">Contacted</option>
              <option value="nurturing">Nurturing</option>
              <option value="converted">Converted</option>
              <option value="disqualified">Disqualified</option>
            </select>
          </div>

          {/* Tier Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tier
            </label>
            <select
              value={tierFilter === null ? 'unclassified' : tierFilter || 'all'}
              onChange={(e) => {
                const val = e.target.value
                if (val === 'all') setTierFilter('all')
                else if (val === 'unclassified') setTierFilter(null)
                else setTierFilter(val as LeadTier)
              }}
              style={{
                padding: '8px 12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                color: '#FAFAFA',
                fontSize: 13,
                cursor: 'pointer',
                minWidth: 140,
              }}
            >
              <option value="all">All Tiers</option>
              <option value="SOFTBALL">Softball</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="DISQUALIFY">Disqualify</option>
              <option value="unclassified">Unclassified</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search leads..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6,
            color: '#FAFAFA',
            fontSize: 13,
            width: 250,
          }}
        />
      </div>

      {/* Leads Table */}
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
            gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr',
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
          <span>Name</span>
          <span>Email</span>
          <span>Status</span>
          <span>Tier</span>
          <span>Source</span>
          <span>Created</span>
        </div>

        {/* Rows */}
        {filteredLeads.map((lead) => (
          <Link
            key={lead.id}
            href={`/internal/leads/${lead.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="lead-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr',
                gap: 16,
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
            >
              {/* Name & Company */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>
                  {lead.name}
                </div>
                {lead.company && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {lead.company}
                  </div>
                )}
              </div>

              {/* Email */}
              <div style={{ fontSize: 13, color: '#888' }}>
                {lead.email}
              </div>

              {/* Status Badge */}
              <div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    background: statusConfig[lead.status].bgColor,
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: statusConfig[lead.status].color,
                    border: `1px solid ${statusConfig[lead.status].color}33`,
                  }}
                >
                  {statusConfig[lead.status].label}
                </span>
              </div>

              {/* Tier Badge */}
              <div>
                {lead.tier ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 10px',
                      background: tierConfig[lead.tier].bgColor,
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      color: tierConfig[lead.tier].color,
                      border: `1px solid ${tierConfig[lead.tier].color}33`,
                    }}
                  >
                    <span>{tierConfig[lead.tier].icon}</span>
                    {tierConfig[lead.tier].label}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: '#666' }}>—</span>
                )}
              </div>

              {/* Source */}
              <div style={{ fontSize: 13, color: '#888' }}>
                {formatSource(lead.source)}
              </div>

              {/* Created */}
              <div style={{ fontSize: 13, color: '#888' }}>
                {formatDate(lead.created_at)}
              </div>
            </div>
          </Link>
        ))}

        {/* Empty State */}
        {filteredLeads.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              color: '#666',
            }}
          >
            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📥</span>
            <p style={{ fontSize: 15, margin: 0, color: '#FAFAFA' }}>No leads found</p>
            <p style={{ fontSize: 13, color: '#666', marginTop: 8 }}>
              {leads.length === 0
                ? 'Leads will appear here when they submit the contact form'
                : 'Try adjusting your filters'}
            </p>
            {leads.length === 0 && (
              <button
                onClick={() => setShowNewLeadModal(true)}
                style={{
                  marginTop: 16,
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                  color: '#0A0A0A',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Add Lead Manually
              </button>
            )}
          </div>
        )}
      </div>

      {/* New Lead Modal */}
      {showNewLeadModal && (
        <NewLeadModal
          onClose={() => setShowNewLeadModal(false)}
          onSuccess={() => {
            setShowNewLeadModal(false)
            fetchLeads()
          }}
        />
      )}

      <style jsx>{`
        .lead-row:hover {
          background: rgba(0, 240, 255, 0.03) !important;
        }
      `}</style>
    </div>
  )
}

// New Lead Modal Component
function NewLeadModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [source, setSource] = useState('website')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email) return

    setSaving(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company: company || null, source }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create lead')
      onSuccess()
    } catch (error) {
      console.error('Error creating lead:', error)
      alert('Failed to create lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1A1A1A',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 480,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 24px', fontSize: 20, color: '#FAFAFA' }}>Add Lead</h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#FAFAFA',
                fontSize: 14,
                outline: 'none',
              }}
              placeholder="e.g., John Smith"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#FAFAFA',
                fontSize: 14,
                outline: 'none',
              }}
              placeholder="e.g., john@company.com"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>
              Company
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#FAFAFA',
                fontSize: 14,
                outline: 'none',
              }}
              placeholder="e.g., Acme Corp"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>
              Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                color: '#FAFAFA',
                fontSize: 14,
                outline: 'none',
              }}
            >
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="linkedin">LinkedIn</option>
              <option value="cold_outreach">Cold Outreach</option>
              <option value="organic">Organic</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                color: '#888',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name || !email}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                border: 'none',
                borderRadius: 8,
                color: '#0A0A0A',
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving || !name || !email ? 0.5 : 1,
              }}
            >
              {saving ? 'Creating...' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
