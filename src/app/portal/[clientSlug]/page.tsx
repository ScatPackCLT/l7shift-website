'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ProgressRing,
  StatusPill,
  ActionCard,
  InsightCard,
  TimelineBar,
  ComparisonChart,
  ActivityFeed,
} from '@/components/dashboard'
import {
  getProjectBySlug,
  getProjectActivity,
  transformActivityEntry,
  CLIENT_SLUG_MAP,
  type PortalProject,
} from '@/lib/portal-utils'
import type { ActivityLogEntry } from '@/lib/database.types'

export default function ClientPortalDashboard() {
  const params = useParams()
  const router = useRouter()
  const clientSlug = params.clientSlug as string

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalData, setPortalData] = useState<PortalProject | null>(null)
  const [activityItems, setActivityItems] = useState<ReturnType<typeof transformActivityEntry>[]>([])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [clientSlug])

  async function loadData() {
    setLoading(true)
    setError(null)

    try {
      // Fetch project data
      const projectData = await getProjectBySlug(clientSlug)

      if (!projectData) {
        setError('Project not found')
        setLoading(false)
        return
      }

      setPortalData(projectData)

      // Fetch activity
      const activity = await getProjectActivity(projectData.project.id, 10)
      setActivityItems(activity.map(transformActivityEntry))
    } catch (err) {
      console.error('Error loading portal data:', err)
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  // Get config for styling fallback
  const config = CLIENT_SLUG_MAP[clientSlug] || {
    primaryColor: '#00F0FF',
    accentColor: '#BFFF00',
  }

  if (!mounted) return null

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
        <p style={{ color: '#888', fontSize: 14 }}>Loading your project...</p>
      </div>
    )
  }

  if (error || !portalData) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h2 style={{ color: '#FAFAFA', fontSize: 20, marginBottom: 8 }}>
          {error || 'Project not found'}
        </h2>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
          We couldn't find a project associated with this portal.
        </p>
        <Link
          href="/"
          style={{
            color: config.primaryColor,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          Return to homepage
        </Link>
      </div>
    )
  }

  const {
    project,
    completion,
    shiftHours,
    traditionalEstimate,
    phases,
    pendingApprovals,
    pendingFeedback,
    newDeliverables,
    primaryColor,
    discoveryRequired,
  } = portalData

  const totalActions = pendingApprovals + pendingFeedback + (discoveryRequired ? 1 : 0)
  const clientName = project.client_name || 'there'

  return (
    <div>
      {/* Welcome Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 700,
            color: '#FAFAFA',
            fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          }}
        >
          Welcome back, {clientName}
        </h1>
        <p style={{ margin: '8px 0 0', color: '#888', fontSize: 15 }}>
          Here's where your project stands today.
        </p>
      </div>

      {/* Hero Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 32,
          padding: 28,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          marginBottom: 24,
          alignItems: 'center',
        }}
      >
        {/* Progress Ring */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <ProgressRing
            percentage={completion}
            size="xl"
            label="Complete"
            color="gradient"
          />
        </div>

        {/* Timeline */}
        <div style={{ padding: '0 24px' }}>
          <TimelineBar
            phases={phases}
            size="lg"
          />
        </div>

        {/* Actions Needed */}
        {totalActions > 0 ? (
          <div
            style={{
              padding: '20px 28px',
              background: `${primaryColor}15`,
              border: `1px solid ${primaryColor}33`,
              borderRadius: 12,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: primaryColor,
                lineHeight: 1,
              }}
            >
              {totalActions}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Action{totalActions > 1 ? 's' : ''} Needed
            </div>
          </div>
        ) : (
          <div
            style={{
              padding: '20px 28px',
              background: 'rgba(191, 255, 0, 0.1)',
              border: '1px solid rgba(191, 255, 0, 0.3)',
              borderRadius: 12,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28 }}>✓</div>
            <div style={{ fontSize: 12, color: '#BFFF00', marginTop: 4 }}>
              All Caught Up
            </div>
          </div>
        )}
      </div>

      {/* Discovery Required Banner */}
      {discoveryRequired && (
        <div style={{ marginBottom: 24 }}>
          <InsightCard
            type="action"
            icon="📋"
            title="Complete Your Discovery Questionnaire"
            message="Tell us about your business goals and vision so we can finalize your project plan."
            actionLabel="Start Questionnaire →"
            onAction={() => router.push(`/discovery/${clientSlug}`)}
          />
        </div>
      )}

      {/* Insight Banner */}
      {totalActions > 0 && !discoveryRequired && (
        <div style={{ marginBottom: 24 }}>
          <InsightCard
            type="action"
            title={`You have ${totalActions} item${totalActions > 1 ? 's' : ''} waiting for your input`}
            message="Reviewing these quickly helps us keep your project moving forward on schedule."
            actionLabel="View Requirements"
            onAction={() => router.push(`/portal/${clientSlug}/requirements`)}
          />
        </div>
      )}

      {/* Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
        }}
      >
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Actions */}
          <div
            style={{
              padding: 24,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
            }}
          >
            <h2
              style={{
                margin: '0 0 20px',
                fontSize: 16,
                fontWeight: 600,
                color: '#FAFAFA',
              }}
            >
              Your Actions
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: discoveryRequired ? '1fr' : 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {discoveryRequired ? (
                <ActionCard
                  icon="📋"
                  title="Complete"
                  subtitle="Discovery Questionnaire"
                  badge={1}
                  badgeColor="magenta"
                  variant="urgent"
                  href={`/discovery/${clientSlug}`}
                />
              ) : (
                <>
                  <ActionCard
                    icon="✅"
                    title="Approve"
                    subtitle="Requirements"
                    badge={pendingApprovals}
                    badgeColor="lime"
                    variant={pendingApprovals > 0 ? 'success' : 'default'}
                    href={`/portal/${clientSlug}/requirements`}
                  />
                  <ActionCard
                    icon="💬"
                    title="Review"
                    subtitle="Deliverables"
                    badge={pendingFeedback}
                    badgeColor="magenta"
                    variant={pendingFeedback > 0 ? 'urgent' : 'default'}
                    href={`/portal/${clientSlug}/deliverables`}
                  />
                  <ActionCard
                    icon="📁"
                    title="New"
                    subtitle="Files"
                    badge={newDeliverables}
                    badgeColor="cyan"
                    href={`/portal/${clientSlug}/deliverables`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Shift Hours Impact - only show if project has started */}
          {shiftHours > 0 && traditionalEstimate > 0 ? (
            <div
              style={{
                padding: 24,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 16,
              }}
            >
              <h2
                style={{
                  margin: '0 0 20px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#FAFAFA',
                }}
              >
                The SymbAIotic Method™ Impact
              </h2>
              <ComparisonChart
                shiftHours={shiftHours}
                traditionalHours={traditionalEstimate}
                size="md"
              />
            </div>
          ) : (
            <div
              style={{
                padding: 24,
                background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08)`,
                border: `1px solid ${primaryColor}33`,
                borderRadius: 16,
              }}
            >
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#FAFAFA',
                }}
              >
                Getting Started
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: '#AAA', lineHeight: 1.6 }}>
                {discoveryRequired
                  ? 'Complete the discovery questionnaire to help us understand your vision and finalize your project plan.'
                  : 'Your project is being set up. We\'ll update this section once work begins.'}
              </p>
              {discoveryRequired && (
                <Link
                  href={`/discovery/${clientSlug}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 16,
                    padding: '12px 24px',
                    background: primaryColor,
                    color: '#FAFAFA',
                    textDecoration: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Start Questionnaire →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Recent Activity */}
          <div
            style={{
              padding: 24,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 16,
              flex: 1,
            }}
          >
            <h2
              style={{
                margin: '0 0 20px',
                fontSize: 16,
                fontWeight: 600,
                color: '#FAFAFA',
              }}
            >
              Recent Activity
            </h2>
            {activityItems.length > 0 ? (
              <ActivityFeed items={activityItems} maxItems={5} />
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>📭</span>
                <p style={{ fontSize: 13, margin: 0 }}>No activity yet</p>
              </div>
            )}
          </div>

          {/* Need Help */}
          <div
            style={{
              padding: 24,
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(255, 0, 170, 0.1))',
              border: '1px solid rgba(0, 240, 255, 0.2)',
              borderRadius: 16,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 600,
                color: '#FAFAFA',
              }}
            >
              Questions?
            </h3>
            <p style={{ margin: '8px 0 16px', fontSize: 13, color: '#AAA' }}>
              Reach out anytime - we're here to help.
            </p>
            <a
              href="mailto:ken@l7shift.com"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 8,
                color: '#FAFAFA',
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              Contact Ken →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
