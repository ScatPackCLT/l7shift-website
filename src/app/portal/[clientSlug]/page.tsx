'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProjectBySlug,
  getProjectActivity,
  getProjectRequirements,
  getProjectDeliverables,
  transformActivityEntry,
  type PortalProject,
} from '@/lib/portal-utils'
import { getClientConfig } from '@/lib/client-portal-config'
import type { RequirementDoc, Deliverable } from '@/lib/database.types'

// Action item that needs client attention
interface ActionItem {
  id: string
  type: 'approve_requirement' | 'review_deliverable' | 'upload_asset'
  title: string
  description: string
  icon: string
  priority: boolean
  href: string
  ctaLabel: string
}

export default function ClientPortalDashboard() {
  const params = useParams()
  const clientSlug = params.clientSlug as string
  const config = getClientConfig(clientSlug)

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalData, setPortalData] = useState<PortalProject | null>(null)
  const [requirements, setRequirements] = useState<RequirementDoc[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [activityItems, setActivityItems] = useState<ReturnType<typeof transformActivityEntry>[]>([])

  useEffect(() => {
    setMounted(true)
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

      setPortalData(projectData)

      const [reqs, dels, activity] = await Promise.all([
        getProjectRequirements(projectData.project.id),
        getProjectDeliverables(projectData.project.id),
        getProjectActivity(projectData.project.id, 10),
      ])

      setRequirements(reqs)
      setDeliverables(dels)
      setActivityItems(activity.map(transformActivityEntry))
    } catch (err) {
      console.error('Error loading portal data:', err)
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
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
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#888', fontSize: 14 }}>Loading your project...</p>
      </div>
    )
  }

  if (error || !portalData) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ color: '#FAFAFA', fontSize: 20, marginBottom: 8 }}>
          {error || 'Project not found'}
        </h2>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
          We couldn&apos;t find a project associated with this portal.
        </p>
        <Link
          href="/"
          style={{ color: config.primaryColor, textDecoration: 'none', fontSize: 14 }}
        >
          Return to homepage
        </Link>
      </div>
    )
  }

  const { project, tasks, completion, shiftHours, traditionalEstimate } = portalData
  const clientName = project.client_name?.split(' ')[0] || 'there'
  const { primaryColor, accentColor } = config

  // Group tasks
  const activeTasks = tasks.filter(t => t.status === 'active' || t.status === 'review')
  const shippedTasks = tasks.filter(t => t.status === 'shipped')
  const totalActive = tasks.filter(t => t.status !== 'icebox').length
  const timeSaved = traditionalEstimate - shiftHours

  // Build action items from real data
  const actionItems: ActionItem[] = []

  // Requirements needing approval
  requirements
    .filter(r => r.status === 'review')
    .forEach(r => {
      actionItems.push({
        id: r.id,
        type: 'approve_requirement',
        title: r.title,
        description: r.content.length > 120 ? r.content.slice(0, 120) + '...' : r.content,
        icon: 'clipboard',
        priority: true,
        href: `/portal/${clientSlug}/requirements`,
        ctaLabel: 'Review & Approve',
      })
    })

  // Deliverables needing review
  deliverables
    .filter(d => d.status === 'in_review' || d.status === 'pending')
    .forEach(d => {
      actionItems.push({
        id: d.id,
        type: 'review_deliverable',
        title: d.name,
        description: d.description || 'A new deliverable is ready for your review.',
        icon: 'package',
        priority: true,
        href: `/portal/${clientSlug}/deliverables`,
        ctaLabel: 'Review & Approve',
      })
    })

  // Asset requests from config
  config.assetRequests.forEach((asset, i) => {
    actionItems.push({
      id: `asset_${i}`,
      type: 'upload_asset',
      title: asset.title,
      description: asset.description,
      icon: asset.icon,
      priority: asset.priority,
      href: `/portal/${clientSlug}/assets`,
      ctaLabel: 'Upload',
    })
  })

  const priorityActions = actionItems.filter(a => a.priority)
  const otherActions = actionItems.filter(a => !a.priority)

  const ICON_MAP: Record<string, string> = {
    clipboard: '\u{1F4CB}',
    package: '\u{1F4E6}',
    camera: '\u{1F4F8}',
    palette: '\u{1F3A8}',
    file: '\u{1F4C4}',
    image: '\u{1F5BC}\uFE0F',
    box: '\u{1F4E6}',
    pen: '\u{270D}\uFE0F',
  }

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#FAFAFA' }}>
          Welcome, {clientName}
        </h1>
        <p style={{ margin: '6px 0 0', color: '#888', fontSize: 14 }}>
          Your project dashboard. Here&apos;s where everything stands.
        </p>
      </div>

      {/* Project Status Card */}
      <div
        style={{
          padding: 20,
          background: `linear-gradient(135deg, ${primaryColor}18, ${primaryColor}08)`,
          border: `1px solid ${primaryColor}33`,
          borderRadius: 16,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 13, color: '#888', letterSpacing: '0.05em' }}>PROJECT</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#FAFAFA', marginTop: 2 }}>
              {project.name}
            </div>
          </div>
          <div
            style={{
              padding: '6px 14px',
              background: `${primaryColor}25`,
              border: `1px solid ${primaryColor}44`,
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: primaryColor,
            }}
          >
            {completion}% Complete
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 14 }}>
          <div
            style={{
              height: '100%',
              width: `${Math.max(completion, 3)}%`,
              background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
              borderRadius: 3,
              transition: 'width 1s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: primaryColor }}>{shippedTasks.length}</div>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>SHIPPED</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: accentColor }}>{activeTasks.length}</div>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>IN PROGRESS</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#FAFAFA' }}>{totalActive}</div>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>TOTAL</div>
          </div>
          {timeSaved > 0 && (
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4ADE80' }}>{Math.round(timeSaved)}h</div>
              <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>TIME SAVED</div>
            </div>
          )}
        </div>
      </div>

      {/* Action Required */}
      {priorityActions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#FAFAFA' }}>
              Action Required
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#FF6B6B',
                background: 'rgba(255,107,107,0.15)',
                padding: '3px 10px',
                borderRadius: 10,
              }}
            >
              {priorityActions.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {priorityActions.map(item => (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '16px 18px',
                  background: item.type === 'upload_asset'
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(255,0,170,0.06)',
                  border: item.type === 'upload_asset'
                    ? `1px solid ${primaryColor}33`
                    : '1px solid rgba(255,0,170,0.2)',
                  borderRadius: 12,
                  textDecoration: 'none',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{ICON_MAP[item.icon] || '\u{1F4CB}'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2, lineHeight: 1.4 }}>
                    {item.description}
                  </div>
                </div>
                <span
                  style={{
                    padding: '8px 16px',
                    background: item.type === 'upload_asset'
                      ? `${primaryColor}25`
                      : 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                    border: item.type === 'upload_asset'
                      ? `1px solid ${primaryColor}44`
                      : 'none',
                    borderRadius: 8,
                    color: item.type === 'upload_asset' ? primaryColor : '#0A0A0A',
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.ctaLabel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Other Requests */}
      {otherActions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 600, color: '#888' }}>
            Also Helpful
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {otherActions.map(item => (
              <Link
                key={item.id}
                href={item.href}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  textDecoration: 'none',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 20, flexShrink: 0 }}>{ICON_MAP[item.icon] || '\u{1F4CB}'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#CCC' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{item.description}</div>
                </div>
                <span
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 8,
                    color: '#888',
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {item.ctaLabel}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* In Progress */}
      {activeTasks.length > 0 && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#FAFAFA' }}>
              In Progress
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: accentColor,
                background: `${accentColor}20`,
                padding: '3px 10px',
                borderRadius: 10,
              }}
            >
              {activeTasks.length} {activeTasks.length === 1 ? 'TASK' : 'TASKS'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTasks.map((task, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: task.status === 'review' ? '#FF00AA' : accentColor,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#FAFAFA' }}>{task.title}</div>
                  {task.description && (
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                      {task.description.length > 120 ? task.description.slice(0, 120) + '...' : task.description}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    background: task.status === 'review' ? 'rgba(255,0,170,0.12)' : `${accentColor}18`,
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    color: task.status === 'review' ? '#FF00AA' : accentColor,
                    flexShrink: 0,
                  }}
                >
                  {task.status === 'review' ? 'In Review' : 'Building'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipped */}
      {shippedTasks.length > 0 && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 600, color: '#888' }}>
            Shipped ({shippedTasks.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {shippedTasks.map((task, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '8px 12px',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#4ADE80', fontSize: 14 }}>{'\u2713'}</span>
                <span style={{ fontSize: 13, color: '#666', textDecoration: 'line-through', textDecorationColor: '#333' }}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {activityItems.length > 0 && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 600, color: '#FAFAFA' }}>
            Recent Activity
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activityItems.slice(0, 5).map((item, i) => {
              const iconMap: Record<string, string> = {
                task_created: '\u{1F4CB}',
                task_shipped: '\u{1F680}',
                deliverable_uploaded: '\u{1F4C1}',
                deliverable_approved: '\u2705',
                requirement_created: '\u{1F4DD}',
                requirement_approved: '\u2705',
                feedback_received: '\u{1F4AC}',
                milestone_reached: '\u{1F3C6}',
                project_update: '\u{1F4CC}',
              }
              const icon = iconMap[item.type] || '\u{1F4CC}'
              const timeAgo = (() => {
                const diff = Date.now() - new Date(item.timestamp).getTime()
                const mins = Math.floor(diff / 60000)
                if (mins < 60) return `${mins}m ago`
                const hrs = Math.floor(mins / 60)
                if (hrs < 24) return `${hrs}h ago`
                return `${Math.floor(hrs / 24)}d ago`
              })()
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '10px 0',
                    borderBottom: i < Math.min(activityItems.length, 5) - 1
                      ? '1px solid rgba(255,255,255,0.06)'
                      : 'none',
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#CCC' }}>{item.title}</div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>{item.description}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: '#555', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {timeAgo}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Contact */}
      <div
        style={{
          padding: 20,
          background: `linear-gradient(135deg, ${primaryColor}10, ${accentColor}08)`,
          border: `1px solid ${primaryColor}20`,
          borderRadius: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#FAFAFA' }}>
          Questions? Need help?
        </h3>
        <p style={{ margin: '6px 0 14px', fontSize: 13, color: '#AAA' }}>
          Reach out anytime &mdash; we&apos;re building this together.
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
          Email Ken
        </a>
      </div>
    </div>
  )
}
