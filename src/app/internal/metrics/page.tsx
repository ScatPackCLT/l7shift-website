'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { VelocitySparkline } from '@/components/dashboard'
import { SpeedGauge } from '@/components/dashboard'

interface MasterStats {
  hoursSaved: number
  multiplier: number
  projectsCompleted: number
  totalShiftHours: number
  totalTraditionalHours: number
}

interface ProjectMetric {
  id: string
  name: string
  shiftHours: number
  traditionalEstimate: number
  tasksShipped: number
  tasksTotal: number
  savings: number
  completion: number
}

export default function MetricsPage() {
  const [stats, setStats] = useState<MasterStats | null>(null)
  const [projects, setProjects] = useState<ProjectMetric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      // Fetch master stats from the single source of truth
      const statsRes = await fetch('/api/metrics/public')
      const masterStats = await statsRes.json()
      setStats(masterStats)

      // Fetch per-project breakdown from Supabase
      if (!supabase) { setLoading(false); return }

      const { data: projectList } = await (supabase as ReturnType<typeof Object>)
        .from('projects')
        .select('id, name, status')
        .in('status', ['active', 'completed'])

      if (projectList) {
        const projectMetrics: ProjectMetric[] = []

        for (const project of projectList) {
          const { data: tasks } = await (supabase as ReturnType<typeof Object>)
            .from('tasks')
            .select('shift_hours, traditional_hours_estimate, status')
            .eq('project_id', project.id)

          const taskList = tasks || []
          const shiftHours = taskList.reduce((s: number, t: { shift_hours: number | null }) => s + (t.shift_hours || 0), 0)
          const traditionalEstimate = taskList.reduce((s: number, t: { traditional_hours_estimate: number | null }) => s + (t.traditional_hours_estimate || 0), 0)
          const tasksShipped = taskList.filter((t: { status: string }) => t.status === 'shipped').length
          const tasksTotal = taskList.length
          const savings = traditionalEstimate > 0
            ? Math.round(((traditionalEstimate - shiftHours) / traditionalEstimate) * 100)
            : 0
          const completion = tasksTotal > 0
            ? Math.round((tasksShipped / tasksTotal) * 100)
            : 0

          projectMetrics.push({
            id: project.id,
            name: project.name,
            shiftHours: Math.round(shiftHours * 10) / 10,
            traditionalEstimate: Math.round(traditionalEstimate),
            tasksShipped,
            tasksTotal,
            savings,
            completion,
          })
        }

        setProjects(projectMetrics)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const savingsPercentage = stats && stats.totalTraditionalHours > 0
    ? Math.round(((stats.totalTraditionalHours - stats.totalShiftHours) / stats.totalTraditionalHours) * 100)
    : 0

  const businessDaysSaved = stats ? Math.round(stats.hoursSaved / 8) : 0

  if (loading) {
    return (
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '60px 0', textAlign: 'center' }}>
        <div style={{ color: '#888', fontSize: 14 }}>Loading metrics...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          margin: 0, fontSize: 28, fontWeight: 700, color: '#FAFAFA',
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        }}>
          Metrics
        </h1>
        <p style={{ margin: '8px 0 0', color: '#888', fontSize: 14 }}>
          The SymbAIotic Shift™ performance analytics — real-time data
        </p>
      </div>

      {/* Hero Stats - from master source */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        <div style={{
          padding: 24,
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(255, 0, 170, 0.1))',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Shift Hours
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#00F0FF' }}>
            {stats?.totalShiftHours || 0}h
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            vs {stats?.totalTraditionalHours || 0}h traditional
          </div>
        </div>

        <div style={{
          padding: 24,
          background: 'rgba(191, 255, 0, 0.05)',
          border: '1px solid rgba(191, 255, 0, 0.2)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Time Savings
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#BFFF00' }}>
            {savingsPercentage}%
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {stats?.multiplier || 1}x faster than traditional
          </div>
        </div>

        <div style={{
          padding: 24,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Hours Saved
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#FAFAFA' }}>
            {stats?.hoursSaved.toLocaleString() || 0}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            = {businessDaysSaved} business days
          </div>
        </div>

        <div style={{
          padding: 24,
          background: 'rgba(255, 0, 170, 0.05)',
          border: '1px solid rgba(255, 0, 170, 0.2)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Projects
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#FF00AA' }}>
            {stats?.projectsCompleted || 0}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            delivering results
          </div>
        </div>
      </div>

      {/* Speed Gauge */}
      <div style={{
        padding: 32,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        marginBottom: 32,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <SpeedGauge
          shiftHours={stats?.totalShiftHours || 0}
          traditionalHours={stats?.totalTraditionalHours || 0}
          size="lg"
        />
      </div>

      {/* Project Breakdown */}
      <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 600, color: '#FAFAFA' }}>
        Project Breakdown
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {projects.map((project) => (
          <div key={project.id} style={{
            padding: 24,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#FAFAFA' }}>
              {project.name}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>SHIFT HOURS</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#00F0FF' }}>{project.shiftHours}h</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>TRADITIONAL EST.</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FF6B6B' }}>{project.traditionalEstimate}h</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>SAVINGS</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#BFFF00' }}>{project.savings}%</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>COMPLETION</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FAFAFA' }}>{project.completion}%</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: '#666' }}>Tasks Progress</span>
                <span style={{ fontSize: 11, color: '#888' }}>{project.tasksShipped}/{project.tasksTotal}</span>
              </div>
              <div style={{
                height: 6, background: 'rgba(255, 255, 255, 0.1)', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${project.completion}%`,
                  background: 'linear-gradient(90deg, #00F0FF, #BFFF00)',
                  borderRadius: 3, transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>
        ))}

        {projects.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 16, color: '#888',
          }}>
            No projects with task data yet
          </div>
        )}
      </div>

      {/* Master Impact Summary */}
      <div style={{
        marginTop: 32, padding: 32,
        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(255, 0, 170, 0.05))',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: 16, textAlign: 'center',
      }}>
        <h3 style={{
          margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#888',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>
          The SymbAIotic Shift™ Impact
        </h3>
        <div style={{ fontSize: 48, fontWeight: 700, color: '#FAFAFA', marginBottom: 8 }}>
          {stats?.hoursSaved.toLocaleString() || 0}
          <span style={{ fontSize: 24, color: '#888' }}> hours saved</span>
        </div>
        <p style={{ margin: 0, fontSize: 14, color: '#888' }}>
          That&apos;s <span style={{ color: '#BFFF00', fontWeight: 600 }}>{businessDaysSaved} business days</span> of
          development time delivered through human-AI collaboration
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: '#555' }}>
          Source: /api/metrics/public — master data, consistent across all pages
        </p>
      </div>
    </div>
  )
}
