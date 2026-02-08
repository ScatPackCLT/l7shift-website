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

// Mock data - will come from Supabase based on clientSlug
const mockProjectData: Record<string, {
  projectName: string
  clientName: string
  completion: number
  shiftHours: number
  traditionalEstimate: number
  phases: { name: string; status: 'completed' | 'active' | 'upcoming' }[]
  pendingApprovals: number
  pendingFeedback: number
  newDeliverables: number
  primaryColor: string
  discoveryRequired?: boolean
}> = {
  'scat-pack-clt': {
    projectName: 'Scat Pack CLT Platform',
    clientName: 'Ken Leftwich',
    completion: 78,
    shiftHours: 12.5,
    traditionalEstimate: 120,
    phases: [
      { name: 'Discovery', status: 'completed' },
      { name: 'Design', status: 'completed' },
      { name: 'Build', status: 'active' },
      { name: 'Launch', status: 'upcoming' },
    ],
    pendingApprovals: 1,
    pendingFeedback: 2,
    newDeliverables: 3,
    primaryColor: '#00F0FF',
  },
  'prettypaidcloset': {
    projectName: 'Pretty Paid Closet Platform',
    clientName: 'Jazz',
    completion: 10,
    shiftHours: 0,
    traditionalEstimate: 0,
    phases: [
      { name: 'Discovery', status: 'active' },
      { name: 'Design', status: 'upcoming' },
      { name: 'Build', status: 'upcoming' },
      { name: 'Launch', status: 'upcoming' },
    ],
    pendingApprovals: 0,
    pendingFeedback: 0,
    newDeliverables: 1,
    primaryColor: '#B76E79',
    discoveryRequired: true,
  },
  'stitchwichs': {
    projectName: 'Stitchwichs Shopify',
    clientName: 'Nicole',
    completion: 0,
    shiftHours: 0,
    traditionalEstimate: 60,
    phases: [
      { name: 'Discovery', status: 'active' },
      { name: 'Audit', status: 'upcoming' },
      { name: 'Build', status: 'upcoming' },
      { name: 'Launch', status: 'upcoming' },
    ],
    pendingApprovals: 0,
    pendingFeedback: 0,
    newDeliverables: 0,
    primaryColor: '#8B5CF6',
  },
}

const mockActivity = [
  { id: '1', type: 'deliverable_uploaded' as const, title: 'Homepage Design v2', actor: 'Ken', actorType: 'internal' as const, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { id: '2', type: 'task_shipped' as const, title: 'User Authentication', actor: 'Ken', actorType: 'internal' as const, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8) },
  { id: '3', type: 'requirement_approved' as const, title: 'Phase 1 Requirements', actor: 'Client', actorType: 'client' as const, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
]

export default function ClientPortalDashboard() {
  const params = useParams()
  const router = useRouter()
  const clientSlug = params.clientSlug as string
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const data = mockProjectData[clientSlug] || mockProjectData['scat-pack-clt']
  const totalActions = data.pendingApprovals + data.pendingFeedback + (data.discoveryRequired ? 1 : 0)

  if (!mounted) return null

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
          Welcome back, {data.clientName}
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
            percentage={data.completion}
            size="xl"
            label="Complete"
            color="gradient"
          />
        </div>

        {/* Timeline */}
        <div style={{ padding: '0 24px' }}>
          <TimelineBar
            phases={data.phases}
            size="lg"
          />
        </div>

        {/* Actions Needed */}
        {totalActions > 0 ? (
          <div
            style={{
              padding: '20px 28px',
              background: `${data.primaryColor}15`,
              border: `1px solid ${data.primaryColor}33`,
              borderRadius: 12,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: data.primaryColor,
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
      {data.discoveryRequired && (
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
      {totalActions > 0 && !data.discoveryRequired && (
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
                gridTemplateColumns: data.discoveryRequired ? '1fr' : 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {data.discoveryRequired ? (
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
                    badge={data.pendingApprovals}
                    badgeColor="lime"
                    variant={data.pendingApprovals > 0 ? 'success' : 'default'}
                    href={`/portal/${clientSlug}/requirements`}
                  />
                  <ActionCard
                    icon="💬"
                    title="Review"
                    subtitle="Deliverables"
                    badge={data.pendingFeedback}
                    badgeColor="magenta"
                    variant={data.pendingFeedback > 0 ? 'urgent' : 'default'}
                    href={`/portal/${clientSlug}/deliverables`}
                  />
                  <ActionCard
                    icon="📁"
                    title="New"
                    subtitle="Files"
                    badge={data.newDeliverables}
                    badgeColor="cyan"
                    href={`/portal/${clientSlug}/deliverables`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Shift Hours Impact - only show if project has started */}
          {data.shiftHours > 0 && data.traditionalEstimate > 0 ? (
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
                shiftHours={data.shiftHours}
                traditionalHours={data.traditionalEstimate}
                size="md"
              />
            </div>
          ) : (
            <div
              style={{
                padding: 24,
                background: `linear-gradient(135deg, ${data.primaryColor}15, ${data.primaryColor}08)`,
                border: `1px solid ${data.primaryColor}33`,
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
                {data.discoveryRequired
                  ? 'Complete the discovery questionnaire to help us understand your vision and finalize your project plan.'
                  : 'Your project is being set up. We\'ll update this section once work begins.'}
              </p>
              {data.discoveryRequired && (
                <Link
                  href={`/discovery/${clientSlug}`}
                  style={{
                    display: 'inline-block',
                    marginTop: 16,
                    padding: '12px 24px',
                    background: data.primaryColor,
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
            <ActivityFeed items={mockActivity} maxItems={5} />
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
