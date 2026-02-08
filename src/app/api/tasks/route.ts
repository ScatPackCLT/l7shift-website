/**
 * /api/tasks - Task Management CRUD API
 *
 * GET  - List tasks with optional filters (project_id, status, priority, assigned_to)
 * POST - Create a new task
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { TaskInsert, TaskStatus, TaskPriority } from '@/lib/database.types'

// Valid enum values for validation
const VALID_STATUSES: TaskStatus[] = ['backlog', 'active', 'review', 'shipped', 'icebox']
const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * GET /api/tasks
 * List all tasks with optional filtering
 *
 * Query params:
 * - project_id: Filter by project ID (required for most use cases)
 * - status: Filter by task status
 * - priority: Filter by priority
 * - assigned_to: Filter by assignee
 * - limit: Number of results (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const project_id = searchParams.get('project_id')
    const status = searchParams.get('status') as TaskStatus | null
    const priority = searchParams.get('priority') as TaskPriority | null
    const assigned_to = searchParams.get('assigned_to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate project_id format if provided
    if (project_id && !UUID_REGEX.test(project_id)) {
      return NextResponse.json(
        { error: 'Invalid project_id format' },
        { status: 400 }
      )
    }

    // Validate status filter if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate priority filter if provided
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 }
      )
    }

    // Build query
    // Note: Using 'as any' until database types are regenerated from Supabase
    let query = (supabase
      .from('tasks') as any)
      .select('*', { count: 'exact' })
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (project_id) {
      query = query.eq('project_id', project_id)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error fetching tasks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: count ? offset + limit < count : false
      }
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/tasks
 * Create a new task
 *
 * Required fields: project_id, title
 * Optional fields: description, status, priority, shift_hours, traditional_hours_estimate, assigned_to, sprint_id, order_index
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    const {
      project_id,
      title,
      description,
      status,
      priority,
      shift_hours,
      traditional_hours_estimate,
      assigned_to,
      sprint_id,
      order_index
    } = body

    if (!project_id || typeof project_id !== 'string') {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(project_id)) {
      return NextResponse.json(
        { error: 'Invalid project_id format' },
        { status: 400 }
      )
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate status if provided
    const taskStatus: TaskStatus = status && VALID_STATUSES.includes(status) ? status : 'backlog'

    // Validate priority if provided
    const taskPriority: TaskPriority = priority && VALID_PRIORITIES.includes(priority) ? priority : 'medium'

    // Validate numeric fields
    if (shift_hours !== undefined && (typeof shift_hours !== 'number' || shift_hours < 0)) {
      return NextResponse.json(
        { error: 'Shift hours must be a positive number' },
        { status: 400 }
      )
    }

    if (traditional_hours_estimate !== undefined && (typeof traditional_hours_estimate !== 'number' || traditional_hours_estimate < 0)) {
      return NextResponse.json(
        { error: 'Traditional hours estimate must be a positive number' },
        { status: 400 }
      )
    }

    // Validate sprint_id format if provided
    if (sprint_id && !UUID_REGEX.test(sprint_id)) {
      return NextResponse.json(
        { error: 'Invalid sprint_id format' },
        { status: 400 }
      )
    }

    // Prepare task data
    const taskData: TaskInsert = {
      project_id,
      title: title.trim(),
      description: description?.trim() || null,
      status: taskStatus,
      priority: taskPriority,
      shift_hours: shift_hours || 0,
      traditional_hours_estimate: traditional_hours_estimate || 0,
      assigned_to: assigned_to?.trim() || null,
      sprint_id: sprint_id || null,
      order_index: order_index || 0
    }

    // Insert task
    // Note: Using 'as any' until database types are regenerated from Supabase
    const { data, error } = await (supabase
      .from('tasks') as any)
      .insert(taskData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating task:', error)

      // Handle foreign key violation (invalid project_id)
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Task created successfully',
        data
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating task:', error)

    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
