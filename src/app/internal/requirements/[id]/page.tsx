'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type RequirementStatus = 'draft' | 'review' | 'approved' | 'implemented'

interface Section {
  id: string
  title: string
  content: string
}

interface RequirementDoc {
  id: string
  projectId: string
  projectName: string
  clientName: string
  clientEmail: string
  title: string
  phase: string
  status: RequirementStatus
  version: number
  createdAt: Date
  updatedAt: Date
  summary: string
  sections: Section[]
  signedOff: boolean
  signedAt?: Date
  signedBy?: string
}

// Mock data
const mockRequirement: RequirementDoc = {
  id: '1',
  projectId: '1',
  projectName: 'Scat Pack CLT',
  clientName: 'Ken',
  clientEmail: 'ken@scatpackclt.com',
  title: 'Phase 1: Core Platform Requirements',
  phase: 'Phase 1',
  status: 'review',
  version: 2,
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
  updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
  summary: 'Foundation features including authentication, customer portal, and basic service management.',
  sections: [
    {
      id: '1',
      title: 'User Authentication',
      content: '• Magic link email authentication for customers\n• PIN-based quick login for returning users\n• Session management with 30-day remember me\n• Password-less design for simplicity',
    },
    {
      id: '2',
      title: 'Customer Portal',
      content: '• Dashboard showing upcoming services\n• Service history and invoices\n• Profile management\n• Payment method storage (Stripe)',
    },
    {
      id: '3',
      title: 'Service Scheduling',
      content: '• Weekly recurring service setup\n• One-time service booking\n• Service pause/resume functionality\n• Calendar integration',
    },
  ],
  signedOff: false,
}

const statusConfig: Record<RequirementStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: '#888', bgColor: 'rgba(136, 136, 136, 0.1)' },
  review: { label: 'Awaiting Signoff', color: '#FF00AA', bgColor: 'rgba(255, 0, 170, 0.1)' },
  approved: { label: 'Approved', color: '#BFFF00', bgColor: 'rgba(191, 255, 0, 0.1)' },
  implemented: { label: 'Implemented', color: '#00F0FF', bgColor: 'rgba(0, 240, 255, 0.1)' },
}

