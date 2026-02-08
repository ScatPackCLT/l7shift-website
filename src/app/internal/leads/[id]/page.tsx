'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  ai_assessment: AIAssessment | null
  created_at: string
  updated_at: string
}

interface AIAssessment {
  tier: string
  confidence: number
  reasoning: string
  flags?: string[]
  recommended_action?: string
  score_breakdown?: Record<string, number>
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
const tierConfig: Record<string, { label: string; color: string; bgColor: string; icon: string; description: string }> = {
  SOFTBALL: { label: 'Softball', color: '#BFFF00', bgColor: 'rgba(191, 255, 0, 0.15)', icon: '🎯', description: 'High-intent, qualified lead. Fast-track to call.' },
  MEDIUM: { label: 'Medium', color: '#00F0FF', bgColor: 'rgba(0, 240, 255, 0.15)', icon: '🎾', description: 'Potential fit. Needs nurturing with case studies.' },
  HARD: { label: 'Hard', color: '#FF00AA', bgColor: 'rgba(255, 0, 170, 0.15)', icon: '🏋️', description: 'Complex requirements or budget constraints.' },
  DISQUALIFY: { label: 'Disqualify', color: '#888', bgColor: 'rgba(136, 136, 136, 0.15)', icon: '❌', description: 'Not a fit. Send polite decline.' },
}

const allStatuses: LeadStatus[] = ['incoming', 'qualified', 'contacted', 'nurturing', 'converted', 'disqualified']
const allTiers: LeadTier[] = ['SOFTBALL', 'MEDIUM', 'HARD', 'DISQUALIFY']

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatSource(source: string | null): string {
  if (!source) return 'Unknown'
  const sourceMap: Record<string, string> = {
    website: 'Website Contact Form',
    referral: 'Referral',
    linkedin: 'LinkedIn',
    cold_outreach: 'Cold Outreach',
    organic: 'Organic Search',
  }
  return sourceMap[source] || source.charAt(0).toUpperCase() + source.slice(1)
}

function formatAnswerKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingStatus, setEditingStatus] = useState(false)
  const [editingTier, setEditingTier] = useState(false)

  useEffect(() => {
    if (leadId) {
      fetchLead()
    }
  }, [leadId])

  async function fetchLead() {
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      const json = await res.json()
      if (json.success && json.data) {
        setLead(json.data)
      } else {
        console.error('Error fetching lead:', json.error)
      }
    } catch (error) {
      console.error('Error fetching lead:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateLead(updates: Partial<Lead>) {
    if (!lead) return

    setSaving(true)

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update lead')
      setLead({ ...lead, ...updates })
      setEditingStatus(false)
      setEditingTier(false)
    } catch (error) {
      console.error('Error updating lead:', error)
      alert('Failed to update lead')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ color: '#888' }}>Loading lead...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: '#FAFAFA', margin: '0 0 8px' }}>Lead Not Found</h2>
        <p style={{ color: '#888', marginBottom: 24 }}>This lead may have been deleted or doesn't exist.</p>
        <Link
          href="/internal/leads"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
            color: '#0A0A0A',
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to Leads
        </Link>
      </div>
    )
  }

  const assessment = lead.ai_assessment as AIAssessment | null

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Back Link */}
      <Link
        href="/internal/leads"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: '#888',
          textDecoration: 'none',
          fontSize: 14,
          marginBottom: 24,
        }}
      >
        <span>←</span> Back to Leads
      </Link>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 32,
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              color: '#FAFAFA',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
            }}
          >
            {lead.name}
          </h1>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
            {lead.company || 'No company'} • {lead.email}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <a
            href={`mailto:${lead.email}`}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid rgba(0, 240, 255, 0.5)',
              color: '#00F0FF',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ✉️ Email
          </a>
        </div>
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: 24,
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Status & Tier Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Status Card */}
            <div
              style={{
                padding: 24,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 11, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status
              </div>
              {editingStatus ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allStatuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => updateLead({ status })}
                      disabled={saving}
                      style={{
                        padding: '10px 16px',
                        background: lead.status === status ? statusConfig[status].bgColor : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${lead.status === status ? statusConfig[status].color : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: 8,
                        color: lead.status === status ? statusConfig[status].color : '#888',
                        fontSize: 13,
                        fontWeight: lead.status === status ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {statusConfig[status].label}
                    </button>
                  ))}
                  <button
                    onClick={() => setEditingStatus(false)}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#666',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setEditingStatus(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '8px 16px',
                      background: statusConfig[lead.status].bgColor,
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: statusConfig[lead.status].color,
                      border: `1px solid ${statusConfig[lead.status].color}33`,
                    }}
                  >
                    {statusConfig[lead.status].label}
                  </span>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>Click to change</div>
                </div>
              )}
            </div>

            {/* Tier Card */}
            <div
              style={{
                padding: 24,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
              }}
            >
              <div style={{ fontSize: 11, color: '#888', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Classification Tier
              </div>
              {editingTier ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {allTiers.map((tier) => (
                    <button
                      key={tier}
                      onClick={() => updateLead({ tier })}
                      disabled={saving}
                      style={{
                        padding: '10px 16px',
                        background: lead.tier === tier ? tierConfig[tier!].bgColor : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${lead.tier === tier ? tierConfig[tier!].color : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: 8,
                        color: lead.tier === tier ? tierConfig[tier!].color : '#888',
                        fontSize: 13,
                        fontWeight: lead.tier === tier ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <span>{tierConfig[tier!].icon}</span>
                      {tierConfig[tier!].label}
                    </button>
                  ))}
                  <button
                    onClick={() => setEditingTier(false)}
                    style={{
                      padding: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#666',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setEditingTier(true)}
                  style={{ cursor: 'pointer' }}
                >
                  {lead.tier ? (
                    <>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 16px',
                          background: tierConfig[lead.tier].bgColor,
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 600,
                          color: tierConfig[lead.tier].color,
                          border: `1px solid ${tierConfig[lead.tier].color}33`,
                        }}
                      >
                        <span>{tierConfig[lead.tier].icon}</span>
                        {tierConfig[lead.tier].label}
                      </span>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                        {tierConfig[lead.tier].description}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: '#666', fontSize: 14 }}>Not classified yet</span>
                  )}
                  <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>Click to change</div>
                </div>
              )}
            </div>
          </div>

          {/* AI Assessment */}
          {assessment && (
            <div
              style={{
                padding: 24,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <h3 style={{ margin: 0, fontSize: 16, color: '#FAFAFA' }}>AI Assessment</h3>
                {assessment.confidence && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      padding: '4px 10px',
                      background: 'rgba(0, 240, 255, 0.1)',
                      borderRadius: 4,
                      fontSize: 12,
                      color: '#00F0FF',
                    }}
                  >
                    {assessment.confidence}% confidence
                  </span>
                )}
              </div>

              {/* Reasoning */}
              {assessment.reasoning && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Reasoning</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#FAFAFA', lineHeight: 1.6 }}>
                    {assessment.reasoning}
                  </p>
                </div>
              )}

              {/* Recommended Action */}
              {assessment.recommended_action && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Recommended Action</div>
                  <p style={{ margin: 0, fontSize: 14, color: '#BFFF00', fontWeight: 500 }}>
                    {assessment.recommended_action}
                  </p>
                </div>
              )}

              {/* Flags */}
              {assessment.flags && assessment.flags.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Flags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {assessment.flags.map((flag, i) => (
                      <span
                        key={i}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(255, 0, 170, 0.1)',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#FF00AA',
                        }}
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Score Breakdown */}
              {assessment.score_breakdown && Object.keys(assessment.score_breakdown).length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>Score Breakdown</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {Object.entries(assessment.score_breakdown).map(([key, value]) => (
                      <div key={key}>
                        <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{formatAnswerKey(key)}</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: '#FAFAFA' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Questionnaire Answers */}
          {lead.answers && Object.keys(lead.answers).length > 0 && (
            <div
              style={{
                padding: 24,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#FAFAFA' }}>
                📋 Questionnaire Responses
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(lead.answers).map(([key, value]) => (
                  <div key={key}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
                      {formatAnswerKey(key)}
                    </div>
                    <div style={{ fontSize: 14, color: '#FAFAFA' }}>
                      {formatAnswerValue(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Info Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Contact Info */}
          <div
            style={{
              padding: 24,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#FAFAFA' }}>Contact Information</h3>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Email</div>
              <a
                href={`mailto:${lead.email}`}
                style={{ fontSize: 14, color: '#00F0FF', textDecoration: 'none' }}
              >
                {lead.email}
              </a>
            </div>

            {lead.company && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Company</div>
                <div style={{ fontSize: 14, color: '#FAFAFA' }}>{lead.company}</div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Source</div>
              <div style={{ fontSize: 14, color: '#FAFAFA' }}>{formatSource(lead.source)}</div>
            </div>
          </div>

          {/* Timeline */}
          <div
            style={{
              padding: 24,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#FAFAFA' }}>Timeline</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#00F0FF',
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div>
                  <div style={{ fontSize: 13, color: '#FAFAFA' }}>Lead Created</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                    {formatDate(lead.created_at)}
                  </div>
                </div>
              </div>

              {lead.updated_at !== lead.created_at && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#888',
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: '#FAFAFA' }}>Last Updated</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {formatDate(lead.updated_at)}
                    </div>
                  </div>
                </div>
              )}

              {assessment && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#BFFF00',
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: '#FAFAFA' }}>AI Classification</div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      Classified as {assessment.tier}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              padding: 24,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#FAFAFA' }}>Quick Actions</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href={`mailto:${lead.email}?subject=Following up on your inquiry`}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: 8,
                  color: '#00F0FF',
                  fontSize: 13,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                ✉️ Send Follow-up Email
              </a>

              {lead.status === 'incoming' && (
                <button
                  onClick={() => updateLead({ status: 'qualified' })}
                  disabled={saving}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(191, 255, 0, 0.1)',
                    border: '1px solid rgba(191, 255, 0, 0.3)',
                    borderRadius: 8,
                    color: '#BFFF00',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  ✓ Mark as Qualified
                </button>
              )}

              {lead.status !== 'converted' && lead.status !== 'disqualified' && (
                <button
                  onClick={() => updateLead({ status: 'converted' })}
                  disabled={saving}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(191, 255, 0, 0.1)',
                    border: '1px solid rgba(191, 255, 0, 0.3)',
                    borderRadius: 8,
                    color: '#BFFF00',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  🎉 Convert to Client
                </button>
              )}

              {lead.status !== 'disqualified' && (
                <button
                  onClick={() => updateLead({ status: 'disqualified' })}
                  disabled={saving}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(136, 136, 136, 0.1)',
                    border: '1px solid rgba(136, 136, 136, 0.3)',
                    borderRadius: 8,
                    color: '#888',
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  ✕ Disqualify Lead
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
