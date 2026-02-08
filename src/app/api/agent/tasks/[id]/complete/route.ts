/**
 * POST /api/agent/tasks/[id]/complete
 *
 * Mark a task as complete (ready for human review).
 * - Sets status to 'review' (not 'shipped' - needs human review)
 * - Logs completion time entry
 * - Clears agent's current_task_id
 * - Increments agent's total_tasks_completed
 *
 * Request body:
 * - agent_id: string (required) - The completing agent's ID
 * - notes: string (optional) - Completion notes/summary
 * - files_modified: string[] (optional) - Final list of files changed
 * - commit_hash: string (optional) - Final commit hash
 * - pull_request_url: string (optional) - PR URL if applicable
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
      notes,
      files_modified,
      commit_hash,
      pull_request_url
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

    // Verify the task exists and is claimed by this agent
    const { data: existingTask, error: fetchError } = await (supabase
      .from('tasks') as any)
      .select('id, agent_id, status, agent_claimed_at, files_modified, project_id, title')
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

    // Check task status
    if (existingTask.status === 'shipped') {
      return NextResponse.json(
        { error: 'Task is already shipped' },
        { status: 400 }
      )
    }

    if (existingTask.status === 'review') {
      return NextResponse.json(
        { error: 'Task is already in review' },
        { status: 400 }
      )
    }

    const completedAt = new Date().toISOString()

    // Merge files_modified
    const existingFiles = existingTask.files_modified || []
    const newFiles = files_modified || []
    const allFiles = Array.from(new Set([...existingFiles, ...newFiles]))

    // Build completion metadata
    const completionMetadata = {
      completed_by_agent: agent_id,
      completion_notes: notes || null,
      commit_hash: commit_hash || null,
      pull_request_url: pull_request_url || null,
      claimed_at: existingTask.agent_claimed_at,
      completed_at: completedAt
    }

    // Update task to review status
    const { data: updatedTask, error: updateError } = await (supabase
      .from('tasks') as any)
      .update({
        status: 'review',
        files_modified: allFiles,
        agent_notes: notes ? `${existingTask.agent_notes || ''}\n\nCompletion: ${notes}`.trim() : existingTask.agent_notes,
        updated_at: completedAt
      })
      .eq('id', taskId)
      .eq('agent_id', agent_id) // Safety check
      .select()
      .single()

    if (updateError) {
      console.error('Supabase error completing task:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete task' },
        { status: 500 }
      )
    }

    // Create completion time entry
    const { data: timeEntry, error: timeEntryError } = await (supabase
      .from('time_entries') as any)
      .insert({
        task_id: taskId,
        agent_id,
        entry_type: 'work',
        started_at: completedAt,
        ended_at: completedAt,
        duration_minutes: 0,
        notes: `Task completed: ${notes || 'No notes provided'}`,
        files_modified: newFiles.length > 0 ? newFiles : null,
        commit_hash: commit_hash || null,
        metadata: completionMetadata
      })
      .select()
      .single()

    if (timeEntryError) {
      console.error('Warning: Failed to create completion time entry:', timeEntryError)
    }

    // Calculate total time spent on task
    const { data: allTimeEntries } = await (supabase
      .from('time_entries') as any)
      .select('duration_minutes')
      .eq('task_id', taskId)

    const totalMinutes = allTimeEntries?.reduce((sum: number, entry: any) =>
      sum + (entry.duration_minutes || 0), 0) || 0

    // Update agent: clear current task, increment completed count
    const { data: agent } = await (supabase
      .from('agents') as any)
      .select('total_tasks_completed')
      .eq('id', agent_id)
      .single()

    if (agent) {
      await (supabase
        .from('agents') as any)
        .update({
          current_task_id: null,
          status: 'idle',
          total_tasks_completed: (agent.total_tasks_completed || 0) + 1,
          last_heartbeat: completedAt,
          updated_at: completedAt
        })
        .eq('id', agent_id)
    }

    return NextResponse.json({
      success: true,
      message: 'Task completed and sent to review',
      data: {
        task: updatedTask,
        completion_time_entry_id: timeEntry?.id || null,
        total_time_minutes: totalMinutes,
        total_time_hours: totalMinutes / 60,
        files_modified: allFiles,
        completion_metadata: completionMetadata
      }
    })
  } catch (error) {
    console.error('Error completing task:', error)

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
