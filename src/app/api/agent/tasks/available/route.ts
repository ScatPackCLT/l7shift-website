/**
 * GET /api/agent/tasks/available
 *
 * Returns tasks available for AI agents to claim.
 * Filters for tasks where:
 * - work_type = 'ai_suitable' OR status = 'backlog'
 * - Not already claimed by another agent
 *
 * Includes project context, requirements, and related files.
 *
 * Query params:
 * - project_id: Filter to specific project
 * - priority: Filter by priority (urgent, high, medium, low)
 * - limit: Number of results (default 20, max 50)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { TaskPriority } from '@/lib/database.types'

const VALID_PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low']
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const projectId = searchParams.get('project_id')
    const priority = searchParams.get('priority') as TaskPriority | null
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    // Validate project_id format if provided
    if (projectId && !UUID_REGEX.test(projectId)) {
      return NextResponse.json(
        { error: 'Invalid project_id format' },
        { status: 400 }
      )
    }

    // Validate priority if provided
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Build query for available tasks
    // Tasks are available if:
    // 1. work_type is 'ai_suitable' OR status is 'backlog'
    // 2. agent_id is null (not claimed)
    // 3. status is not 'shipped' or 'icebox'
    let query = (supabase
      .from('tasks') as any)
      .select(`
        id,
        project_id,
        title,
        description,
        status,
        priority,
        work_type,
        shift_hours,
        traditional_hours_estimate,
        requirements,
        acceptance_criteria,
        files_modified,
        created_at,
        updated_at,
        projects:project_id (
          id,
          name,
          client_name,
          description,
          status
        )
      `)
      .is('agent_id', null)
      .not('status', 'in', '("shipped","icebox")')
      .or('work_type.eq.ai_suitable,status.eq.backlog')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit)

    // Apply optional filters
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error fetching available tasks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch available tasks' },
        { status: 500 }
      )
    }

    // Transform data to include project context at top level
    const tasksWithContext = data?.map((task: any) => ({
      id: task.id,
      project_id: task.project_id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      work_type: task.work_type,
      shift_hours: task.shift_hours,
      traditional_hours_estimate: task.traditional_hours_estimate,
      requirements: task.requirements,
      acceptance_criteria: task.acceptance_criteria,
      files_modified: task.files_modified,
      created_at: task.created_at,
      updated_at: task.updated_at,
      project: task.projects
    })) || []

    return NextResponse.json({
      success: true,
      count: tasksWithContext.length,
      data: tasksWithContext
    })
  } catch (error) {
    console.error('Error fetching available tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
