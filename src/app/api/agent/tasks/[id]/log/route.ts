/**
 * POST /api/agent/tasks/[id]/log
 *
 * Log work done on a task.
 * Creates a time_entry record with details about work performed.
 *
 * Request body:
 * - agent_id: string (required) - The agent logging work
 * - duration_minutes: number (required) - Time spent in minutes
 * - notes: string (optional) - Description of work done
 * - files_modified: string[] (optional) - List of files changed
 * - commit_hash: string (optional) - Git commit hash if applicable
 * - entry_type: 'work' | 'review' | 'blocked' (optional, default: 'work')
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { TimeEntryType } from '@/lib/database.types'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_ENTRY_TYPES: TimeEntryType[] = ['work', 'review', 'blocked']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params

    // Validate task ID format
    if (!UUID_REGEX.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    const body = await request.json()

    // Validate required fields
    const {
      agent_id,
      duration_minutes,
      notes,
      files_modified,
      commit_hash,
      entry_type = 'work'
    } = body

    if (!agent_id || typeof agent_id !== 'string') {
      return NextResponse.json(
        { error: 'agent_id is required' },
        { status: 400 }
      )
    }

    if (!UUID_REGEX.test(agent_id)) {
      return NextResponse.json(
        { error: 'Invalid agent_id format' },
        { status: 400 }
      )
    }

    if (duration_minutes === undefined || typeof duration_minutes !== 'number' || duration_minutes < 0) {
      return NextResponse.json(
        { error: 'duration_minutes is required and must be a non-negative number' },
        { status: 400 }
      )
    }

    if (!VALID_ENTRY_TYPES.includes(entry_type)) {
      return NextResponse.json(
        { error: `Invalid entry_type. Must be one of: ${VALID_ENTRY_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate files_modified if provided
    if (files_modified !== undefined && !Array.isArray(files_modified)) {
      return NextResponse.json(
        { error: 'files_modified must be an array of strings' },
        { status: 400 }
      )
    }

    // Verify the task exists and is claimed by this agent
    const { data: existingTask, error: fetchError } = await (supabase
      .from('tasks') as any)
      .select('id, agent_id, status, files_modified')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      console.error('Supabase error fetching task:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      )
    }

    // Verify agent owns this task
    if (existingTask.agent_id !== agent_id) {
      return NextResponse.json(
        { error: 'Task is not claimed by this agent' },
        { status: 403 }
      )
    }

    const now = new Date()
    const startedAt = new Date(now.getTime() - duration_minutes * 60 * 1000).toISOString()
    const endedAt = now.toISOString()

    // Create time entry
    const { data: timeEntry, error: insertError } = await (supabase
      .from('time_entries') as any)
      .insert({
        task_id: taskId,
        agent_id,
        entry_type,
        started_at: startedAt,
        ended_at: endedAt,
        duration_minutes,
        notes: notes || null,
        files_modified: files_modified || null,
        commit_hash: commit_hash || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Supabase error creating time entry:', insertError)
      return NextResponse.json(
        { error: 'Failed to create time entry' },
        { status: 500 }
      )
    }

    // Update task with cumulative files_modified
    if (files_modified && files_modified.length > 0) {
      const existingFiles = existingTask.files_modified || []
      const allFiles = Array.from(new Set([...existingFiles, ...files_modified]))

      await (supabase
        .from('tasks') as any)
        .update({
          files_modified: allFiles,
          updated_at: endedAt
        })
        .eq('id', taskId)
    }

    // Update agent heartbeat and add to total hours
    const hoursLogged = duration_minutes / 60
    const { error: agentUpdateError } = await (supabase
      .from('agents') as any)
      .update({
        last_heartbeat: endedAt,
        updated_at: endedAt
      })
      .eq('id', agent_id)

    // Increment total_hours_logged (using RPC would be better, but this works)
    if (!agentUpdateError) {
      const { data: agent } = await (supabase
        .from('agents') as any)
        .select('total_hours_logged')
        .eq('id', agent_id)
        .single()

      if (agent) {
        await (supabase
          .from('agents') as any)
          .update({
            total_hours_logged: (agent.total_hours_logged || 0) + hoursLogged
          })
          .eq('id', agent_id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Work logged successfully',
      data: {
        time_entry: timeEntry,
        duration_minutes,
        hours_logged: hoursLogged
      }
    })
  } catch (error) {
    console.error('Error logging work:', error)

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

/**
 * GET /api/agent/tasks/[id]/log
 *
 * Get all time entries for a task.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params

    // Validate task ID format
    if (!UUID_REGEX.test(taskId)) {
      return NextResponse.json(
        { error: 'Invalid task ID format' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    const { data: timeEntries, error } = await (supabase
      .from('time_entries') as any)
      .select('*')
      .eq('task_id', taskId)
      .order('started_at', { ascending: false })

    if (error) {
      console.error('Supabase error fetching time entries:', error)
      return NextResponse.json(
        { error: 'Failed to fetch time entries' },
        { status: 500 }
      )
    }

    // Calculate totals
    const totalMinutes = timeEntries?.reduce((sum: number, entry: any) =>
      sum + (entry.duration_minutes || 0), 0) || 0

    return NextResponse.json({
      success: true,
      data: {
        entries: timeEntries || [],
        total_minutes: totalMinutes,
        total_hours: totalMinutes / 60
      }
    })
  } catch (error) {
    console.error('Error fetching time entries:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
