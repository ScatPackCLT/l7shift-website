'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Project, ActivityLogEntry } from '@/lib/database.types'
import {
  ProgressRing,
  StatusPill,
  ActionCard,
  InsightCard,
  MetricCard,
  VelocitySparkline,
  SpeedGauge,
  ActivityFeed,
} from '@/components/dashboard'

interface ProjectWithMetrics extends Project {
  total_tasks: number
  shipped_tasks: number
  total_shift_hours: number
  total_traditional_estimate: number
  pending_actions: number
}

export default function InternalDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState<ProjectWithMetrics[]>([])
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [velocity, setVelocity] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    if (!supabase) {
      console.error('Supabase client not initialized')
      setLoading(false)
      return
    }

    const db = supabase! // Non-null assertion after null check

    try {
      // Fetch projects with metrics
      const { data: projectsData, error: projectsError } = await db
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (projectsError) throw projectsError

      // Fetch task counts for each project
      const projects = (projectsData || []) as Project[]
      const projectsWithMetrics: ProjectWithMetrics[] = await Promise.all(
        projects.map(async (project) => {
          const { data: tasks } = await db
            .from('tasks')
            .select('status, shift_hours, traditional_hours_estimate')
            .eq('project_id', project.id)

          const taskList = (tasks || []) as { status: string; shift_hours: number | null; traditional_hours_estimate: number | null }[]
          const shippedTasks = taskList.filter(t => t.status === 'shipped')
          const reviewTasks = taskList.filter(t => t.status === 'review')

          return {
            ...project,
            total_tasks: taskList.length,
            shipped_tasks: shippedTasks.length,
            total_shift_hours: taskList.reduce((sum, t) => sum + (t.shift_hours || 0), 0),
            total_traditional_estimate: taskList.reduce((sum, t) => sum + (t.traditional_hours_estimate || 0), 0),
            pending_actions: reviewTasks.length, // Items awaiting review
          }
        })
      )

      setProjects(projectsWithMetrics)

      // Fetch recent activity
      const { data: activityData, error: activityError } = await db
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (!activityError && activityData) {
        setActivity(activityData)
      }

      // Calculate velocity (tasks shipped per day over last 14 days)
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

      const { data: recentTasks } = await db
        .from('tasks')
        .select('shipped_at')
        .not('shipped_at', 'is', null)
        .gte('shipped_at', fourteenDaysAgo.toISOString())

      // Group by day
      const velocityMap = new Map<string, number>()
      for (let i = 0; i < 14; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (13 - i))
        velocityMap.set(date.toISOString().split('T')[0], 0)
      }

      ((recentTasks || []) as { shipped_at: string | null }[]).forEach(task => {
        if (task.shipped_at) {
          const day = task.shipped_at.split('T')[0]
          if (velocityMap.has(day)) {
            velocityMap.set(day, (velocityMap.get(day) || 0) + 1)
          }
        }
      })

      setVelocity(Array.from(velocityMap.values()))
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const totalShiftHours = projects.reduce((sum, p) => sum + p.total_shift_hours, 0)
  const totalTraditionalHours = projects.reduce((sum, p) => sum + p.total_traditional_estimate, 0)
  const activeProjects = projects.filter(p => p.status === 'active').length
  const totalPendingActions = projects.reduce((sum, p) => sum + p.pending_actions, 0)

  // Transform activity for ActivityFeed component
  const activityItems = activity.map(a => ({
    id: a.id,
    type: a.action as 'task_shipped' | 'deliverable_uploaded' | 'feedback_added' | 'requirement_approved' | 'task_created',
    title: (a.metadata as { title?: string })?.title || a.entity_type,
    actor: a.actor,
    actorType: a.actor_type as 'internal' | 'client',
    timestamp: new Date(a.created_at),
  }))

  if (!mounted) return null

  if (loading) {
    return (
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ color: '#888' }}>Loading dashboard...</div>
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
            Dashboard
          </h1>
          <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
            Project management overview
          </p>
        </div>
        <Link
          href="/internal/projects"
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
            color: '#0A0A0A',
            borderRadius: 8,
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + New Project
        </Link>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
        <div
          style={{
            padding: 60,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚀</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#FAFAFA' }}>No projects yet</h2>
          <p style={{ margin: '0 0 24px', color: '#888', fontSize: 14 }}>
            Create your first project to get started with the SymbAIotic Shift™
          </p>
          <Link
            href="/internal/projects"
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
              color: '#0A0A0A',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            + Create Project
          </Link>
        </div>
      ) : (
        <>
          {/* Top metrics row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 32,
            }}
          >
            <MetricCard
              label="Active Projects"
              value={activeProjects}
              color="cyan"
              size="lg"
            />
            <MetricCard
              label="Pending Actions"
              value={totalPendingActions}
              color={totalPendingActions > 0 ? 'magenta' : 'white'}
              size="lg"
            />
            <MetricCard
              label="Shift Hours (Total)"
              value={`${totalShiftHours.toFixed(1)}h`}
              subValue={`vs ${totalTraditionalHours}h traditional`}
              color="lime"
              size="lg"
            />
            <div
              style={{
                padding: 16,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
              }}
            >
              <VelocitySparkline
                data={velocity.length > 0 ? velocity : [0]}
                label="Velocity (14 days)"
                value={velocity.length > 0 ? velocity[velocity.length - 1] : 0}
                width={160}
                height={50}
                color="cyan"
              />
            </div>
          </div>

          {/* Insights row */}
          {totalPendingActions > 0 && (
            <div style={{ marginBottom: 32 }}>
              <InsightCard
                type="action"
                title="Client Actions Needed"
                message={`${totalPendingActions} items are waiting for client review or approval. Clearing these will keep projects moving.`}
                actionLabel="View Pending Items"
                onAction={() => router.push('/internal/projects')}
              />
            </div>
          )}

          {/* Main content grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 24,
            }}
          >
            {/* Left column - Projects */}
            <div>
              <h2
                style={{
                  margin: '0 0 16px',
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#FAFAFA',
                }}
              >
                Active Projects
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {projects.map((project) => {
                  const completion = project.total_tasks > 0
                    ? Math.round((project.shipped_tasks / project.total_tasks) * 100)
                    : 0

                  return (
                    <Link
                      key={project.id}
                      href={`/internal/projects/${project.id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <div
                        className="project-card"
                        style={{
                          padding: 20,
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 12,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 20,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                        }}
                      >
                        {/* Progress ring */}
                        <ProgressRing
                          percentage={completion}
                          size="sm"
                          showLabel={false}
                          color={project.status === 'active' ? 'cyan' : 'lime'}
                        />

                        {/* Project info */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 600,
                                color: '#FAFAFA',
                              }}
                            >
                              {project.name}
                            </h3>
                            <StatusPill status={project.status} size="sm" />
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>
                            {project.client_name}
                          </p>
                        </div>

                        {/* Hours comparison */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#00F0FF' }}>
                            {project.total_shift_hours.toFixed(1)}h
                          </div>
                          <div style={{ fontSize: 11, color: '#666' }}>
                            of {project.total_traditional_estimate}h est.
                          </div>
                        </div>

                        {/* Pending badge */}
                        {project.pending_actions > 0 && (
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#FF00AA',
                              color: '#FAFAFA',
                              fontSize: 12,
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 0 12px rgba(255, 0, 170, 0.4)',
                            }}
                          >
                            {project.pending_actions}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* Time savings chart */}
              {totalTraditionalHours > 0 && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 20,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 12,
                  }}
                >
                  <h3
                    style={{
                      margin: '0 0 16px',
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#FAFAFA',
                    }}
                  >
                    SymbAIotic Shift™ Impact
                  </h3>
                  <SpeedGauge
                    shiftHours={totalShiftHours}
                    traditionalHours={totalTraditionalHours}
                    size="lg"
                  />
                </div>
              )}
            </div>

            {/* Right column - Activity & Actions */}
            <div>
              {/* Quick actions */}
              <h2
                style={{
                  margin: '0 0 16px',
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#FAFAFA',
                }}
              >
                Quick Actions
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <ActionCard
                  icon="📋"
                  title="Review"
                  subtitle="Deliverables"
                  badge={totalPendingActions}
                  badgeColor="magenta"
                  href="/internal/projects"
                />
                <ActionCard
                  icon="✅"
                  title="Approve"
                  subtitle="Requirements"
                  badge={0}
                  badgeColor="cyan"
                  href="/internal/requirements"
                />
                <ActionCard
                  icon="💬"
                  title="Feedback"
                  subtitle="New comments"
                  badge={0}
                  badgeColor="orange"
                  href="/internal/projects"
                />
                <ActionCard
                  icon="📄"
                  title="Reports"
                  subtitle="Generate"
                  href="/internal/metrics"
                />
              </div>

              {/* Activity feed */}
              <h2
                style={{
                  margin: '0 0 16px',
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#FAFAFA',
                }}
              >
                Recent Activity
              </h2>
              <div
                style={{
                  padding: 16,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                }}
              >
                {activityItems.length > 0 ? (
                  <ActivityFeed items={activityItems} maxItems={5} compact />
                ) : (
                  <p style={{ color: '#666', fontSize: 13, textAlign: 'center', padding: 20 }}>
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .project-card:hover {
          border-color: rgba(0, 240, 255, 0.5) !important;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.1);
        }
      `}</style>
    </div>
  )
}
