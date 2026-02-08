'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { StatusPill } from '@/components/dashboard'
import {
  getProjectBySlug,
  getProjectRequirements,
  signOffRequirement,
  CLIENT_SLUG_MAP,
} from '@/lib/portal-utils'
import type { RequirementDoc, RequirementStatus } from '@/lib/database.types'

interface RequirementSection {
  title: string
  content: string
}

const statusConfig: Record<RequirementStatus, { label: string; color: string; action?: string }> = {
  draft: { label: 'Draft', color: '#888' },
  review: { label: 'Awaiting Approval', color: '#FF00AA', action: 'Review & Sign' },
  approved: { label: 'Approved', color: '#BFFF00' },
  implemented: { label: 'Implemented', color: '#00F0FF' },
}

// Parse MDX/Markdown content into sections
function parseContentToSections(content: string): RequirementSection[] {
  const lines = content.split('\n')
  const sections: RequirementSection[] = []
  let currentSection: RequirementSection | null = null

  for (const line of lines) {
    // Check for heading
    const h2Match = line.match(/^##\s+(.+)$/)
    const h3Match = line.match(/^###\s+(.+)$/)

    if (h2Match || h3Match) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: (h2Match || h3Match)![1],
        content: '',
      }
    } else if (currentSection) {
      currentSection.content += line + '\n'
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  // If no sections found, create one from the whole content
  if (sections.length === 0 && content.trim()) {
    sections.push({
      title: 'Overview',
      content: content,
    })
  }

  return sections
}

// Extract summary from content (first paragraph or first 200 chars)
function extractSummary(content: string): string {
  // Remove markdown headings
  const cleanContent = content.replace(/^#+\s+.+$/gm, '').trim()
  // Get first paragraph
  const firstPara = cleanContent.split('\n\n')[0]
  if (firstPara.length > 200) {
    return firstPara.substring(0, 197) + '...'
  }
  return firstPara
}

export default function RequirementsPage() {
  const params = useParams()
  const clientSlug = params.clientSlug as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<RequirementDoc[]>([])
  const [selectedDoc, setSelectedDoc] = useState<RequirementDoc | null>(null)
  const [showSignoffModal, setShowSignoffModal] = useState(false)
  const [signatureName, setSignatureName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signoffError, setSignoffError] = useState<string | null>(null)
  const [signoffSuccess, setSignoffSuccess] = useState(false)

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

      const reqs = await getProjectRequirements(projectData.project.id)
      setRequirements(reqs)
    } catch (err) {
      console.error('Error loading requirements:', err)
      setError('Failed to load requirements')
    } finally {
      setLoading(false)
    }
  }

  const handleSignoff = async () => {
    if (!selectedDoc || !projectId || !signatureName.trim()) {
      setSignoffError('Please type your name to sign')
      return
    }

    setIsSubmitting(true)
    setSignoffError(null)

    try {
      // Try the API route first (for activity logging, etc.)
      const response = await fetch(`/api/requirements/${selectedDoc.id}/signoff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: projectId,
          signed_by: signatureName.trim(),
          signature: signatureName.trim(),
        }),
      })

      if (response.ok) {
        // API route worked
        setSignoffSuccess(true)
        setTimeout(() => {
          resetSignoffModal()
          loadData() // Reload requirements
        }, 2000)
        return
      }

      // Fallback to direct Supabase update
      const success = await signOffRequirement(
        selectedDoc.id,
        projectId,
        undefined,
        typeof navigator !== 'undefined' ? navigator.userAgent : undefined
      )

      if (success) {
        setSignoffSuccess(true)
        setTimeout(() => {
          resetSignoffModal()
          loadData()
        }, 2000)
      } else {
        throw new Error('Failed to record signoff')
      }
    } catch (err) {
      console.error('Signoff error:', err)
      setSignoffError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetSignoffModal = () => {
    setShowSignoffModal(false)
    setSelectedDoc(null)
    setSignatureName('')
    setSignoffError(null)
    setSignoffSuccess(false)
  }

  const pendingCount = requirements.filter(r => r.status === 'review').length

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
        <p style={{ color: '#888', fontSize: 14 }}>Loading requirements...</p>
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
            Requirements
          </h1>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
            Review and approve project requirements
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
            <span style={{ fontSize: 20 }}>✍️</span>
            <span style={{ color: '#FF00AA', fontSize: 14, fontWeight: 600 }}>
              {pendingCount} awaiting your signoff
            </span>
          </div>
        )}
      </div>

      {/* Requirements List */}
      {requirements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📄</span>
          <p style={{ fontSize: 15 }}>No requirements documents yet</p>
          <p style={{ fontSize: 13, color: '#555' }}>
            Requirements will appear here once they're ready for your review.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {requirements.map((req) => {
            const sections = parseContentToSections(req.content)
            const summary = extractSummary(req.content)

            return (
              <div
                key={req.id}
                onClick={() => setSelectedDoc(req)}
                style={{
                  padding: 24,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: req.status === 'review'
                    ? '1px solid rgba(255, 0, 170, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(0, 240, 255, 0.1)',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#00F0FF',
                        }}
                      >
                        v{req.version}
                      </span>
                      <StatusPill status={req.status} size="sm" />
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 18,
                        fontWeight: 600,
                        color: '#FAFAFA',
                      }}
                    >
                      {req.title}
                    </h3>
                  </div>

                  {req.status === 'review' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDoc(req)
                        setShowSignoffModal(true)
                      }}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                        border: 'none',
                        borderRadius: 8,
                        color: '#0A0A0A',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Review & Sign
                    </button>
                  )}

                  {req.status === 'approved' && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#BFFF00', fontWeight: 600 }}>
                        ✓ Approved
                      </div>
                      <div style={{ fontSize: 10, color: '#666' }}>
                        {new Date(req.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>

                <p style={{ margin: 0, fontSize: 14, color: '#888', lineHeight: 1.6 }}>
                  {summary}
                </p>

                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    fontSize: 12,
                    color: '#666',
                  }}
                >
                  <span>v{req.version}</span>
                  <span>•</span>
                  <span>{sections.length} sections</span>
                  <span>•</span>
                  <span>Updated {new Date(req.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDoc && !showSignoffModal && (
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
            padding: 40,
          }}
          onClick={() => setSelectedDoc(null)}
        >
          <div
            style={{
              background: '#0A0A0A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              maxWidth: 800,
              maxHeight: '90vh',
              overflow: 'auto',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: 24,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                position: 'sticky',
                top: 0,
                background: '#0A0A0A',
                zIndex: 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(0, 240, 255, 0.1)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#00F0FF',
                      }}
                    >
                      v{selectedDoc.version}
                    </span>
                    <StatusPill status={selectedDoc.status} size="sm" />
                  </div>
                  <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: '#FAFAFA' }}>
                    {selectedDoc.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedDoc(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    fontSize: 24,
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 24 }}>
              {parseContentToSections(selectedDoc.content).map((section, i) => (
                <div key={i} style={{ marginBottom: 28 }}>
                  <h3
                    style={{
                      margin: '0 0 12px',
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#00F0FF',
                    }}
                  >
                    {section.title}
                  </h3>
                  <div
                    style={{
                      padding: 16,
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: 8,
                      fontSize: 14,
                      color: '#CCC',
                      lineHeight: 1.8,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {section.content.trim()}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            {selectedDoc.status === 'review' && (
              <div
                style={{
                  padding: 24,
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'sticky',
                  bottom: 0,
                  background: '#0A0A0A',
                }}
              >
                <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                  By signing, you approve these requirements for implementation.
                </p>
                <button
                  onClick={() => setShowSignoffModal(true)}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #BFFF00, #00F0FF)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#0A0A0A',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Sign Off & Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signoff Confirmation Modal */}
      {showSignoffModal && selectedDoc && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
        >
          <div
            style={{
              background: '#0A0A0A',
              border: signoffSuccess
                ? '1px solid rgba(191, 255, 0, 0.5)'
                : '1px solid rgba(191, 255, 0, 0.3)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {signoffSuccess ? (
              // Success State
              <>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(191, 255, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: 28,
                    color: '#BFFF00',
                  }}
                >
                  ✓
                </div>
                <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#BFFF00' }}>
                  Signed Successfully
                </h2>
                <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
                  Your approval has been recorded. Ken has been notified.
                </p>
              </>
            ) : (
              // Normal State
              <>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(191, 255, 0, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: 28,
                  }}
                >
                  ✍️
                </div>

                <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, color: '#FAFAFA' }}>
                  Confirm Signoff
                </h2>

                <p style={{ margin: '0 0 8px', fontSize: 14, color: '#888' }}>
                  You are approving:
                </p>
                <p style={{ margin: '0 0 24px', fontSize: 16, fontWeight: 600, color: '#00F0FF' }}>
                  {selectedDoc.title}
                </p>

                {/* Signature Input */}
                <div style={{ marginBottom: 16, textAlign: 'left' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      color: '#888',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    Type your name to sign
                  </label>
                  <input
                    type="text"
                    value={signatureName}
                    onChange={(e) => {
                      setSignatureName(e.target.value)
                      setSignoffError(null)
                    }}
                    placeholder="Your full name"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: signoffError
                        ? '1px solid #FF00AA'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 8,
                      color: '#FAFAFA',
                      fontSize: 16,
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {signoffError && (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: '#FF00AA' }}>
                      {signoffError}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    padding: 16,
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: 8,
                    marginBottom: 24,
                    textAlign: 'left',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
                    By clicking &quot;Sign & Approve&quot;, you confirm that you have reviewed these requirements
                    and authorize L7 Shift to proceed with implementation. This action will be recorded
                    with a timestamp for your records.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={resetSignoffModal}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#888',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.5 : 1,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSignoff}
                    disabled={isSubmitting || !signatureName.trim()}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      background: isSubmitting || !signatureName.trim()
                        ? 'rgba(191, 255, 0, 0.3)'
                        : 'linear-gradient(135deg, #BFFF00, #00F0FF)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#0A0A0A',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: isSubmitting || !signatureName.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSubmitting ? 'Signing...' : '✓ Sign & Approve'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
