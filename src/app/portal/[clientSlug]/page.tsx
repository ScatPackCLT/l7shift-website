'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getProjectBySlug,
  getProjectActivity,
  transformActivityEntry,
  CLIENT_SLUG_MAP,
  type PortalProject,
} from '@/lib/portal-utils'

type TaskStatus = 'shipped' | 'in_progress' | 'review' | 'backlog' | 'icebox'

interface TaskGroup {
  label: string
  color: string
  tasks: { title: string; description?: string | null; priority: string; status: TaskStatus }[]
}

export default function ClientPortalDashboard() {
  const params = useParams()
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
      const projectData = await getProjectBySlug(clientSlug)

      if (!projectData) {
        setError('Project not found')
        setLoading(false)
        return
      }

      setPortalData(projectData)

      const activity = await getProjectActivity(projectData.project.id, 10)
      setActivityItems(activity.map(transformActivityEntry))
    } catch (err) {
      console.error('Error loading portal data:', err)
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

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

  const { project, tasks, completion, shiftHours, traditionalEstimate, primaryColor } = portalData
  const clientName = project.client_name?.split(' ')[0] || 'there'

  // Group tasks by status
  const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'review')
  const backlogTasks = tasks.filter(t => t.status === 'backlog')
  const shippedTasks = tasks.filter(t => t.status === 'shipped')
  const iceboxTasks = tasks.filter(t => t.status === 'icebox')

  // Build task groups for display
  const taskGroups: TaskGroup[] = []

  if (activeTasks.length > 0) {
    taskGroups.push({
      label: 'In Progress',
      color: config.accentColor,
      tasks: activeTasks.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status as TaskStatus,
      })),
    })
  }

  if (backlogTasks.length > 0) {
    taskGroups.push({
      label: 'Up Next',
      color: primaryColor,
      tasks: backlogTasks.map(t => ({
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status as TaskStatus,
      })),
    })
  }

  // Stats
  const totalActive = tasks.filter(t => t.status !== 'icebox').length
  const timeSaved = traditionalEstimate - shiftHours

  const statusColors: Record<string, string> = {
    high: '#FF6B6B',
    medium: '#F59E0B',
    low: '#888',
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
          marginBottom: 20,
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
              background: `linear-gradient(90deg, ${primaryColor}, ${config.accentColor})`,
              borderRadius: 3,
              transition: 'width 1s ease',
            }}
          />
        </div>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: primaryColor }}>{shippedTasks.length}</div>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>SHIPPED</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: config.accentColor }}>{activeTasks.length + backlogTasks.length}</div>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>IN QUEUE</div>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#FAFAFA' }}>{totalActive}</div>
            <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>TOTAL TASKS</div>
          </div>
          {timeSaved > 0 && (
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4ADE80' }}>{Math.round(timeSaved)}h</div>
              <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.05em' }}>TIME SAVED</div>
            </div>
          )}
        </div>
      </div>

      {/* Task Groups */}
      {taskGroups.map((group, gi) => (
        <div
          key={gi}
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
              {group.label}
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: group.color,
                background: `${group.color}20`,
                padding: '3px 10px',
                borderRadius: 10,
                letterSpacing: '0.05em',
              }}
            >
              {group.tasks.length} {group.tasks.length === 1 ? 'TASK' : 'TASKS'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.tasks.map((task, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '12px 14px',
                  background: task.priority === 'high' ? 'rgba(255,107,107,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${task.priority === 'high' ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: 10,
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: statusColors[task.priority] || '#888',
                    marginTop: 5,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#FAFAFA' }}>{task.title}</div>
                  {task.description && (
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888', lineHeight: 1.4 }}>
                      {task.description.length > 200 ? task.description.slice(0, 200) + '...' : task.description}
                    </p>
                  )}
                </div>
                {task.priority === 'high' && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#FF6B6B',
                      background: 'rgba(255,107,107,0.15)',
                      padding: '2px 8px',
                      borderRadius: 8,
                      letterSpacing: '0.05em',
                      flexShrink: 0,
                    }}
                  >
                    HIGH
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Shipped Tasks (collapsed) */}
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
                <span style={{ color: '#4ADE80', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 13, color: '#666', textDecoration: 'line-through', textDecorationColor: '#333' }}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Future / Icebox */}
      {iceboxTasks.length > 0 && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 600, color: '#666' }}>
            Future Phases ({iceboxTasks.length})
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#555' }}>
            Planned improvements for upcoming phases
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {iceboxTasks.map((task, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '8px 12px',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#444', fontSize: 12 }}>○</span>
                <span style={{ fontSize: 13, color: '#555' }}>{task.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Link
          href={`/portal/${clientSlug}/deliverables`}
          style={{
            padding: '20px 16px',
            background: `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}08)`,
            border: `1px solid ${primaryColor}33`,
            borderRadius: 14,
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Deliverables</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Review our work</div>
        </Link>

        <Link
          href={`/portal/${clientSlug}/assets`}
          style={{
            padding: '20px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Upload Files</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Send us assets</div>
        </Link>

        <Link
          href={`/portal/${clientSlug}/activity`}
          style={{
            padding: '20px 16px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 14,
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>🕐</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#FAFAFA' }}>Activity</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Project updates</div>
        </Link>
      </div>

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
                task_created: '📋',
                task_shipped: '🚀',
                deliverable_uploaded: '📁',
                deliverable_approved: '✅',
                requirement_created: '📝',
                requirement_approved: '✅',
                feedback_received: '💬',
                milestone_reached: '🏆',
                project_update: '📌',
              }
              const icon = iconMap[item.type] || '📌'
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
          background: `linear-gradient(135deg, ${primaryColor}10, ${config.accentColor}08)`,
          border: `1px solid ${primaryColor}20`,
          borderRadius: 16,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#FAFAFA' }}>
          Questions? Need help?
        </h3>
        <p style={{ margin: '6px 0 14px', fontSize: 13, color: '#AAA' }}>
          Reach out anytime — we&apos;re building this together.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="mailto:ken@l7shift.com"
            style={{
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
            Email Ken →
          </a>
          <a
            href="sms:+19802437078"
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#AAA',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Text Ken →
          </a>
        </div>
      </div>
    </div>
  )
}