export default function RequirementEditorPage() {
  const params = useParams()
  const router = useRouter()
  const [doc, setDoc] = useState(mockRequirement)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const handleTitleChange = (value: string) => {
    setDoc({ ...doc, title: value })
    setHasChanges(true)
  }

  const handleSummaryChange = (value: string) => {
    setDoc({ ...doc, summary: value })
    setHasChanges(true)
  }

  const handleSectionChange = (sectionId: string, field: 'title' | 'content', value: string) => {
    setDoc({
      ...doc,
      sections: doc.sections.map((s) =>
        s.id === sectionId ? { ...s, [field]: value } : s
      ),
    })
    setHasChanges(true)
  }

  const addSection = () => {
    const newSection: Section = {
      id: String(Date.now()),
      title: 'New Section',
      content: '',
    }
    setDoc({ ...doc, sections: [...doc.sections, newSection] })
    setHasChanges(true)
    setEditingSection(newSection.id)
  }

  const removeSection = (sectionId: string) => {
    setDoc({
      ...doc,
      sections: doc.sections.filter((s) => s.id !== sectionId),
    })
    setHasChanges(true)
  }

  const handleSave = () => {
    // In real app, this would call API
    setHasChanges(false)
    alert('Changes saved!')
  }

  const handleSendForReview = () => {
    // In real app, this would send email and update status
    setShowSendModal(false)
    setDoc({ ...doc, status: 'review' })
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Breadcrumb & Actions */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/internal/requirements"
            style={{ color: '#888', textDecoration: 'none', fontSize: 13 }}
          >
            Requirements
          </Link>
          <span style={{ color: '#555' }}>/</span>
          <span style={{ color: '#FAFAFA', fontSize: 13 }}>{doc.title}</span>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {hasChanges && (
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                background: 'rgba(191, 255, 0, 0.1)',
                border: '1px solid rgba(191, 255, 0, 0.3)',
                borderRadius: 8,
                color: '#BFFF00',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save Changes
            </button>
          )}

          {doc.status === 'draft' && (
            <button
              onClick={() => setShowSendModal(true)}
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
              Send for Signoff
            </button>
          )}

          {doc.status === 'review' && (
            <div
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 0, 170, 0.1)',
                border: '1px solid rgba(255, 0, 170, 0.3)',
                borderRadius: 8,
                color: '#FF00AA',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Awaiting Client Signoff
            </div>
          )}

          {doc.status === 'approved' && (
            <div
              style={{
                padding: '10px 20px',
                background: 'rgba(191, 255, 0, 0.1)',
                border: '1px solid rgba(191, 255, 0, 0.3)',
                borderRadius: 8,
                color: '#BFFF00',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              ✓ Approved by {doc.signedBy}
            </div>
          )}
        </div>
      </div>

      {/* Document Header */}
      <div
        style={{
          padding: 28,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            {/* Phase Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <input
                type="text"
                value={doc.phase}
                onChange={(e) => {
                  setDoc({ ...doc, phase: e.target.value })
                  setHasChanges(true)
                }}
                style={{
                  padding: '4px 12px',
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.3)',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#00F0FF',
                  width: 100,
                }}
              />
              <div
                style={{
                  padding: '4px 10px',
                  background: statusConfig[doc.status].bgColor,
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: statusConfig[doc.status].color,
                }}
              >
                {statusConfig[doc.status].label}
              </div>
              <span style={{ fontSize: 11, color: '#666' }}>v{doc.version}</span>
            </div>

            {/* Title */}
            <input
              type="text"
              value={doc.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              style={{
                width: '100%',
                padding: 0,
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                fontWeight: 600,
                color: '#FAFAFA',
                marginBottom: 8,
              }}
              placeholder="Document Title"
            />

            {/* Project Info */}
            <div style={{ fontSize: 13, color: '#888' }}>
              {doc.projectName} • {doc.clientName}
            </div>
          </div>

          <button
            onClick={() => setShowVersionHistory(true)}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              color: '#888',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Version History
          </button>
        </div>

        {/* Summary */}
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Summary
          </label>
          <textarea
            value={doc.summary}
            onChange={(e) => handleSummaryChange(e.target.value)}
            style={{
              width: '100%',
              padding: 16,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#AAA',
              fontSize: 14,
              lineHeight: 1.6,
              resize: 'vertical',
              minHeight: 80,
            }}
            placeholder="Brief summary of this requirement document..."
          />
        </div>
      </div>

      {/* Sections */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#FAFAFA' }}>
            Sections ({doc.sections.length})
          </h2>
          <button
            onClick={addSection}
            style={{
              padding: '8px 16px',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              borderRadius: 6,
              color: '#00F0FF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Section
          </button>
        </div>

        {doc.sections.map((section, index) => (
          <div
            key={section.id}
            style={{
              padding: 24,
              background: 'rgba(255, 255, 255, 0.03)',
              border: editingSection === section.id
                ? '1px solid rgba(0, 240, 255, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                <span style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>
                  {String(index + 1).padStart(2, '0')}
                </span>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => handleSectionChange(section.id, 'title', e.target.value)}
                  onFocus={() => setEditingSection(section.id)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#00F0FF',
                  }}
                  placeholder="Section Title"
                />
              </div>
              <button
                onClick={() => removeSection(section.id)}
                style={{
                  padding: '6px 12px',
                  background: 'rgba(255, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 0, 0, 0.2)',
                  borderRadius: 6,
                  color: '#FF6666',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>

            <textarea
              value={section.content}
              onChange={(e) => handleSectionChange(section.id, 'content', e.target.value)}
              onFocus={() => setEditingSection(section.id)}
              style={{
                width: '100%',
                padding: 16,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 8,
                color: '#CCC',
                fontSize: 14,
                lineHeight: 1.8,
                resize: 'vertical',
                minHeight: 120,
                fontFamily: 'inherit',
              }}
              placeholder="Enter section content... Use bullet points (•) for lists"
            />
          </div>
        ))}
      </div>

      {/* Metadata Footer */}
      <div
        style={{
          padding: 20,
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#666',
        }}
      >
        <span>Created: {doc.createdAt.toLocaleDateString()}</span>
        <span>Last updated: {doc.updatedAt.toLocaleDateString()} at {doc.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span>ID: {doc.id}</span>
      </div>

      {/* Send for Review Modal */}
      {showSendModal && (
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
          onClick={() => setShowSendModal(false)}
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
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(255, 0, 170, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 24,
              }}
            >
              ✉️
            </div>

            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600, color: '#FAFAFA', textAlign: 'center' }}>
              Send for Client Signoff
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: '#888', textAlign: 'center' }}>
              This will email the client a link to review and approve this document.
            </p>

            <div
              style={{
                padding: 16,
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 8,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Sending to:</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#0A0A0A',
                  }}
                >
                  {doc.clientName.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#FAFAFA' }}>{doc.clientName}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{doc.clientEmail}</div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: 16,
                background: 'rgba(191, 255, 0, 0.05)',
                border: '1px solid rgba(191, 255, 0, 0.1)',
                borderRadius: 8,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 12, color: '#BFFF00', fontWeight: 600, marginBottom: 4 }}>
                Document Preview
              </div>
              <div style={{ fontSize: 13, color: '#888' }}>
                {doc.title} • {doc.sections.length} sections
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowSendModal(false)}
                style={{
                  flex: 1,
                  padding: '14px 24px',
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
                onClick={handleSendForReview}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#0A0A0A',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
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
          onClick={() => setShowVersionHistory(false)}
        >
          <div
            style={{
              background: '#0A0A0A',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#FAFAFA' }}>
                Version History
              </h2>
              <button
                onClick={() => setShowVersionHistory(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: 20,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Current version */}
              <div
                style={{
                  padding: 16,
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.2)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#00F0FF' }}>Version 2 (Current)</span>
                  <span style={{ fontSize: 11, color: '#666' }}>4 hours ago</span>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  Updated authentication requirements
                </div>
              </div>

              {/* Previous version */}
              <div
                style={{
                  padding: 16,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Version 1</span>
                  <span style={{ fontSize: 11, color: '#666' }}>14 days ago</span>
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  Initial document created
                </div>
                <button
                  style={{
                    marginTop: 12,
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: 4,
                    color: '#888',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  Restore this version
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
