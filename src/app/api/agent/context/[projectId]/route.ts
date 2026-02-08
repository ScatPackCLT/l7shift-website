/**
 * GET /api/agent/context/[projectId]
 *
 * Get full project context for an agent starting work.
 * Returns comprehensive information needed to work on project tasks:
 * - Project details and description
 * - Requirements documents
 * - Related tasks (active, backlog, recently completed)
 * - Client preferences and notes
 * - Code paths and file structure hints
 * - Deliverables status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    // Validate project ID format
    if (!UUID_REGEX.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Fetch project details
    const { data: project, error: projectError } = await (supabase
      .from('projects') as any)
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError) {
      if (projectError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error fetching project:', projectError)
      return NextResponse.json(
        { error: 'Failed to fetch project' },
        { status: 500 }
      )
    }

    // Fetch client info if exists
    let client = null
    if (project.client_id) {
      const { data: clientData } = await (supabase
        .from('clients') as any)
        .select('id, name, company, email, status')
        .eq('id', project.client_id)
        .single()
      client = clientData
    }

    // Fetch requirements documents
    const { data: requirements } = await (supabase
      .from('requirements_docs') as any)
      .select('id, title, content, version, status, created_at, updated_at')
      .eq('project_id', projectId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    // Fetch all project tasks grouped by status
    const { data: tasks } = await (supabase
      .from('tasks') as any)
      .select(`
        id,
        title,
        description,
        status,
        priority,
        work_type,
        shift_hours,
        assigned_to,
        agent_id,
        requirements,
        acceptance_criteria,
        files_modified,
        created_at,
        updated_at,
        shipped_at
      `)
      .eq('project_id', projectId)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })

    // Group tasks by status
    const tasksByStatus = {
      available: tasks?.filter((t: any) =>
        !t.agent_id && (t.work_type === 'ai_suitable' || t.status === 'backlog')
      ) || [],
      active: tasks?.filter((t: any) => t.status === 'active') || [],
      review: tasks?.filter((t: any) => t.status === 'review') || [],
      shipped: tasks?.filter((t: any) => t.status === 'shipped').slice(0, 10) || [], // Last 10 shipped
      backlog: tasks?.filter((t: any) => t.status === 'backlog') || [],
      icebox: tasks?.filter((t: any) => t.status === 'icebox') || []
    }

    // Fetch recent deliverables
    const { data: deliverables } = await (supabase
      .from('deliverables') as any)
      .select('id, name, description, type, status, version, uploaded_at, client_approved')
      .eq('project_id', projectId)
      .order('uploaded_at', { ascending: false })
      .limit(20)

    // Fetch current sprint if exists
    const { data: currentSprint } = await (supabase
      .from('sprints') as any)
      .select('*')
      .eq('project_id', projectId)
      .lte('start_date', new Date().toISOString())
      .gte('end_date', new Date().toISOString())
      .single()

    // Gather all files modified across tasks for code path hints
    const allFilesModified = new Set<string>()
    tasks?.forEach((task: any) => {
      if (task.files_modified) {
        task.files_modified.forEach((file: string) => allFilesModified.add(file))
      }
    })

    // Build context response
    const context = {
      project: {
        id: project.id,
        name: project.name,
        client_name: project.client_name,
        description: project.description,
        status: project.status,
        budget_total: project.budget_total,
        budget_used: project.budget_used,
        start_date: project.start_date,
        target_end_date: project.target_end_date
      },
      client: client,
      current_sprint: currentSprint || null,
      requirements: requirements || [],
      tasks: tasksByStatus,
      task_summary: {
        total: tasks?.length || 0,
        available_for_agents: tasksByStatus.available.length,
        active: tasksByStatus.active.length,
        in_review: tasksByStatus.review.length,
        shipped: tasksByStatus.shipped.length,
        backlog: tasksByStatus.backlog.length
      },
      deliverables: {
        recent: deliverables || [],
        pending_approval: deliverables?.filter((d: any) => !d.client_approved) || []
      },
      code_context: {
        files_touched: Array.from(allFilesModified),
        // Common paths extracted from files
        likely_directories: extractDirectories(Array.from(allFilesModified))
      }
    }

    return NextResponse.json({
      success: true,
      data: context
    })
  } catch (error) {
    console.error('Error fetching project context:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Extract unique directory paths from file paths
 */
function extractDirectories(files: string[]): string[] {
  const dirs = new Set<string>()

  files.forEach(file => {
    const parts = file.split('/')
    // Build up directory paths
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'))
    }
  })

  return Array.from(dirs).sort()
}
